import React from 'react';
import { Flame, Armchair } from 'lucide-react';

/**
 * ChairGrid — Representação visual do estado das 5 cadeiras no palco.
 */
export function ChairGrid({ chairs = [] }) {
  return (
    <div className="glass-panel rounded-2xl p-5 border border-white/10 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">
            Estado das Cadeiras
          </span>
          <p className="text-xs text-gray-300 font-medium mt-0.5">
            Monitoramento em tempo real do palco
          </p>
        </div>
        <span className="text-[11px] text-gray-500 font-mono">
          5 posições ativas
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {chairs.map((chair) => {
          const isTurned = chair.isTurned;

          return (
            <div
              key={chair.id}
              className={`
                rounded-2xl p-4 flex flex-col items-center justify-between gap-3 text-center
                border transition-all duration-300 relative overflow-hidden select-none
                ${
                  isTurned
                    ? 'bg-gradient-to-b from-red-950/70 via-red-900/40 to-black/80 border-red-500/60 shadow-lg shadow-red-950/40'
                    : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                }
              `}
            >
              {/* Overlay sutil para cadeira virada */}
              {isTurned && (
                <div
                  className="absolute inset-0 pointer-events-none opacity-20"
                  style={{
                    background: 'radial-gradient(circle at 50% 0%, #ef4444 0%, transparent 70%)',
                  }}
                />
              )}

              {/* Topo do Card: Número da Cadeira */}
              <div className="w-full flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-400 font-mono">
                  #{chair.id}
                </span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    isTurned ? 'bg-red-500 shadow-sm shadow-red-500' : 'bg-gray-700'
                  }`}
                />
              </div>

              {/* Ícone Central */}
              <div
                className={`
                  w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300
                  ${
                    isTurned
                      ? 'bg-gradient-to-br from-red-600 to-amber-500 text-white shadow-md shadow-red-500/40 scale-105'
                      : 'bg-white/5 text-gray-500 border border-white/5'
                  }
                `}
              >
                {isTurned ? (
                  <Flame className="w-6 h-6 animate-pulse" />
                ) : (
                  <Armchair className="w-6 h-6" />
                )}
              </div>

              {/* Nome e Status */}
              <div className="w-full">
                <p className="text-xs font-semibold text-white truncate mb-1.5">
                  {chair.name || `Cadeira ${chair.id}`}
                </p>

                <span
                  className={`
                    inline-block w-full py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider
                    border transition-colors duration-300
                    ${
                      isTurned
                        ? 'bg-red-500/20 text-red-300 border-red-500/40'
                        : 'bg-white/5 text-gray-500 border-white/5'
                    }
                  `}
                >
                  {isTurned ? 'Virada' : 'Em Espera'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ChairGrid;
