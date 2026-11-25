import { buildAudioConfigFromApi, fetchAudioConfig } from './audioConfigClient.js';
import { SOUND_EVENTS, SOUND_PRIORITIES } from './soundMap.js';
import { EXPERIENCE_EVENTS } from '../services/experienceEventBus.js';

/**
 * AudioEventSubscriber — Conecta o ExperienceEventBus ao AudioEngine (Fase 5D.4).
 *
 * Resolve eventos de experiência usando a configuração persistida do backend
 * (SoundLibrary + SoundEventMapping) com fallback transparente para o catálogo local.
 */
export class AudioEventSubscriber {
  constructor({ engine = null, bus = null } = {}) {
    this._engine = engine;
    this._bus = bus;
    this._unsub = null;
    this._config = buildAudioConfigFromApi([], []);
    this._lastReloadParams = null;
  }

  getConfig() {
    return this._config;
  }

  setConfig(config) {
    if (config && config.catalog && config.soundMap) {
      this._config = config;
    }
  }

  setConfigFromApi(libraryItems = [], mappings = []) {
    this._config = buildAudioConfigFromApi(libraryItems, mappings);
    return this._config;
  }

  async loadConfig(params = {}) {
    this._lastReloadParams = params;
    const loaded = await fetchAudioConfig(params);
    this._config = loaded;
    return loaded;
  }

  attach(bus = this._bus, engine = this._engine) {
    if (!bus || !engine) return () => {};

    // Previne listeners duplicados se attach() for chamado mais de uma vez
    this.detach();

    this._bus = bus;
    this._engine = engine;

    const handlers = {
      [EXPERIENCE_EVENTS.CHAIR_PRESSED]: (env) => {
        this.playEventKey(SOUND_EVENTS.CHAIR_TURN, env);
      },
      [EXPERIENCE_EVENTS.VOTING_STARTED]: (env) => {
        this.playEventKey(SOUND_EVENTS.VOTING_OPEN, env);
      },
      [EXPERIENCE_EVENTS.VOTING_FINISHED]: (env) => {
        this._engine?.stopLoop?.('music', 900);
        this.playEventKey(SOUND_EVENTS.VOTING_CLOSED, env);
      },
      [EXPERIENCE_EVENTS.TIMER_URGENCY]: (env) => {
        this.playEventKey(SOUND_EVENTS.COUNTDOWN_TICK, env);
      },
      [EXPERIENCE_EVENTS.WINNER_REVEALED]: (env) => {
        this.playEventKey(SOUND_EVENTS.CHAIR_UNANIMOUS, env);
      },
      [EXPERIENCE_EVENTS.ARENA_RESET]: (env) => {
        this._engine?.stopLoop?.('music', 700);
        this._engine?.stopLoop?.('ambient', 700);
        this.playEventKey(SOUND_EVENTS.ARENA_RESET, env);
      },
      [EXPERIENCE_EVENTS.STAGE_CHANGED]: (env) => {
        const stage = env?.payload?.stage || env?.payload?.stageName;
        if (stage === 'Standby' || stage === 'Waiting') {
          this.playEventKey(SOUND_EVENTS.ARENA_IDLE, env);
        } else if (stage === 'Presentation' || stage === 'PitchRunning') {
          this._engine?.stopLoop?.('music', 800);
          this.playEventKey(SOUND_EVENTS.PITCH_START, env);
        }
      },
      [EXPERIENCE_EVENTS.RESULTS_CALCULATED]: (env) => {
        const result = env?.payload?.round?.result;
        if (result === 'Approved') {
          this.playEventKey(SOUND_EVENTS.RESULTS_WINNER, env);
        } else if (result === 'Eliminated' || result === 'Rejected') {
          this.playEventKey(SOUND_EVENTS.RESULTS_PODIUM_STEP, env);
        }
      },
      [EXPERIENCE_EVENTS.AUDIO_CONFIG_UPDATED]: () => {
        if (this._lastReloadParams) {
          this.loadConfig(this._lastReloadParams).catch(() => {});
        }
      },
    };

    this._unsub = bus.subscribeMany(handlers);
    return () => this.detach();
  }

  detach() {
    if (typeof this._unsub === 'function') {
      this._unsub();
      this._unsub = null;
    }
  }

  playEventKey(eventKey, envelope = {}) {
    if (!this._engine || !eventKey) return null;

    try {
      const { catalog, soundMap } = this._config || {};
      const entry = soundMap?.[eventKey];

      if (!entry) {
        return this._engine.playEvent?.(eventKey) ?? null;
      }

      const primaryKey = entry.assetKey !== undefined ? entry.assetKey : entry.soundId;
      const primaryAsset = primaryKey ? catalog?.[primaryKey] : null;

      if (!primaryAsset) {
        // Sem asset habilitado na biblioteca: aciona fallback procedural se configurado
        const fallbackFnName = entry.fallbackSynth || entry.fallbackMethod || entry.proceduralFallback;
        if (fallbackFnName && typeof this._engine[fallbackFnName] === 'function') {
          const isCritical = Boolean(envelope?.payload?.isCritical);
          if (fallbackFnName === 'playTimerTicker') {
            this._engine.playTimerTicker(isCritical);
          } else {
            this._engine[fallbackFnName]();
          }
          return { mode: 'procedural-fallback', eventKey };
        }
        return null;
      }

      const primaryResult = this._playAssetEntry(primaryAsset, entry);

      // Suporta múltiplos layers ordenados por LayerOrder (API) ou secondarySoundId (local)
      const secondaryLayers = Array.isArray(entry.layers)
        ? entry.layers
        : entry.secondarySoundId
          ? [{ assetKey: entry.secondarySoundId, volume: entry.secondaryVolume }]
          : [];

      for (const layer of secondaryLayers) {
        const layerKey = layer?.assetKey || layer?.soundId;
        const layerAsset = layerKey ? catalog?.[layerKey] : null;
        if (!layerAsset) continue;
        try {
          this._playAssetEntry(layerAsset, {
            ...entry,
            volume: layer.volume ?? layerAsset.defaultVolume,
            ducking: null,
          });
        } catch (layerErr) {
          console.warn(`[AudioEventSubscriber] Falha em layer secundário '${layerKey}':`, layerErr);
        }
      }

      return primaryResult;
    } catch (err) {
      console.error(`[AudioEventSubscriber] Erro ao reproduzir '${eventKey}':`, err);
      return null;
    }
  }

  _playAssetEntry(asset, entry) {
    const normalizedBus = typeof asset.bus === 'string' ? asset.bus.trim().toLowerCase() : 'sfx';
    const pitchJitter =
      typeof entry.pitchJitter === 'number'
        ? entry.pitchJitter
        : normalizedBus === 'sfx' && !asset.isLoop
          ? 0.025
          : 0;

    return this._engine.playBuffer(asset.key, {
      url: asset.url,
      bus: normalizedBus,
      volume: entry.volume ?? asset.defaultVolume ?? 0.8,
      loop: Boolean(asset.isLoop),
      offset: asset.offsetSeconds ?? 0,
      duration: asset.durationSeconds ?? null,
      pitchJitter,
      cooldownMs: entry.cooldownMs ?? 0,
      priority: entry.priority ?? SOUND_PRIORITIES.NORMAL,
      duckMusic: Boolean(entry.duckMusic),
      duckDurationMs: entry.duckDurationMs ?? 2200,
      fallbackSynth: entry.fallbackSynth || entry.fallbackMethod || entry.proceduralFallback || null,
    });
  }
}

export const audioEventSubscriber = new AudioEventSubscriber();
export default audioEventSubscriber;
