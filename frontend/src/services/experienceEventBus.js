/**
 * experienceEventBus — Barramento central de eventos de experiência (Milestone 5H.1).
 *
 * Desacopla os eventos autoritativos recebidos do backend (via SignalR) dos efeitos
 * audiovisuais, animações 3D, reações de plateia e transições de câmera/pódio.
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
      set.delete(handler);
      if (set.size === 0) {
        this._listeners.delete(eventType);
      }
    };
  }

  subscribeMany(handlersMap = {}) {
    const unsubscribers = Object.entries(handlersMap).map(([eventType, handler]) =>
      this.subscribe(eventType, handler)
    );
    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }

  emit(eventType, payload = {}) {
    const set = this._listeners.get(eventType);
    if (!set || set.size === 0) return;

    const eventEnvelope = {
      type: eventType,
      payload,
      emittedAt: Date.now(),
    };

    for (const handler of Array.from(set)) {
      try {
        handler(eventEnvelope);
      } catch (err) {
        console.error(`[ExperienceEventBus] Erro ao processar listener para '${eventType}':`, err);
      }
    }
  }
}

export const experienceEventBus = new ExperienceEventBus();
export default experienceEventBus;
