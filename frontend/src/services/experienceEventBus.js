/**
 * experienceEventBus — Barramento central de eventos de experiência (Milestone 5H.1 / 5D.4).
 *
 * Desacopla os eventos autoritativos recebidos do backend (via SignalR) e ações do
 * show flow dos efeitos audiovisuais, animações 3D, reações de plateia e áudio.
 *
 * IMPORTANTE: Eventos de reidratação inicial (F5 / reconexão) NÃO devem ser emitidos
 * neste barramento para evitar disparos retroativos de áudio/partículas.
 */

export const EXPERIENCE_EVENTS = Object.freeze({
  CHAIR_PRESSED: 'ChairPressed',
  VOTING_STARTED: 'VotingStarted',
  VOTING_FINISHED: 'VotingFinished',
  STAGE_CHANGED: 'StageChanged',
  TIMER_URGENCY: 'TimerUrgency',
  RESULTS_CALCULATED: 'ResultsCalculated',
  WINNER_REVEALED: 'WinnerRevealed',
  ARENA_RESET: 'ArenaReset',
  PROJECT_CHANGED: 'ProjectChanged',
  EVENT_CHANGED: 'EventChanged',
  AUDIO_CONFIG_UPDATED: 'AudioConfigUpdated',
});

class ExperienceEventBus {
  constructor() {
    this._listeners = new Map();
  }

  subscribe(eventType, handler) {
    if (!eventType || typeof handler !== 'function') {
      return () => {};
    }

    if (!this._listeners.has(eventType)) {
      this._listeners.set(eventType, new Set());
    }

    const set = this._listeners.get(eventType);
    set.add(handler);

    return () => {
      this.unsubscribe(eventType, handler);
    };
  }

  unsubscribe(eventType, handler) {
    if (!eventType || !handler) return;
    const set = this._listeners.get(eventType);
    if (!set) return;
    set.delete(handler);
    if (set.size === 0) {
      this._listeners.delete(eventType);
    }
  }

  subscribeMany(handlersMap = {}) {
    const unsubscribers = Object.entries(handlersMap).map(([eventType, handler]) =>
      this.subscribe(eventType, handler)
    );
    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }

  emit(eventType, payload = {}, options = {}) {
    const set = this._listeners.get(eventType);
    if (!set || set.size === 0) return;

    const now = Date.now();
    const eventEnvelope = {
      type: eventType,
      eventKey: options.eventKey || eventType,
      source: options.source || 'app',
      payload,
      metadata: options.metadata || {},
      timestamp: now,
      emittedAt: now,
    };

    for (const handler of Array.from(set)) {
      try {
        handler(eventEnvelope);
      } catch (err) {
        console.error(`[ExperienceEventBus] Erro ao processar listener para '${eventType}':`, err);
      }
    }
  }

  publish(eventOrType, payload = {}, options = {}) {
    if (eventOrType && typeof eventOrType === 'object') {
      const {
        type,
        eventKey,
        source = 'app',
        payload: innerPayload = {},
        metadata = {},
      } = eventOrType;
      const targetType = type || eventKey;
      if (!targetType) return;
      this.emit(targetType, innerPayload, { eventKey: eventKey || targetType, source, metadata });
      return;
    }

    if (typeof eventOrType === 'string') {
      this.emit(eventOrType, payload, options);
    }
  }

  clear(eventType) {
    if (eventType) {
      this._listeners.delete(eventType);
    } else {
      this._listeners.clear();
    }
  }

  dispose() {
    this.clear();
  }

  getListenerCount(eventType) {
    if (eventType) {
      return this._listeners.get(eventType)?.size || 0;
    }
    let total = 0;
    for (const set of this._listeners.values()) {
      total += set.size;
    }
    return total;
  }
}

export const experienceEventBus = new ExperienceEventBus();
export default experienceEventBus;
