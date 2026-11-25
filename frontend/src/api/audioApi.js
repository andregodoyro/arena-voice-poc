import { request } from './apiClient';

/**
 * audioApi — Cliente REST para Sound Library & Event Mappings (Fase 5D.3 / 5D.4).
 */
export const audioApi = {
  getLibrary(includeDisabled = true) {
    return request(`/api/audio/library?includeDisabled=${includeDisabled ? 'true' : 'false'}`);
  },

  createLibraryItem(dto) {
    return request('/api/audio/library', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  updateLibraryItem(id, dto) {
    return request(`/api/audio/library/${id}`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    });
  },

  deactivateLibraryItem(id) {
    return request(`/api/audio/library/${id}`, {
      method: 'DELETE',
    });
  },

  getMappings() {
    return request('/api/audio/mappings');
  },

  updateMappings(mappings) {
    return request('/api/audio/mappings', {
      method: 'PUT',
      body: JSON.stringify({ mappings }),
    });
  },
};

export default audioApi;
