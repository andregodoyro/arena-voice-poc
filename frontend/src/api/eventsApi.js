import { request } from './apiClient';
import { projectsApi } from './projectsApi';

/**
 * eventsApi — Endpoints de Gestão do Ciclo de Vida de Eventos e Estado Global.
 * 
 * Milestone 3A: CRUD Completo, Ativação, Encerramento, Arquivamento e Duplicação.
 */
export const eventsApi = {
  /**
   * Obtém a lista de eventos com filtro opcional por status.
   * @param {string} [status] 'draft' | 'ready' | 'active' | 'finished' | 'archived'
   */
  getEvents: (status) => {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return request(`/api/events${query}`);
  },

  /**
   * Obtém os detalhes de um evento específico por ID.
   * @param {string} id
   */
  getEventById: (id) => {
    return request(`/api/events/${encodeURIComponent(id)}`);
  },

  /**
   * Cria um novo evento no catálogo.
   * @param {Object} payload { title, description, scheduledDate, status, branding, timers }
   */
  createEvent: (payload) => {
    return request('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  /**
   * Atualiza dados e branding de um evento específico.
   * @param {string} id
   * @param {Object} payload { title, description, scheduledDate, status, branding, timers }
   */
  updateEvent: (id, payload) => {
    return request(`/api/events/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  /**
   * Ativa um evento como o evento ativo na arena física.
   * @param {string} id
   */
  activateEvent: (id) => {
    return request(`/api/events/${encodeURIComponent(id)}/activate`, {
      method: 'POST',
    });
  },

  /**
   * Encerra formalmente um evento ativo.
   * @param {string} id
   */
  finishEvent: (id) => {
    return request(`/api/events/${encodeURIComponent(id)}/finish`, {
      method: 'POST',
    });
  },

  /**
   * Arquiva um evento inativo (draft, ready ou finished).
   * @param {string} id
   */
  archiveEvent: (id) => {
    return request(`/api/events/${encodeURIComponent(id)}/archive`, {
      method: 'POST',
    });
  },

  /**
   * Duplica um evento existente como novo Draft (com todos os projetos associados).
   * @param {string} id
   */
  duplicateEvent: (id) => {
    return request(`/api/events/${encodeURIComponent(id)}/duplicate`, {
      method: 'POST',
    });
  },

  /**
   * Obtém a composição da banca do evento (júris ativos vs disponíveis).
   * @param {string} id
   */
  getEventJury: (id) => {
    return request(`/api/events/${encodeURIComponent(id)}/jury`);
  },

  /**
   * Aloca ou reordena os jurados da banca do evento.
   * @param {string} id
   * @param {Array<string>} judgeIds Lista de IDs dos jurados
   */
  assignEventJury: (id, judgeIds) => {
    return request(`/api/events/${encodeURIComponent(id)}/jury`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ judgeIds }),
    });
  },

  /**
   * Obtém as configurações e branding do evento ativo (retrocompatível).
   */
  getCurrentEvent: () => {
    return request('/api/events/current');
  },

  /**
   * Obtém o snapshot global do backend (cadeiras, evento ativo e projeto em apresentação).
   */
  getState: () => {
    return request('/api/state');
  },

  /**
   * Atualiza as configurações e branding do evento ativo (retrocompatível).
   * @param {Object} payload { title, description, scheduledDate, branding: { primaryColor, secondaryColor, logoUrl, tagline, coverImageUrl, videoUrl, mediaMode } }
   */
  updateCurrentEvent: (payload) => {
    return request('/api/events/current', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  },

  /**
   * Upload de arquivo de mídia para eventos (imagens e vídeos).
   * @param {File} file
   * @returns {Promise<{ url: string, fileName: string, size: number }>}
   */
  uploadMedia: (file) => projectsApi.uploadMedia(file),
};
