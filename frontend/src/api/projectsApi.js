import { request } from './apiClient';

/**
 * projectsApi — Endpoints operacionais de Projetos (Milestones 2B & 2C.3).
 * 
 * Segue ADR-001 (Backend Authoritative), ADR-005 (Project Selection Lifecycle)
 * e ADR-006 (Project Deletion Protection).
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

  /**
   * Cria um novo projeto vinculado ao evento ativo (POST /api/projects).
   * @param {Object} projectData - Dados do projeto (title, pitchLeader, track, description, orderIndex, logoUrl, coverImageUrl).
   */
  createProject: (projectData) => {
    return request('/api/projects', {
      method: 'POST',
      body: JSON.stringify(projectData),
    });
  },

  /**
   * Atualiza dados de um projeto existente (PUT /api/projects/{id}).
   * @param {string} id - Identificador do projeto.
   * @param {Object} projectData - Dados atualizados.
   */
  updateProject: (id, projectData) => {
    return request(`/api/projects/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(projectData),
    });
  },

  /**
   * Remove um projeto inativo (DELETE /api/projects/{id}).
   * Retorna 409 Conflict se for o projeto atualmente no palco (ADR-006).
   * @param {string} id - Identificador do projeto.
   */
  deleteProject: (id) => {
    return request(`/api/projects/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  /**
   * Promove atomicamente o projeto ao palco cênico (POST /api/projects/{id}/select).
   * Segue ADR-005: transiciona o projeto anterior para Completed e o novo para Current.
   * @param {string} id - Identificador do projeto.
   */
  selectProject: (id) => {
    return request(`/api/projects/${encodeURIComponent(id)}/select`, {
      method: 'POST',
    });
  },
};
