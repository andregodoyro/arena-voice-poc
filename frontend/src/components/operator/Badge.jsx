import React from 'react';
import { Play, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { normalizeProjectStatus } from '../../utils/projectStatus';

/**
 * Badge — Indicador visual de status do projeto/pitch.
 * 
 * Suporta o contrato canônico do backend (0=Pending, 1=Current, 2=Completed, 3=Disqualified)
 * bem como representações textuais equivalentes.
 */
export function Badge({ status, className = '' }) {
  const normalized = normalizeProjectStatus(status);

  switch (normalized) {
    case 'Current':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.25)] ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <Play className="w-3 h-3 fill-emerald-400/30" />
          <span>No Palco (Current)</span>
        </span>
      );

    case 'Completed':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800/60 text-gray-400 border border-white/10 ${className}`}
        >
          <CheckCircle2 className="w-3 h-3 text-gray-500" />
          <span>Concluído (Completed)</span>
        </span>
      );

    case 'Disqualified':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-950/40 text-rose-400 border border-rose-800/40 ${className}`}
        >
          <XCircle className="w-3 h-3 text-rose-400" />
          <span>Desclassificado</span>
        </span>
      );

    case 'Pending':
    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20 ${className}`}
        >
          <Clock className="w-3 h-3 text-amber-400/80" />
          <span>Na Fila (Pending)</span>
        </span>
      );
  }
}

export default Badge;
