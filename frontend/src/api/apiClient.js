/**
 * apiClient — Cliente HTTP centralizado para consumo da API REST do Arena Voice.
 *
 * Segue ADR-001 (Backend Authoritative), ADR-010 (Content-Type Negotiation)
 * e Milestone 5H (Autenticação JWT + Refresh Automático).
 */

const ACCESS_TOKEN_KEY = 'arena_auth_access_token';
const REFRESH_TOKEN_KEY = 'arena_auth_refresh_token';
const USER_PROFILE_KEY = 'arena_auth_user';

let refreshPromise = null;

export function getBackendUrl() {
  return (
    localStorage.getItem('arena_poc_backend_url') ||
    import.meta.env.VITE_BACKEND_URL ||
    'http://localhost:5000'
  );
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY) || null;
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY) || null;
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setAuthSession({ accessToken, refreshToken, user }) {
  if (accessToken) localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  if (user) localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(user));
}

export function clearAuthSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_PROFILE_KEY);
}

async function tryRefreshSession() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const baseUrl = getBackendUrl().replace(/\/+$/, '');
        const response = await fetch(`${baseUrl}/api/auth/refresh`, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken }),
        });

        if (!response.ok) {
          clearAuthSession();
          window.dispatchEvent(new CustomEvent('arena:auth-expired'));
          return null;
        }

        const data = await response.json();
        setAuthSession({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          user: data.user,
        });
        return data.accessToken;
      } catch {
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }

  return refreshPromise;
}

async function parseErrorResponse(response) {
  let errorDetail = '';
  try {
    const errorJson = await response.json();
    errorDetail =
      errorJson.error ||
      errorJson.detail ||
      errorJson.message ||
      errorJson.title ||
      JSON.stringify(errorJson);
  } catch {
    errorDetail = await response.text();
  }

  const error = new Error(errorDetail || `Falha na requisição: HTTP ${response.status}`);
  error.status = response.status;
  return error;
}

export async function request(path, options = {}, _retried = false) {
  const baseUrl = getBackendUrl().replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${baseUrl}${cleanPath}`;

  const token = getAccessToken();
  const isAuthEndpoint = cleanPath.startsWith('/api/auth/login') || cleanPath.startsWith('/api/auth/refresh');

  const headers = {
    Accept: 'application/json',
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(token && !isAuthEndpoint ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401 && !isAuthEndpoint && !_retried && getRefreshToken()) {
      const newToken = await tryRefreshSession();
      if (newToken) {
        return request(path, options, true);
      }
    }

    if (!response.ok) {
      throw await parseErrorResponse(response);
    }

    if (response.status === 204) {
      return null;
    }

    return await response.json();
  } catch (err) {
    console.error(`[apiClient] Erro ao requisitar ${url}:`, err);
    throw err;
  }
}

export async function uploadFile(path, formData, _retried = false) {
  const baseUrl = getBackendUrl().replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${baseUrl}${cleanPath}`;

  const token = getAccessToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (response.status === 401 && !_retried && getRefreshToken()) {
    const newToken = await tryRefreshSession();
    if (newToken) {
      return uploadFile(path, formData, true);
    }
  }

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  return await response.json();
}
