import { request } from './apiClient';

/**
 * roundsApi — Cliente API para Round History & Result Engine (Milestone 3D).
 */
export const roundsApi = {
  /**
   * Obtém a lista de rodadas arquivadas, opcionalmente filtrada por evento (GET /api/rounds).
   * @param {string} [eventId]
   */
  getRounds: (eventId) => {
    const query = eventId ? `?eventId=${encodeURIComponent(eventId)}` : '';
    return request(`/api/rounds${query}`);
  },

  /**
   * Obtém a última rodada arquivada no sistema (GET /api/rounds/last).
   */
  getLastRound: () => {
    return request('/api/rounds/last');
  },

  /**
   * Obtém os detalhes de uma rodada específica por ID (GET /api/rounds/{id}).
   * @param {string} id
   */
  getRoundById: (id) => {
    return request(`/api/rounds/${id}`);
  },

  /**
   * Força o arquivamento manual da rodada ativa (POST /api/rounds/archive).
   */
  archiveCurrentRound: () => {
    return request('/api/rounds/archive', {
      method: 'POST',
    });
  },
};
