/**
 * apiClient — Cliente HTTP centralizado para consumo da API REST do Arena Voice.
 * 
 * Segue ADR-001 (Backend Authoritative) e ADR-010 (Content-Type Negotiation).
 * Lê URL do backend do localStorage ou variável de ambiente.
 */

export function getBackendUrl() {
  return (
    localStorage.getItem('arena_poc_backend_url') ||
    import.meta.env.VITE_BACKEND_URL ||
    'http://localhost:5000'
  );
}

export async function request(path, options = {}) {
  const baseUrl = getBackendUrl().replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${baseUrl}${cleanPath}`;

  const headers = {
    Accept: 'application/json',
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers || {}),
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorDetail = '';
      try {
        const errorJson = await response.json();
        errorDetail = errorJson.error || errorJson.detail || errorJson.message || errorJson.title || JSON.stringify(errorJson);
      } catch {
        errorDetail = await response.text();
      }

      const error = new Error(errorDetail || `Falha na requisição: HTTP ${response.status}`);
      error.status = response.status;
      throw error;
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
