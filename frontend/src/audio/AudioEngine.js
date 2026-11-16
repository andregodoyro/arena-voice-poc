/**
 * ==============================================================================
 * ARENA VOICE — AUDIO ENGINE SINGLETON (WEB AUDIO API)
 * ==============================================================================
 * 
 * Milestone 5A: Audio Engine Infrastructure & Visual Rendering Foundation
 * Conforme Decisão Arquitetural ADR-026.
 * 
 * Responsabilidades:
 * - Gerenciamento do ciclo de vida do AudioContext nativo do navegador;
 * - Resolução de políticas de Autoplay (Unlock sob gesto do usuário);
 * - Barramento de ganho hierárquico (SFX, Ambiente e Master com anti-popping);
 * - Preloading e cache de buffers de áudio decodificados em RAM;
 * - Sintetizador procedural integrado (osciladores) para feedbacks acústicos imediatos;
 * - Padrão Observer para sincronização reativa de estado com componentes React.
 */

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGainNode = null;
    this.sfxGainNode = null;
    this.ambientGainNode = null;

    this.isUnlocked = false;
    this.isMuted = false;
    this.masterVolume = 0.8;
    this.sfxVolume = 1.0;
    this.ambientVolume = 0.7;

    this.buffers = new Map();
    this.activeSources = new Map();
    this.listeners = new Set();
  }

  /**
   * Inicializa o grafo de nós de áudio se ainda não inicializado.
   * Cria os nós de ganho master, sfx e ambient conectados ao destination.
   */
  init() {
    if (this.ctx) return;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      console.warn('[AudioEngine] Web Audio API não suportada neste navegador.');
      return;
    }

    this.ctx = new AudioContextClass({
      latencyHint: 'interactive',
    });

    // 1. Nó de Ganho Master
    this.masterGainNode = this.ctx.createGain();
    this.masterGainNode.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);
    this.masterGainNode.connect(this.ctx.destination);

    // 2. Barramento de Efeitos Sonoros (SFX)
    this.sfxGainNode = this.ctx.createGain();
    this.sfxGainNode.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
    this.sfxGainNode.connect(this.masterGainNode);

    // 3. Barramento de Trilha Sonora / Ambiente
    this.ambientGainNode = this.ctx.createGain();
    this.ambientGainNode.gain.setValueAtTime(this.ambientVolume, this.ctx.currentTime);
    this.ambientGainNode.connect(this.masterGainNode);

    if (this.ctx.state === 'running') {
      this.isUnlocked = true;
    }
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

  /**
   * Ajusta o volume Master de forma suave (rampa linear de 30ms para evitar estalos acústicos).
   * @param {number} volume - Valor entre 0.0 e 1.0
   */
  setMasterVolume(volume) {
    const clamped = Math.max(0, Math.min(1, volume));
    this.masterVolume = clamped;

    if (this.ctx && this.masterGainNode && !this.isMuted) {
      const now = this.ctx.currentTime;
      this.masterGainNode.gain.cancelScheduledValues(now);
      this.masterGainNode.gain.setTargetAtTime(clamped, now, 0.03);
    }

    this.notifyListeners();
  }

  /**
   * Alterna ou define o estado de Mute geral (Pânico / Mesa Técnica).
   * @param {boolean} [forceMute]
   */
  setMute(forceMute) {
    this.isMuted = typeof forceMute === 'boolean' ? forceMute : !this.isMuted;

    if (this.ctx && this.masterGainNode) {
      const now = this.ctx.currentTime;
      const targetGain = this.isMuted ? 0 : this.masterVolume;
      this.masterGainNode.gain.cancelScheduledValues(now);
      this.masterGainNode.gain.setTargetAtTime(targetGain, now, 0.02);
    }

    this.notifyListeners();
  }

  /**
   * Carrega um buffer de áudio em memória a partir de uma URL.
   * @param {string} name - Identificador semântico (ex: 'whoosh', 'gong', 'ticker')
   * @param {string} url - Caminho para o arquivo de áudio (.wav, .mp3, .ogg)
   */
  async loadBuffer(name, url) {
    if (this.buffers.has(name)) return this.buffers.get(name);

    this.init();
    if (!this.ctx) return null;

    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const decoded = await this.ctx.decodeAudioData(arrayBuffer);
      this.buffers.set(name, decoded);
      return decoded;
    } catch (err) {
      console.error(`[AudioEngine] Falha ao carregar áudio '${name}' de ${url}:`, err);
      return null;
    }
  }

  /**
   * Toca um som a partir de um buffer carregado.
   * @param {string} name - Nome registrado do buffer
   * @param {Object} [options] - Parâmetros de execução
   * @returns {AudioBufferSourceNode|null}
   */
  playSfx(name, { volume = 1.0, playbackRate = 1.0, loop = false, bus = 'sfx' } = {}) {
    if (!this.isUnlocked || !this.ctx || this.isMuted) return null;

    const buffer = this.buffers.get(name);
    if (!buffer) {
      // Se o buffer do arquivo ainda não estiver carregado, aciona sintetizador procedural de contingência
      this.playProceduralTone(440, 'triangle', 0.15, 0.2);
      return null;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;
    source.playbackRate.setValueAtTime(playbackRate, this.ctx.currentTime);

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(volume, this.ctx.currentTime);

    source.connect(gainNode);
    const targetBus = bus === 'ambient' ? this.ambientGainNode : this.sfxGainNode;
    gainNode.connect(targetBus);

    source.start(0);

    const id = `${name}_${Date.now()}`;
    this.activeSources.set(id, source);
    source.onended = () => {
      this.activeSources.delete(id);
    };

    return source;
  }

  /**
   * Sintetizador procedural embutido: gera um tom harmônico sem necessidade de arquivos externos.
   * Perfeito para tickers, bipes de teste e contingência caso assets estejam ausentes.
   */
  playProceduralTone(freq = 440, type = 'sine', duration = 0.2, gain = 0.25) {
    if (!this.isUnlocked || !this.ctx || this.isMuted) return;

    try {
      const osc = this.ctx.createOscillator();
      const env = this.ctx.createGain();
      const now = this.ctx.currentTime;

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

  /**
   * Toca acorde harmônico suave confirmando o desbloqueio de áudio (C5 -> E5).
   */
  playUnlockChime() {
    if (!this.ctx) return;
    this.playProceduralTone(523.25, 'sine', 0.22, 0.15); // Dó 5
    setTimeout(() => {
      this.playProceduralTone(659.25, 'sine', 0.35, 0.18); // Mi 5
    }, 120);
  }

  /**
   * Retorna um snapshot imutável do estado atual do motor de áudio.
   */
  getState() {
    return {
      isUnlocked: this.isUnlocked,
      isMuted: this.isMuted,
      masterVolume: this.masterVolume,
      sfxVolume: this.sfxVolume,
      ambientVolume: this.ambientVolume,
      ctxState: this.ctx?.state || 'uninitialized',
      bufferedSoundsCount: this.buffers.size,
    };
  }

  /**
   * Inscreve um listener para atualizações reativas de estado.
   */
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

// Exporta instância única (Singleton) para uso em toda a aplicação
export const audioEngine = new AudioEngine();
export default audioEngine;
