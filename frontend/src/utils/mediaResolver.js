import { getBackendUrl } from '../api/apiClient';

/**
 * resolveMediaUrl — Resolve caminhos de mídia para URLs completas acessíveis pelo navegador.
 * 
 * Regras de Resolução:
 * 1. Data URLs (data:image/...) e Blobs (blob:...): retornam inalterados (suporte a preview e offline).
 * 2. URLs Absolutas (http://, https://): retornam inalteradas.
 * 3. Uploads de Backend (/uploads/...): prefixados com a URL autoritativa do backend (ex: http://localhost:5000/uploads/...).
 * 4. Assets Estáticos do Frontend (/samples/..., /branding/...): mantidos como caminhos relativos para o Vite.
 * 5. Valores nulos ou vazios: retornam null.
 * 
 * @param {string|null|undefined} url
 * @returns {string|null}
 */
export function resolveMediaUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // 1. Data URLs e Blobs
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  // 2. URLs Absolutas externas
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // 3. Uploads gerenciados pelo Backend
  if (trimmed.startsWith('/uploads/')) {
    const backend = getBackendUrl().replace(/\/+$/, '');
    return `${backend}${trimmed}`;
  }

  // 4. Assets do próprio frontend (/samples/*, /branding/*, etc.)
  return trimmed;
}

export default resolveMediaUrl;
