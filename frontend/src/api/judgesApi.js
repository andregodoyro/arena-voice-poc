import { request } from './apiClient';

/**
 * judgesApi — Endpoints de Gestão do Catálogo de Jurados e Banca de Eventos (Milestone 3E).
 */
export const judgesApi = {
  /**
   * Obtém a lista de jurados do catálogo global.
   * @param {boolean} [includeInactive=false]
   */
  getJudges: (includeInactive = false) => {
    const query = includeInactive ? '?includeInactive=true' : '';
    return request(`/api/judges${query}`);
  },

  /**
   * Obtém os detalhes de um jurado por ID.
   * @param {string} id
   */
  getJudgeById: (id) => {
    return request(`/api/judges/${encodeURIComponent(id)}`);
  },

  /**
   * Cadastra um novo jurado no catálogo global.
   * @param {Object} payload { name, company, role, avatarUrl, bio, expertise, socialUrl, isActive, email }
   */
  createJudge: (payload) => {
    return request('/api/judges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  /**
   * Atualiza dados de um jurado existente.
   * @param {string} id
   * @param {Object} payload
   */
  updateJudge: (id, payload) => {
    return request(`/api/judges/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  /**
   * Remove um jurado (rejeitado com 409 se alocado no evento ativo).
   * @param {string} id
   */
  deleteJudge: (id) => {
    return request(`/api/judges/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  /**
   * Obtém a composição da banca (Cadeiras 1 a 5) de um evento.
   * @param {string} eventId
   */
  getEventJury: (eventId) => {
    return request(`/api/events/${encodeURIComponent(eventId)}/jury`);
  },

  /**
   * Define/atualiza a banca de jurados de um evento.
   * @param {string} eventId
   * @param {Array<{ chairId: number, judgeId: string }>} assignments
   */
  assignEventJury: (eventId, assignments) => {
    return request(`/api/events/${encodeURIComponent(eventId)}/jury`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignments }),
    });
  },
};
