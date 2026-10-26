import React from 'react';
import { History, Clock, RotateCcw, Flame } from 'lucide-react';

/**
 * ActivityLog — Linha do tempo de eventos da sessão em linguagem de produto.
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
            const isReset = evt.type === 'RESET';

            return (
              <div
                key={evt.id}
                className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-start justify-between gap-3 text-left transition-colors hover:bg-white/[0.04]"
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      isReset
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}
                  >
                    {isReset ? (
                      <RotateCcw className="w-3.5 h-3.5" />
                    ) : (
                      <Flame className="w-3.5 h-3.5" />
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-gray-200 leading-tight">
                      {evt.description}
                    </p>
                    <span className="text-[10px] text-gray-500 block mt-0.5">
                      {isReset ? 'Comando do sistema' : 'Voto computado'}
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
