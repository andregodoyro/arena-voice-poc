import { request } from './apiClient';

/**
 * projectsApi — Endpoints de consulta de Projetos (Milestone 2C.2 - Read Only).
 */
export const projectsApi = {
  /**
   * Obtém a lista de projetos cadastrados.
   * @param {boolean} includeCompleted - Se true, inclui projetos concluídos.
   */
  getProjects: (includeCompleted = true) => {
    return request(`/api/projects?includeCompleted=${includeCompleted}`);
  },

  /**
   * Obtém os detalhes de um projeto específico por ID.
   * @param {string} id - Identificador do projeto.
   */
  getProjectById: (id) => {
    return request(`/api/projects/${encodeURIComponent(id)}`);
  },
};
