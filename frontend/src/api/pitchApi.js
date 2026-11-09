import { request } from './apiClient';

/**
 * pitchApi — Endpoints operacionais do Pitch Lifecycle Engine & Timers (Milestone 3B & 3C).
 * 
 * Máquina de estados formal:
 * 0: Waiting
 * 1: PitchRunning
 * 2: QA
 * 3: VotingOpen
 * 4: VotingClosed
 * 5: Finished
 */
export const pitchApi = {
  /**
   * Obtém o estado atual da máquina de estados do pitch e timers (GET /api/pitch/state).
   */
  getPitchState: () => {
    return request('/api/pitch/state');
  },

  /**
   * Executa a transição canônica de estágio do pitch (POST /api/pitch/transition).
   * @param {string} targetStage - Nome do estágio de destino (ex: "PitchRunning", "QA", "VotingOpen", "VotingClosed", "Finished").
   */
  transitionPitch: (targetStage) => {
    return request('/api/pitch/transition', {
      method: 'POST',
      body: JSON.stringify({ targetStage }),
    });
  },

  /**
   * Reseta as cadeiras para 0° e retorna o estágio para Waiting mantendo o projeto atual selecionado (POST /api/pitch/reset).
   */
  resetPitch: () => {
    return request('/api/pitch/reset', {
      method: 'POST',
    });
  },

  /**
   * Pausa o cronômetro do estágio ativo (POST /api/pitch/timer/pause).
   */
  pauseTimer: () => {
    return request('/api/pitch/timer/pause', {
      method: 'POST',
    });
  },

  /**
   * Retoma o cronômetro do estágio ativo (POST /api/pitch/timer/resume).
   */
  resumeTimer: () => {
    return request('/api/pitch/timer/resume', {
      method: 'POST',
    });
  },

  /**
   * Ajusta a duração alocada da rodada atual em segundos (+30, +60, +120) (POST /api/pitch/timer/adjust).
   * @param {number} seconds - Segundos a adicionar ou remover.
   */
  adjustTimer: (seconds) => {
    return request('/api/pitch/timer/adjust', {
      method: 'POST',
      body: JSON.stringify({ seconds }),
    });
  },
};
