/**
 * Utilitários para Status de Eventos (Milestone 3A).
 * 
 * 0 = Draft
 * 1 = Ready
 * 2 = Active
 * 3 = Finished
 * 4 = Archived
 */

export const EVENT_STATUS = {
  DRAFT: 0,
  READY: 1,
  ACTIVE: 2,
  FINISHED: 3,
  ARCHIVED: 4,
};

export const EVENT_STATUS_LABELS = {
  0: 'Rascunho',
  1: 'Pronto',
  2: 'Ativo na Arena',
  3: 'Encerrado',
  4: 'Arquivado',
  draft: 'Rascunho',
  ready: 'Pronto',
  active: 'Ativo na Arena',
  finished: 'Encerrado',
  archived: 'Arquivado',
};

export function getEventStatusConfig(status) {
  const norm = typeof status === 'string' ? status.toLowerCase() : status;

  switch (norm) {
    case 2:
    case 'active':
      return {
        label: 'Ativo na Arena',
        bg: 'bg-emerald-500/15',
        text: 'text-emerald-400',
        border: 'border-emerald-500/30',
        dot: 'bg-emerald-400 animate-pulse',
      };
    case 1:
    case 'ready':
      return {
        label: 'Pronto',
        bg: 'bg-amber-500/15',
        text: 'text-amber-300',
        border: 'border-amber-500/30',
        dot: 'bg-amber-400',
      };
    case 0:
    case 'draft':
      return {
        label: 'Rascunho',
        bg: 'bg-gray-500/15',
        text: 'text-gray-300',
        border: 'border-gray-500/30',
        dot: 'bg-gray-400',
      };
    case 3:
    case 'finished':
      return {
        label: 'Encerrado',
        bg: 'bg-blue-500/15',
        text: 'text-blue-300',
        border: 'border-blue-500/30',
        dot: 'bg-blue-400',
      };
    case 4:
    case 'archived':
      return {
        label: 'Arquivado',
        bg: 'bg-purple-500/10',
        text: 'text-purple-400/80',
        border: 'border-purple-500/20',
        dot: 'bg-purple-400/60',
      };
    default:
      return {
        label: 'Desconhecido',
        bg: 'bg-gray-500/10',
        text: 'text-gray-400',
        border: 'border-gray-500/20',
        dot: 'bg-gray-400',
      };
  }
}
