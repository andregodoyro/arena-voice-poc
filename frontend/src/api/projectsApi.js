import { request } from './apiClient';

/**
 * projectsApi — Endpoints operacionais de Projetos (Milestones 2B, 2C.3 & 5C.2B).
 * 
 * Segue ADR-001 (Backend Authoritative), ADR-005 (Project Selection Lifecycle),
 * ADR-006 (Project Deletion Protection) e Milestone 5C.2B (Hero Wall Occupancy Pass & Upload Support).
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
   * @param {Object} projectData - Dados do projeto (title, pitchLeader, track, description, orderIndex, logoUrl, coverImageUrl, mediaItems).
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

  /**
   * Faz upload de ativos visuais para o servidor (POST /api/upload).
   * Formatos suportados: JPG, JPEG, PNG, WEBP, SVG.
   * Possui fallback resiliente para dataURL caso o backend esteja offline.
   * @param {File} file - Arquivo a enviar.
   * @returns {Promise<{ url: string, fileName: string, size: number }>}
   */
  uploadMedia: async (file) => {
    try {
      const baseUrl = (
        localStorage.getItem('arena_poc_backend_url') ||
        import.meta.env.VITE_BACKEND_URL ||
        'http://localhost:5000'
      ).replace(/\/+$/, '');

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${baseUrl}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        return await response.json();
      }
    } catch (err) {
      console.warn('[projectsApi] Upload via API falhou, utilizando fallback local DataURL:', err);
    }

    // Fallback offline-first via FileReader DataURL
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          url: reader.result,
          fileName: file.name,
          size: file.size,
          contentType: file.type,
        });
      };
      reader.onerror = () => reject(new Error('Erro ao ler o arquivo local.'));
      reader.readAsDataURL(file);
    });
  },
};
