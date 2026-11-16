import React from 'react';
import { 
  History, 
  Clock, 
  RotateCcw, 
  Flame, 
  Play, 
  Pause, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  Users, 
  Layers, 
  Info 
} from 'lucide-react';

/**
 * Retorna as classes de estilo e o ícone de acordo com o tipo/categoria do evento.
 */
function getEventBadgeProps(evt) {
  switch (evt.type) {
    case 'RESET':
      return {
        bg: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
        icon: <RotateCcw className="w-3.5 h-3.5" />
      };
    case 'CHAIR_TURNED':
      return {
        bg: 'bg-red-500/10 text-red-400 border border-red-500/20',
        icon: <Flame className="w-3.5 h-3.5" />
      };
    case 'PITCH_STARTED':
      return {
        bg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
        icon: <Play className="w-3.5 h-3.5" />
      };
    case 'PITCH_PAUSED':
      return {
        bg: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
        icon: <Pause className="w-3.5 h-3.5" />
      };
    case 'PITCH_RESUMED':
      return {
        bg: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
        icon: <Play className="w-3.5 h-3.5" />
      };
    case 'PITCH_COMPLETED':
    case 'PROJECT_COMPLETED':
      return {
        bg: 'bg-green-500/10 text-green-400 border border-green-500/20',
        icon: <CheckCircle2 className="w-3.5 h-3.5" />
      };
    case 'PITCH_EXPIRED':
      return {
        bg: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
        icon: <AlertTriangle className="w-3.5 h-3.5" />
      };
    case 'PROJECT_ACTIVATED':
      return {
        bg: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
        icon: <Sparkles className="w-3.5 h-3.5" />
      };
    case 'JUDGE_ASSIGNED':
    case 'JUDGE_UNASSIGNED':
      return {
        bg: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
        icon: <Users className="w-3.5 h-3.5" />
      };
    case 'EVENT_ACTIVATED':
    case 'EVENT_CREATED':
      return {
        bg: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
        icon: <Layers className="w-3.5 h-3.5" />
      };
    default:
      return {
        bg: 'bg-gray-500/10 text-gray-400 border border-gray-500/20',
        icon: <Info className="w-3.5 h-3.5" />
      };
  }
}

/**
 * ActivityLog — Linha do tempo de eventos da sessão em linguagem de produto.
 * 
 * Suporta histórico reidratado via Audit Trail (Milestone 4C.5 / ADR-022)
 * combinado com eventos SignalR em tempo real.
 */
export function ActivityLog({ events = [] }) {
  return (
    <div className="glass-panel rounded-2xl p-5 border border-white/10 shadow-lg flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-gray-400" />
          <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">
            Histórico da Sessão
          </span>
        </div>
        <span className="text-[10px] text-gray-500 font-mono">
          {events.length} evento(s)
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[380px] pr-1">
        {events.length === 0 ? (
          <div className="h-44 flex flex-col items-center justify-center text-center p-4 rounded-xl border border-dashed border-white/10 bg-white/[0.01]">
            <Clock className="w-6 h-6 text-gray-600 mb-2" />
            <p className="text-xs text-gray-400 font-medium">
              Nenhum acionamento recente
            </p>
            <p className="text-[10px] text-gray-600 mt-1">
              Os votos e acionamentos registrados aparecerão aqui em tempo real.
            </p>
          </div>
        ) : (
          events.map((evt) => {
            const badgeProps = getEventBadgeProps(evt);
            const subLabel = evt.subtext || (evt.type === 'RESET' ? 'Comando do sistema' : 'Voto computado');

            return (
              <div
                key={evt.id}
                className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-start justify-between gap-3 text-left transition-colors hover:bg-white/[0.04]"
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${badgeProps.bg}`}
                  >
                    {badgeProps.icon}
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-gray-200 leading-tight">
                      {evt.description}
                    </p>
                    <span className="text-[10px] text-gray-500 block mt-0.5">
                      {subLabel}
                    </span>
                  </div>
                </div>

                <span className="text-[11px] font-mono text-gray-400 whitespace-nowrap">
                  {evt.time}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default ActivityLog;
