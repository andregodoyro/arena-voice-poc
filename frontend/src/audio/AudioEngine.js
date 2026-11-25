/**
 * ==============================================================================
 * ARENA VOICE — AUDIO ENGINE SINGLETON (WEB AUDIO API)
 * ==============================================================================
 *
 * Milestone 5A, 5B & 5D.2: Live Show Experience & Configurable Audio Architecture
 *
 * Responsabilidades:
 * - Gerenciamento do ciclo de vida do AudioContext nativo do navegador;
 * - Resolução de políticas de Autoplay (Unlock sob gesto do usuário);
 * - Barramento de ganho hierárquico de 4 canais (Master, SFX, Ambient e Music)
 *   com nós dedicados de ducking suave e anti-popping;
 * - Persistência segura das preferências do mixer no localStorage;
 * - API centralizada `playEvent(eventKey)` e `playBuffer(key, options)` integrada
 *   ao `soundCatalog.js` e `soundMap.js`;
 * - Cache de AudioBuffer com deduplicação de downloads e tratamento de falhas;
 * - Controle de cooldown, prioridade, limite de simultaneidade e crossfade de loops;
 * - Preservação integral do `SoundSynthesizer` procedural como fallback automático.
 */

import SoundSynthesizer from './SoundSynthesizer.js';
import { AUDIO_BUSES, SOUND_CATALOG } from './soundCatalog.js';
import { SOUND_PRIORITIES, resolveEventAssets } from './soundMap.js';

const MIXER_STORAGE_KEY = 'arena_audio_mixer_v1';

const DEFAULT_MIXER_PREFS = Object.freeze({
  masterVolume: 0.8,
  sfxVolume: 1.0,
  ambientVolume: 0.7,
  musicVolume: 0.5,
  isMuted: false,
});

function clampVolume(value, fallback) {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(0, Math.min(1, num));
}

export class AudioEngine {
  constructor(options = {}) {
    this.ctx = null;
    this.masterGainNode = null;
    this.sfxGainNode = null;
    this.ambientGainNode = null;
    this.musicGainNode = null;

    // Nós intermediários exclusivos para ducking (não sobrescrevem volume do usuário)
    this.ambientDuckGainNode = null;
    this.musicDuckGainNode = null;

    this.isUnlocked = false;
    this.maxConcurrentVoices = options.maxConcurrentVoices ?? 8;

    const prefs = this._loadPreferences();
    this.masterVolume = prefs.masterVolume;
    this.sfxVolume = prefs.sfxVolume;
    this.ambientVolume = prefs.ambientVolume;
    this.musicVolume = prefs.musicVolume;
    this.isMuted = prefs.isMuted;

    this.buffers = new Map();
    this.loadingPromises = new Map();
    this.failedAssets = new Set();

    // Controle de vozes ativas, loops por barramento e cooldowns
    this.activeSources = new Map();
    this.activeVoices = new Map(); // voiceId -> { source, gainNode, bus, priority, key, stop }
    this.activeLoops = new Map();  // bus ('music' | 'ambient') -> { key, source, gainNode }
    this.lastPlayedAt = new Map(); // cooldownKey -> timestamp ms

    // Controle de ducking concorrente
    this._duckTokens = new Set();
    this._duckRestoreTimer = null;

    this.listeners = new Set();
  }

  _getStorage() {
    try {
      return typeof globalThis !== 'undefined' && globalThis.localStorage ? globalThis.localStorage : null;
    } catch {
      return null;
    }
  }

