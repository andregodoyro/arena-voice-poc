import { request } from './apiClient';

/**
 * resultsApi — Motor de Ranking Oficial Consolidado (Milestone 6A).
 */
export const resultsApi = {
  getEventResults: (eventId) => request(`/api/events/${encodeURIComponent(eventId)}/results`),
};
