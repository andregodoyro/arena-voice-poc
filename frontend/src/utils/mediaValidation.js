/**
 * mediaValidation.js — Utilitários de validação para URLs e caminhos de mídia.
 * 
 * Regra de negócio do Arena Voice:
 * 1. Valores vazios ou nulos são válidos (campos opcionais).
 * 2. Caminhos relativos internos (/samples/*, /branding/*, etc.) são válidos.
 * 3. URLs absolutas externas com protocolo HTTP ou HTTPS são válidas.
 */

/**
 * Valida se um valor de mídia atende às regras do sistema.
 * @param {string|null|undefined} val
 * @returns {boolean}
 */
export function isValidMediaUrl(val) {
  if (!val || typeof val !== 'string' || val.trim() === '') {
    return true;
  }
  const trimmed = val.trim();

  // Caminhos relativos internos iniciados com barra ou ponto
  if (trimmed.startsWith('/') || trimmed.startsWith('./') || trimmed.startsWith('../')) {
    return true;
  }

  // URLs absolutas com protocolo HTTP ou HTTPS
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
