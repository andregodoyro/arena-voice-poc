/**
 * projectStatus.js — Mapeamento canônico do enum ProjectStatus do backend.
 * 
 * Contrato de domínio no backend (ArenaVoicePocBackend.Domain.Enums.ProjectStatus):
 *   Pending      = 0
 *   Current      = 1
 *   Completed    = 2
 *   Disqualified = 3
 */

export const PROJECT_STATUS = {
  PENDING: 0,
  CURRENT: 1,
  COMPLETED: 2,
  DISQUALIFIED: 3,
};

/**
 * Normaliza qualquer representação (número 0|1|2|3 ou string '0'|'Pending'|'current')
 * para uma string canônica ('Pending', 'Current', 'Completed', 'Disqualified').
 * 
 * @param {number|string|null|undefined} status
 * @returns {'Pending' | 'Current' | 'Completed' | 'Disqualified'}
 */
export function normalizeProjectStatus(status) {
  if (status === null || status === undefined) {
    return 'Pending';
  }

  // Se já for número ou string numérica
  const num = Number(status);
  if (!Number.isNaN(num) && typeof status !== 'boolean') {
    switch (num) {
      case PROJECT_STATUS.PENDING:
        return 'Pending';
      case PROJECT_STATUS.CURRENT:
        return 'Current';
      case PROJECT_STATUS.COMPLETED:
        return 'Completed';
      case PROJECT_STATUS.DISQUALIFIED:
        return 'Disqualified';
      default:
        return 'Pending';
    }
  }

  // Se for string textual
  const str = String(status).trim().toLowerCase();
  switch (str) {
    case 'current':
      return 'Current';
    case 'completed':
      return 'Completed';
    case 'disqualified':
      return 'Disqualified';
    case 'pending':
    default:
      return 'Pending';
  }
}

/**
 * Verifica se o status corresponde a 'Current' (em apresentação no palco).
 */
export function isCurrentProject(status) {
  return normalizeProjectStatus(status) === 'Current';
}

/**
 * Verifica se o status corresponde a 'Pending' (na fila).
 */
export function isPendingProject(status) {
  return normalizeProjectStatus(status) === 'Pending';
}

/**
 * Verifica se o status corresponde a 'Completed' (apresentação concluída).
 */
export function isCompletedProject(status) {
  return normalizeProjectStatus(status) === 'Completed';
}
