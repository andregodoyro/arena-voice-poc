import { request } from './apiClient';

/**
 * eventsApi — Endpoints de consulta de Evento e Estado Global (Milestone 2C.2 - Read Only).
 */
export const eventsApi = {
  /**
   * Obtém as configurações e branding do evento ativo.
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
};
