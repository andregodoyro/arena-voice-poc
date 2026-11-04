import { request } from './apiClient';

/**
 * pitchApi — Endpoints operacionais do Pitch Lifecycle Engine (Milestone 3B).
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
   * Obtém o estado atual da máquina de estados do pitch (GET /api/pitch/state).
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
};
