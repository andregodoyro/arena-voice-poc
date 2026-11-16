import { request } from './apiClient';

/**
 * auditApi — Cliente API para Audit Trail & Event Sourcing Leve (Milestone 4C).
 * 
 * Segue ADR-022: Eventos técnicos de persistência/recuperação são ocultados por padrão.
 */
export const auditApi = {
  /**
   * Obtém a timeline geral de eventos de auditoria (GET /api/audit).
   * @param {Object} [params]
   * @param {number} [params.page=1]
   * @param {number} [params.pageSize=20]
   * @param {string} [params.eventType]
   * @param {string} [params.aggregateType]
   * @param {string} [params.actorType]
   * @param {string} [params.from]
   * @param {string} [params.to]
   * @param {boolean} [params.includeTechnical=false]
   */
  getTimeline: (params = {}) => {
    const query = new URLSearchParams();

    if (params.page) query.append('page', params.page);
    if (params.pageSize) query.append('pageSize', params.pageSize);
    if (params.eventType) query.append('eventType', params.eventType);
    if (params.aggregateType) query.append('aggregateType', params.aggregateType);
    if (params.actorType) query.append('actorType', params.actorType);
    if (params.from) query.append('from', params.from);
    if (params.to) query.append('to', params.to);
    
    // ADR-022: por padrão false, a menos que solicitado explicitamente true
    if (params.includeTechnical === true) {
      query.append('includeTechnical', 'true');
    } else {
      query.append('includeTechnical', 'false');
    }

    const queryString = query.toString();
    return request(`/api/audit${queryString ? `?${queryString}` : ''}`);
  },

  /**
   * Obtém um evento de auditoria por ID (GET /api/audit/{id}).
   * @param {number|string} id
   */
  getById: (id) => {
    return request(`/api/audit/${id}`);
  },

  /**
   * Obtém o histórico de auditoria filtrado por projeto (GET /api/audit/project/{projectId}).
   * @param {string} projectId
   * @param {Object} [params]
   */
  getByProjectId: (projectId, params = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page);
    if (params.pageSize) query.append('pageSize', params.pageSize);
    if (params.includeTechnical === true) query.append('includeTechnical', 'true');
    const qs = query.toString();
    return request(`/api/audit/project/${encodeURIComponent(projectId)}${qs ? `?${qs}` : ''}`);
  },

  /**
   * Obtém o histórico de auditoria filtrado por evento da arena (GET /api/audit/event/{eventId}).
   * @param {string} eventId
   * @param {Object} [params]
   */
  getByEventId: (eventId, params = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page);
    if (params.pageSize) query.append('pageSize', params.pageSize);
    if (params.includeTechnical === true) query.append('includeTechnical', 'true');
    const qs = query.toString();
    return request(`/api/audit/event/${encodeURIComponent(eventId)}${qs ? `?${qs}` : ''}`);
  },

  /**
   * Obtém a timeline de sessão (checkpoints técnicos e updates) (GET /api/audit/session).
   * @param {Object} [params]
   */
  getSessionTimeline: (params = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page);
    if (params.pageSize) query.append('pageSize', params.pageSize);
    const qs = query.toString();
    return request(`/api/audit/session${qs ? `?${qs}` : ''}`);
  },
};