  _loadPreferences() {
    const storage = this._getStorage();
    if (!storage) return { ...DEFAULT_MIXER_PREFS };

    try {
      const raw = storage.getItem(MIXER_STORAGE_KEY);
      if (!raw) return { ...DEFAULT_MIXER_PREFS };
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_MIXER_PREFS };

      return {
        masterVolume: clampVolume(parsed.masterVolume, DEFAULT_MIXER_PREFS.masterVolume),
        sfxVolume: clampVolume(parsed.sfxVolume, DEFAULT_MIXER_PREFS.sfxVolume),
        ambientVolume: clampVolume(parsed.ambientVolume, DEFAULT_MIXER_PREFS.ambientVolume),
        musicVolume: clampVolume(parsed.musicVolume, DEFAULT_MIXER_PREFS.musicVolume),
        isMuted: typeof parsed.isMuted === 'boolean' ? parsed.isMuted : DEFAULT_MIXER_PREFS.isMuted,
      };
    } catch {
      return { ...DEFAULT_MIXER_PREFS };
    }
  }

  _savePreferences() {
    const storage = this._getStorage();
    if (!storage) return;

    try {
      const payload = {
        masterVolume: this.masterVolume,
        sfxVolume: this.sfxVolume,
        ambientVolume: this.ambientVolume,
        musicVolume: this.musicVolume,
        isMuted: this.isMuted,
      };
      storage.setItem(MIXER_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Erros de localStorage (quota/privacidade) nunca devem impedir o áudio
    }
  }

  /**
   * Inicializa o grafo de nós de áudio se ainda não inicializado.
   * Cria 4 buses: Master, SFX, Ambient e Music (+ nós intermediários de ducking).
   */
  init() {
    if (this.ctx) return;

    const AudioContextClass =
      (typeof globalThis !== 'undefined' && (globalThis.AudioContext || globalThis.webkitAudioContext)) || null;
    if (!AudioContextClass) {
      console.warn('[AudioEngine] Web Audio API não suportada neste navegador.');
      return;
    }

    this.ctx = new AudioContextClass({
      latencyHint: 'interactive',
    });

    const now = this.ctx.currentTime ?? 0;

    // 1. Nó de Ganho Master
    this.masterGainNode = this.ctx.createGain();
    this.masterGainNode.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, now);
    this.masterGainNode.connect(this.ctx.destination);

    // 2. Barramento SFX -> Master
    this.sfxGainNode = this.ctx.createGain();
    this.sfxGainNode.gain.setValueAtTime(this.sfxVolume, now);
    this.sfxGainNode.connect(this.masterGainNode);

    // 3. Barramento Ambient -> AmbientDuck -> Master
    this.ambientDuckGainNode = this.ctx.createGain();
    this.ambientDuckGainNode.gain.setValueAtTime(1.0, now);
    this.ambientDuckGainNode.connect(this.masterGainNode);

    this.ambientGainNode = this.ctx.createGain();
    this.ambientGainNode.gain.setValueAtTime(this.ambientVolume, now);
    this.ambientGainNode.connect(this.ambientDuckGainNode);

    // 4. Barramento Music -> MusicDuck -> Master
    this.musicDuckGainNode = this.ctx.createGain();
    this.musicDuckGainNode.gain.setValueAtTime(1.0, now);
    this.musicDuckGainNode.connect(this.masterGainNode);

    this.musicGainNode = this.ctx.createGain();
    this.musicGainNode.gain.setValueAtTime(this.musicVolume, now);
    this.musicGainNode.connect(this.musicDuckGainNode);

    if (this.ctx.state === 'running') {
      this.isUnlocked = true;
    }
  }

  _getBusNode(bus) {
    if (bus === AUDIO_BUSES.MUSIC) return this.musicGainNode || this.ambientGainNode || this.sfxGainNode;
    if (bus === AUDIO_BUSES.AMBIENT) return this.ambientGainNode || this.sfxGainNode;
    return this.sfxGainNode;
  }

  /**
   * Desbloqueia o AudioContext sob gesto do usuário (conformidade com Autoplay policy).
   */
  async unlock() {
    this.init();
    if (!this.ctx) return false;

    if (this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch (err) {
        console.warn('[AudioEngine] Erro ao retomar AudioContext:', err);
      }
    }

    if (this.ctx.state === 'running' && !this.isUnlocked) {
      this.isUnlocked = true;
      this.playUnlockChime();
      this.notifyListeners();
    }

    return this.isUnlocked;
  }

  _applyGainSmooth(gainNode, targetValue, timeConstant = 0.03) {
    if (!this.ctx || !gainNode) return;
    const now = this.ctx.currentTime ?? 0;
    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setTargetAtTime(targetValue, now, timeConstant);
  }

  /**
   * Ajusta o volume Master de forma suave (rampa anti-popping).
   */
  setMasterVolume(volume) {
    const clamped = clampVolume(volume, this.masterVolume);
    this.masterVolume = clamped;
    if (!this.isMuted) {
      this._applyGainSmooth(this.masterGainNode, clamped, 0.03);
    }
    this._savePreferences();
    this.notifyListeners();
  }

  setSfxVolume(volume) {
    const clamped = clampVolume(volume, this.sfxVolume);
    this.sfxVolume = clamped;
    this._applyGainSmooth(this.sfxGainNode, clamped, 0.03);
    this._savePreferences();
    this.notifyListeners();
  }

  setAmbientVolume(volume) {
    const clamped = clampVolume(volume, this.ambientVolume);
    this.ambientVolume = clamped;
    this._applyGainSmooth(this.ambientGainNode, clamped, 0.03);
    this._savePreferences();
    this.notifyListeners();
  }

  setMusicVolume(volume) {
    const clamped = clampVolume(volume, this.musicVolume);
    this.musicVolume = clamped;
    this._applyGainSmooth(this.musicGainNode, clamped, 0.03);
    this._savePreferences();
    this.notifyListeners();
  }

  setBusVolume(bus, volume) {
    if (bus === AUDIO_BUSES.SFX) return this.setSfxVolume(volume);
    if (bus === AUDIO_BUSES.AMBIENT) return this.setAmbientVolume(volume);
    if (bus === AUDIO_BUSES.MUSIC) return this.setMusicVolume(volume);
    if (bus === 'master') return this.setMasterVolume(volume);
  }

  /**
   * Alterna ou define o estado de Mute geral (Pânico / Mesa Técnica).
   */
  setMute(forceMute) {
    this.isMuted = typeof forceMute === 'boolean' ? forceMute : !this.isMuted;
    this._applyGainSmooth(this.masterGainNode, this.isMuted ? 0 : this.masterVolume, 0.02);
    this._savePreferences();
    this.notifyListeners();
  }

  /**
   * Carrega e decodifica um AudioBuffer com cache em RAM e deduplicação de requests em voo.
   */
  async loadBuffer(name, url) {
    if (!name || !url) return null;
    if (this.buffers.has(name)) return this.buffers.get(name);
    if (this.failedAssets.has(name)) return null;
    if (this.loadingPromises.has(name)) return this.loadingPromises.get(name);

    this.init();
    if (!this.ctx) return null;

    const loadTask = (async () => {
      try {
        const fetchFn = typeof globalThis !== 'undefined' ? globalThis.fetch : null;
        if (!fetchFn) throw new Error('fetch indisponível');

        const response = await fetchFn(url);
        if (!response || !response.ok) {
          throw new Error(`HTTP ${response?.status ?? 'error'} ao buscar ${url}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const decoded = await this.ctx.decodeAudioData(arrayBuffer);
        this.buffers.set(name, decoded);
        return decoded;
      } catch (err) {
        this.failedAssets.add(name);
        console.warn(`[AudioEngine] Asset indisponível '${name}' (${url}): ${err?.message || err}`);
        return null;
      } finally {
        this.loadingPromises.delete(name);
      }
    })();

    this.loadingPromises.set(name, loadTask);
    return loadTask;
  }

  /**
   * Aciona ducking suave nos barramentos music e ambient com restauração coordenada por tokens.
   */
  triggerDucking({ durationMs = 2200, musicFactor = 0.25, ambientFactor = 0.45 } = {}) {
    if (!this.ctx || !this.musicDuckGainNode || !this.ambientDuckGainNode) return null;

    const token = Symbol('duck');
    this._duckTokens.add(token);

    this._applyGainSmooth(this.musicDuckGainNode, clampVolume(musicFactor, 0.25), 0.08);
    this._applyGainSmooth(this.ambientDuckGainNode, clampVolume(ambientFactor, 0.45), 0.08);

    if (this._duckRestoreTimer) {
      clearTimeout(this._duckRestoreTimer);
    }

    const release = () => {
      this._duckTokens.delete(token);
      if (this._duckTokens.size === 0) {
        this._applyGainSmooth(this.musicDuckGainNode, 1.0, 0.25);
        this._applyGainSmooth(this.ambientDuckGainNode, 1.0, 0.25);
      }
    };

    this._duckRestoreTimer = setTimeout(release, Math.max(200, durationMs));
    return release;
  }

  _canPassCooldown(cooldownKey, cooldownMs) {
    if (!cooldownMs || cooldownMs <= 0) return true;
    const now = Date.now();
    const last = this.lastPlayedAt.get(cooldownKey) ?? 0;
    if (now - last < cooldownMs) return false;
    this.lastPlayedAt.set(cooldownKey, now);
    return true;
  }

  _enforceConcurrencyLimit(priority, maxConcurrent) {
    const cap = Math.max(1, maxConcurrent || this.maxConcurrentVoices);
    if (this.activeVoices.size < cap) return true;

    // Procura a voz ativa de menor prioridade (evitando derrubar loops CRITICAL se o novo for menor)
    let lowestVoice = null;
    for (const voice of this.activeVoices.values()) {
      if (!lowestVoice || voice.priority < lowestVoice.priority) {
        lowestVoice = voice;
      }
    }

    if (lowestVoice && priority >= lowestVoice.priority) {
      lowestVoice.stop();
      return true;
    }

    return false;
  }

  _invokeFallbackSynth(fallbackMethod, options = {}) {
    if (!fallbackMethod || typeof this[fallbackMethod] !== 'function') {
      return false;
    }
    try {
      if (fallbackMethod === 'playTimerTicker') {
        this.playTimerTicker(Boolean(options.isCritical));
      } else {
        this[fallbackMethod]();
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Para um loop ativo em um barramento específico com fade-out suave (crossfade).
   */
  stopLoop(bus, fadeOutMs = 500) {
    const current = this.activeLoops.get(bus);
    if (!current) return;

    this.activeLoops.delete(bus);
    const { source, gainNode, voiceId } = current;
    this.activeVoices.delete(voiceId);
    this.activeSources.delete(voiceId);

    try {
      if (this.ctx && gainNode && fadeOutMs > 0) {
        const now = this.ctx.currentTime ?? 0;
        const fadeSec = fadeOutMs / 1000;
        gainNode.gain.cancelScheduledValues(now);
        gainNode.gain.setValueAtTime(gainNode.gain.value ?? 0.3, now);
        gainNode.gain.linearRampToValueAtTime(0.0001, now + fadeSec);
        setTimeout(() => {
          try { source.stop(); } catch { /* já parado */ }
        }, fadeOutMs + 40);
      } else {
        source.stop();
      }
    } catch {
      // Fonte já encerrada
    }
  }

  /**
   * API central para reprodução de buffers com suporte a bus, offset, duração,
   * jitter de pitch, cooldown, prioridade, limite de simultaneidade, crossfade e ducking.
   */
  playBuffer(key, options = {}) {
    if (!this.isUnlocked || !this.ctx || this.isMuted) return null;

    const catalogEntry = SOUND_CATALOG[key] ?? null;
    const {
      url = catalogEntry?.url ?? null,
      bus = catalogEntry?.bus ?? AUDIO_BUSES.SFX,
      volume = catalogEntry?.defaultVolume ?? 1.0,
      loop = catalogEntry?.isLoop ?? false,
      offset = catalogEntry?.offsetSeconds ?? 0,
      duration = catalogEntry?.clipDurationSeconds ?? null,
      playbackRate = 1.0,
      pitchJitter = 0,
      cooldownMs = 0,
      cooldownKey = key,
      priority = SOUND_PRIORITIES.MEDIUM,
      maxConcurrent = this.maxConcurrentVoices,
      duckMusic = false,
      duckDurationMs = 2200,
      crossfadeMs = 600,
      fallbackSynth = null,
      isCritical = false,
    } = options;

    if (!this._canPassCooldown(cooldownKey, cooldownMs)) {
      return null;
    }

    const buffer = this.buffers.get(key);
    if (!buffer) {
      // Dispara carregamento assíncrono em background se houver URL válida e não falhou antes
      if (url && !this.failedAssets.has(key)) {
        void this.loadBuffer(key, url);
      }
      // Contingência imediata via sintetizador procedural (latência zero)
      this._invokeFallbackSynth(fallbackSynth, { isCritical });
      return null;
    }

    // Se for loop no barramento music ou ambient, aplica crossfade substituindo o anterior
    if (loop && (bus === AUDIO_BUSES.MUSIC || bus === AUDIO_BUSES.AMBIENT)) {
      const existingLoop = this.activeLoops.get(bus);
      if (existingLoop && existingLoop.key === key) {
        return existingLoop.source;
      }
      this.stopLoop(bus, crossfadeMs);
    }

    if (!this._enforceConcurrencyLimit(priority, maxConcurrent)) {
      return null;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = Boolean(loop);

    const jitterOffset = pitchJitter > 0 ? (Math.random() * 2 - 1) * pitchJitter : 0;
    const effectiveRate = Math.max(0.25, playbackRate + jitterOffset);
    source.playbackRate.setValueAtTime(effectiveRate, this.ctx.currentTime ?? 0);

    const gainNode = this.ctx.createGain();
    const targetVolume = clampVolume(volume, 1.0);
    const now = this.ctx.currentTime ?? 0;

    if (loop && crossfadeMs > 0) {
      gainNode.gain.setValueAtTime(0.0001, now);
      gainNode.gain.linearRampToValueAtTime(Math.max(0.0001, targetVolume), now + crossfadeMs / 1000);
    } else {
      gainNode.gain.setValueAtTime(targetVolume, now);
    }

    source.connect(gainNode);
    gainNode.connect(this._getBusNode(bus));

    const voiceId = `${key}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const cleanup = () => {
      this.activeSources.delete(voiceId);
      this.activeVoices.delete(voiceId);
      const activeLoop = this.activeLoops.get(bus);
      if (activeLoop && activeLoop.voiceId === voiceId) {
        this.activeLoops.delete(bus);
      }
    };

    const stopVoice = () => {
      cleanup();
      try { source.stop(); } catch { /* já parado */ }
    };

    this.activeSources.set(voiceId, source);
    this.activeVoices.set(voiceId, { source, gainNode, bus, priority, key, stop: stopVoice });

    if (loop && (bus === AUDIO_BUSES.MUSIC || bus === AUDIO_BUSES.AMBIENT)) {
      this.activeLoops.set(bus, { key, source, gainNode, voiceId });
    }

    source.onended = cleanup;

    const safeOffset = Math.max(0, offset || 0);
    if (!loop && typeof duration === 'number' && duration > 0) {
      source.start(0, safeOffset, duration);
    } else if (safeOffset > 0) {
      source.start(0, safeOffset);
    } else {
      source.start(0);
    }

    if (duckMusic) {
      this.triggerDucking({
        durationMs: duckDurationMs,
        musicFactor: priority >= SOUND_PRIORITIES.CRITICAL ? 0.2 : 0.45,
        ambientFactor: priority >= SOUND_PRIORITIES.CRITICAL ? 0.4 : 0.65,
      });
    }

    return source;
  }

  /**
   * Reproduz um evento mapeado no SOUND_MAP (com suporte a camada secundária e fallback procedural).
   */
  playEvent(eventKey, overrides = {}) {
    if (!this.isUnlocked || !this.ctx || this.isMuted) return null;

    const resolved = resolveEventAssets(eventKey);
    if (!resolved) return null;

    const { mapping, primary, secondary } = resolved;

    // Se o evento ainda não possui asset externo (ex: countdown_tick), vai direto ao fallback
    if (!primary) {
      if (!this._canPassCooldown(`event:${eventKey}`, overrides.cooldownMs ?? mapping.cooldownMs)) {
        return null;
      }
      this._invokeFallbackSynth(mapping.fallbackSynth, overrides);
      return null;
    }

    const primarySource = this.playBuffer(primary.id, {
      url: primary.url,
      bus: overrides.bus ?? mapping.bus ?? primary.bus,
      volume: overrides.volume ?? mapping.volume ?? primary.defaultVolume,
      loop: overrides.loop ?? mapping.isLoop,
      offset: overrides.offset ?? primary.offsetSeconds,
      duration: overrides.duration ?? primary.clipDurationSeconds,
      pitchJitter: overrides.pitchJitter ?? (mapping.bus === AUDIO_BUSES.SFX && !mapping.isLoop ? 0.03 : 0),
      cooldownMs: overrides.cooldownMs ?? mapping.cooldownMs,
      cooldownKey: `event:${eventKey}:${primary.id}`,
      priority: overrides.priority ?? mapping.priority,
      duckMusic: overrides.duckMusic ?? mapping.duckMusic,
      fallbackSynth: mapping.fallbackSynth,
      isCritical: overrides.isCritical,
    });

    if (secondary) {
      this.playBuffer(secondary.id, {
        url: secondary.url,
        bus: secondary.bus,
        volume: Math.min(1, (overrides.volume ?? mapping.volume ?? 0.7) * 0.8),
        loop: false,
        offset: secondary.offsetSeconds,
        duration: secondary.clipDurationSeconds,
        cooldownMs: overrides.cooldownMs ?? mapping.cooldownMs,
        cooldownKey: `event:${eventKey}:${secondary.id}`,
        priority: mapping.priority,
        duckMusic: false,
      });
    }

    return primarySource;
  }

  /**
   * Wrapper retrocompatível para reprodução de buffer.
   */
  playSfx(name, { volume = 1.0, playbackRate = 1.0, loop = false, bus = 'sfx' } = {}) {
    if (!this.isUnlocked || !this.ctx || this.isMuted) return null;

    const buffer = this.buffers.get(name);
    if (!buffer) {
      this.playProceduralTone(440, 'triangle', 0.15, 0.2);
      return null;
    }

    return this.playBuffer(name, { volume, playbackRate, loop, bus });
  }

  /**
   * Sintetizador procedural embutido: gera um tom harmônico sem necessidade de arquivos externos.
   */
  playProceduralTone(freq = 440, type = 'sine', duration = 0.2, gain = 0.25) {
    if (!this.isUnlocked || !this.ctx || this.isMuted) return;

    try {
      const osc = this.ctx.createOscillator();
      const env = this.ctx.createGain();
      const now = this.ctx.currentTime ?? 0;

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);

      env.gain.setValueAtTime(0.001, now);
      env.gain.linearRampToValueAtTime(gain, now + 0.015);
      env.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(env);
      env.connect(this.sfxGainNode);

      osc.start(now);
      osc.stop(now + duration + 0.05);
    } catch {
      // Falha silenciosa para evitar quebras em transições de página
    }
  }

  playUnlockChime() {
    if (!this.ctx) return;
    this.playProceduralTone(523.25, 'sine', 0.22, 0.15);
    setTimeout(() => {
      this.playProceduralTone(659.25, 'sine', 0.35, 0.18);
    }, 120);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // DISPATCHERS DE EVENTOS DA ARENA (MILESTONE 5B — PROCEDURAIS OFFLINE-FIRST)
  // ══════════════════════════════════════════════════════════════════════════

  playWhoosh() {
    if (!this.isUnlocked || !this.ctx || this.isMuted) return;
    SoundSynthesizer.synthesizeWhoosh(this.ctx, this.sfxGainNode);
  }

  playVotingOpen() {
    if (!this.isUnlocked || !this.ctx || this.isMuted) return;
    SoundSynthesizer.synthesizeVotingOpen(this.ctx, this.sfxGainNode);
  }

  playTimerTicker(isCritical = false) {
    if (!this.isUnlocked || !this.ctx || this.isMuted) return;
    SoundSynthesizer.synthesizeTimerTicker(this.ctx, this.sfxGainNode, isCritical);
  }

  playVotingClosed() {
    if (!this.isUnlocked || !this.ctx || this.isMuted) return;
    SoundSynthesizer.synthesizeVotingClosed(this.ctx, this.sfxGainNode);
  }

  playCelebration() {
    if (!this.isUnlocked || !this.ctx || this.isMuted) return;
    SoundSynthesizer.synthesizeCelebration(this.ctx, this.sfxGainNode);
  }

  playReset() {
    if (!this.isUnlocked || !this.ctx || this.isMuted) return;
    SoundSynthesizer.synthesizeReset(this.ctx, this.sfxGainNode);
  }

  getState() {
    return {
      isUnlocked: this.isUnlocked,
      isMuted: this.isMuted,
      masterVolume: this.masterVolume,
      sfxVolume: this.sfxVolume,
      ambientVolume: this.ambientVolume,
      musicVolume: this.musicVolume,
      ctxState: this.ctx?.state || 'uninitialized',
      bufferedSoundsCount: this.buffers.size,
      activeVoicesCount: this.activeVoices.size,
    };
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notifyListeners() {
    const state = this.getState();
    for (const listener of this.listeners) {
      try {
        listener(state);
      } catch (err) {
        console.error('[AudioEngine] Erro no listener:', err);
      }
    }
  }
}

export const audioEngine = new AudioEngine();
export default audioEngine;
