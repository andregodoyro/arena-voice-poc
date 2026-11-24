/**
 * test-auth-helper.cjs
 * Helper centralizado de autenticação JWT para as suítes de teste (Milestone 5H/5I).
 * Evita duplicação da lógica de login nos arquivos de teste e permite
 * obter tokens por perfil (Admin, Operator, Viewer) via POST /api/auth/login.
 */

const DEFAULT_BASE_URL = process.env.TEST_BASE_URL || process.env.BASE_URL || 'http://127.0.0.1:5000';

const CREDENTIALS = {
  Admin: {
    email: process.env.ARENA_ADMIN_EMAIL || 'admin@arenavoice.local',
    password: process.env.ARENA_ADMIN_PASSWORD || 'ArenaAdmin@2026',
  },
  Operator: {
    email: process.env.ARENA_OPERATOR_EMAIL || 'operator@arenavoice.local',
    password: process.env.ARENA_OPERATOR_PASSWORD || 'ArenaOperator@2026',
  },
  Viewer: {
    email: process.env.ARENA_VIEWER_EMAIL || 'viewer@arenavoice.local',
    password: process.env.ARENA_VIEWER_PASSWORD || 'ArenaViewer@2026',
  },
};

const tokenCache = new Map();

/**
 * Autentica via POST /api/auth/login e retorna o accessToken JWT.
 * @param {'Admin'|'Operator'|'Viewer'} role
 * @param {{ baseUrl?: string, forceRefresh?: boolean }} [options]
 */
async function loginAs(role = 'Operator', options = {}) {
  const baseUrl = (options.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, '');
  const cacheKey = `${baseUrl}::${role}`;

  if (!options.forceRefresh && tokenCache.has(cacheKey)) {
    return tokenCache.get(cacheKey);
  }

  const creds = CREDENTIALS[role];
  if (!creds) {
    throw new Error(`Perfil de teste desconhecido: ${role}`);
  }

  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email: creds.email, password: creds.password }),
  });

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!res.ok || !data?.accessToken) {
    throw new Error(`Falha ao autenticar como ${role} (${creds.email}) em ${baseUrl}: HTTP ${res.status} - ${JSON.stringify(data)}`);
  }

  tokenCache.set(cacheKey, data.accessToken);
  return data.accessToken;
}

function clearTokenCache() {
  tokenCache.clear();
}

function authHeaders(token, extraHeaders = {}) {
  if (!token) return { ...extraHeaders };
  return {
    Authorization: `Bearer ${token}`,
    ...extraHeaders,
  };
}

module.exports = {
  DEFAULT_BASE_URL,
  CREDENTIALS,
  loginAs,
  clearTokenCache,
  authHeaders,
};
