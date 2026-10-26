import React from 'react';
import { Flame, Users } from 'lucide-react';

/**
 * ScoreBoard — Placar operacional consolidado da rodada.
 */
export function ScoreBoard({ chairs = [] }) {
  const turnedCount = chairs.filter((c) => c.isTurned).length;
  const totalChairs = chairs.length || 5;
  const allTurned = turnedCount === totalChairs && totalChairs > 0;

  const getStatusText = () => {
    if (turnedCount === 0) return 'Aguardando votos da rodada';
    if (allTurned) return 'Banca unânime · Todas as cadeiras viradas';
    return 'Votação em andamento no palco';
  };

  return (
    <div className="glass-panel rounded-2xl p-5 border border-white/10 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">
            Placar da Arena
          </span>
          <p className="text-xs text-gray-300 font-medium mt-0.5">
            {getStatusText()}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {allTurned ? (
            <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-semibold flex items-center gap-1.5 animate-pulse">
              <Flame className="w-3.5 h-3.5" />
              100% dos Votos
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-lg bg-white/5 text-gray-400 border border-white/10 text-[11px] font-medium flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              {turnedCount} de {totalChairs} votos
            </span>
          )}
        </div>
      </div>

      {/* Número Principal e Barra de Progresso */}
      <div className="flex items-baseline gap-2 mb-3">
        <span className="font-display text-4xl md:text-5xl leading-none text-white font-bold">
          {turnedCount}
        </span>
        <span className="text-gray-500 text-xl font-medium">
          / {totalChairs} cadeiras
        </span>
      </div>

      {/* Barra de Progresso Segmentada em 5 Blocos */}
      <div className="grid grid-cols-5 gap-1.5 h-2.5 rounded-full overflow-hidden p-0.5 bg-black/40 border border-white/5">
        {chairs.map((chair, index) => {
          const isFilled = chair.isTurned;
          return (
            <div
              key={chair.id || index}
              className={`rounded-full transition-all duration-500 ${
                isFilled
                  ? 'bg-gradient-to-r from-red-600 to-amber-500 shadow-sm shadow-red-500/50'
                  : 'bg-white/10'
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}

export default ScoreBoard;
