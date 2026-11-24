/**
 * adminApi.js — API client para o Painel Administrativo de Usuários (Milestone 5I).
 * Todas as requisições exigem role Admin e enviam o Bearer token automaticamente
 * via apiClient.js.
 */

import { request } from './apiClient';

export const adminApi = {
  /**
   * Lista todos os usuários do sistema.
   * @returns {Promise<AdminUser[]>}
   */
  listUsers: () => request('/api/admin/users'),

  /**
   * Busca um usuário pelo ID.
   * @param {string} id
   * @returns {Promise<AdminUser>}
   */
  getUser: (id) => request(`/api/admin/users/${id}`),

  /**
   * Cria um novo usuário.
   * @param {{ name: string, email: string, password: string, role: string }} data
   * @returns {Promise<AdminUser>}
   */
  createUser: (data) =>
    request('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  /**
   * Atualiza nome, e-mail, role ou status de ativação.
   * @param {string} id
   * @param {{ name?: string, email?: string, role?: string, isActive?: boolean }} data
   * @returns {Promise<AdminUser>}
   */
  updateUser: (id, data) =>
    request(`/api/admin/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  /**
   * Ativa a conta de um usuário.
   * @param {string} id
   */
  activateUser: (id) =>
    request(`/api/admin/users/${id}/activate`, { method: 'POST' }),

  /**
   * Desativa a conta de um usuário.
   * @param {string} id
   */
  deactivateUser: (id) =>
    request(`/api/admin/users/${id}/deactivate`, { method: 'POST' }),

  /**
   * Redefine a senha de um usuário. Invalida todas as sessões ativas.
   * @param {string} id
   * @param {string} newPassword
   */
  resetPassword: (id, newPassword) =>
    request(`/api/admin/users/${id}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword }),
    }),
};

/**
 * @typedef {Object} AdminUser
 * @property {string} id
 * @property {string} name
 * @property {string} email
 * @property {string} role
 * @property {boolean} isActive
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {string|null} lastLoginAt
 */
