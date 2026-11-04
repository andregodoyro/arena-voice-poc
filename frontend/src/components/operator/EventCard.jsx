import React from 'react';
import {
  Play,
  Edit2,
  Copy,
  Archive,
  Calendar,
  Sparkles,
  CheckCircle,
  Flag,
} from 'lucide-react';
import { getEventStatusConfig } from '../../utils/eventStatus';

/**
 * EventCard — Card visual para representação de um evento no catálogo (Milestone 3A).
 */
export function EventCard({
  event,
  isActive = false,
  onActivate,
  onEdit,
  onDuplicate,
  onFinish,
  onArchive,
}) {
  const statusCfg = getEventStatusConfig(event.status);
  const primaryColor = event.branding?.primaryColor || '#d90429';
  const secondaryColor = event.branding?.secondaryColor || '#ffd166';

  const formattedDate = event.scheduledDate
    ? new Date(event.scheduledDate).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Data não definida';

  const isArchived = event.status === 4 || event.status === 'Archived';
  const isFinished = event.status === 3 || event.status === 'Finished';

  return (
    <div
      className={`rounded-2xl border transition-all duration-300 flex flex-col justify-between overflow-hidden relative ${
        isActive
          ? 'bg-gradient-to-br from-gray-900/90 via-gray-900/60 to-emerald-950/30 border-emerald-500/50 shadow-lg shadow-emerald-950/20 ring-1 ring-emerald-500/30'
          : 'bg-gray-900/50 hover:bg-gray-900/80 border-white/10 hover:border-white/20'
      }`}
    >
      {/* ── TOPO DO CARD: STATUS & AMBIENTAÇÃO CROMÁTICA ─────────────────────── */}
      <div className="p-5 pb-3">
        <div className="flex items-center justify-between gap-2 mb-3">
          {/* Badge de Status */}
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
            {statusCfg.label}
          </span>

          {/* Mini Preview das Cores de Branding */}
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/40 border border-white/5"
            title={`Primária: ${primaryColor} | Secundária: ${secondaryColor}`}
          >
            <span
              className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm"
              style={{ backgroundColor: primaryColor }}
            />
            <span
              className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm"
              style={{ backgroundColor: secondaryColor }}
            />
          </div>
        </div>

        {/* Título e Descrição */}
        <h3 className="text-base font-bold text-white tracking-tight line-clamp-1">
          {event.title}
        </h3>
        <p className="text-xs text-gray-400 mt-1 line-clamp-2 min-h-[2rem]">
          {event.description || 'Nenhuma descrição informada.'}
        </p>

        {/* Tagline / Assinatura */}
        {event.branding?.tagline && (
          <p className="text-[11px] text-amber-300/80 italic mt-2 line-clamp-1">
            "{event.branding.tagline}"
          </p>
        )}
      </div>

      {/* ── METADADOS: DATA & AGENDAMENTO ────────────────────────────────────── */}
      <div className="px-5 py-2.5 border-t border-white/5 bg-black/20 flex items-center justify-between text-xs text-gray-400">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-gray-500" />
          <span className="text-[11px]">{formattedDate}</span>
        </div>
        <span className="text-[10px] text-gray-500 font-mono">
          ID: {event.id}
        </span>
      </div>

      {/* ── RODAPÉ: AÇÕES OPERACIONAIS ───────────────────────────────────────── */}
      <div className="p-3.5 bg-black/40 border-t border-white/10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          {/* Botão Editar */}
          <button
            onClick={() => onEdit(event)}
            className="p-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
            title="Editar dados e identidade visual"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>

          {/* Botão Duplicar */}
          <button
            onClick={() => onDuplicate(event)}
            className="p-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
            title="Duplicar evento (cria cópia em Rascunho)"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          {/* Botão Encerrar (Aparece se for o Ativo) */}
          {isActive && (
            <button
              onClick={() => onFinish(event)}
              className="px-2.5 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-medium flex items-center gap-1 transition-colors"
              title="Encerrar formalmente o evento ativo"
            >
              <Flag className="w-3.5 h-3.5" />
              <span>Encerrar</span>
            </button>
          )}

          {/* Botão Arquivar (se não for o ativo e não estiver arquivado) */}
          {!isActive && !isArchived && (
            <button
              onClick={() => onArchive(event)}
              className="p-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-purple-500/20 text-gray-400 hover:text-purple-300 transition-colors"
              title="Arquivar evento histórico"
            >
              <Archive className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Botão Principal: Ativar no Palco */}
        {!isActive ? (
          <button
            onClick={() => onActivate(event)}
            className="px-3 py-1.5 rounded-xl border border-emerald-500/40 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 hover:text-emerald-200 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm shadow-emerald-950/40"
            title="Projetar e ativar este evento na arena física"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Ativar no Palco</span>
          </button>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
            <CheckCircle className="w-4 h-4" />
            <span>No Palco</span>
          </span>
        )}
      </div>
    </div>
  );
}
