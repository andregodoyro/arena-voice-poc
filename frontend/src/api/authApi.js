import { request } from './apiClient';

/**
 * authApi — Endpoints de Autenticação JWT e Sessão (Milestone 5H.2).
 */
export const authApi = {
  login: (email, password) =>
    request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  refresh: (refreshToken) =>
    request('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),

  logout: () =>
    request('/api/auth/logout', {
      method: 'POST',
    }),

  me: () => request('/api/auth/me'),
};
