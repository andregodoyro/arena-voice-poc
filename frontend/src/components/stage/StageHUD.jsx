import React from 'react';
import { Mic2, Flame, Radio } from 'lucide-react';

/**
 * StageHUD — Camada 2D cênica e pública do Telão 3D.
 * 
 * Foco estrito na experiência do público e da plateia:
 * - Identidade visual do evento ("Arena Voice");
 * - Placar consolidado de cadeiras viradas ("X / 5") com feedback luminoso;
 * - Sem botões interativos, sem Modo Dev, sem termos técnicos ou controles de rede.
 */
export function StageHUD({ chairs = [] }) {
  const turnedCount = chairs.filter((c) => c.isTurned).length;
  const allTurned = chairs.length > 0 && turnedCount === chairs.length;

  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-4 md:p-6 select-none">
      {/* ── TOP BAR CÊNICA ─────────────────────────────────────────────────── */}
      <header className="flex items-start justify-between gap-3">
        {/* Identidade Visual / Logo */}
        <div className="glass-panel rounded-2xl px-4 py-3 flex items-center gap-3 pointer-events-auto">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-amber-500 flex items-center justify-center shadow-lg shadow-red-500/40 flex-shrink-0">
            <Mic2 className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <p className="font-display text-xl md:text-2xl leading-none text-white tracking-wide">
              ARENA VOICE
            </p>
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest mt-0.5">
              Telão 3D
            </p>
          </div>
        </div>

        {/* Placar Cênico Consolidado */}
        <div className="glass-panel rounded-2xl px-5 py-3 flex items-center gap-3.5 border border-white/10 shadow-xl pointer-events-auto">
          <div className="text-right">
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
              Cadeiras Viradas
            </p>
            <p className="font-display text-3xl leading-none mt-0.5">
              <span className={turnedCount > 0 ? 'neon-text-red' : 'text-gray-500'}>
                {turnedCount}
              </span>
              <span className="text-gray-600 text-lg"> / {chairs.length}</span>
            </p>
          </div>

          <div
            className={`
              w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-500
              ${allTurned
                ? 'bg-gradient-to-r from-red-600 to-amber-500 shadow-lg shadow-red-500/50 scale-110'
                : turnedCount > 0
                  ? 'bg-red-950/80 border border-red-500/40'
                  : 'bg-gray-900/80 border border-gray-800'
              }
            `}
          >
            {allTurned ? (
              <Flame className="w-6 h-6 text-yellow-300 animate-bounce" />
            ) : (
              <Radio className={`w-5 h-5 ${turnedCount > 0 ? 'text-red-400' : 'text-gray-600'}`} />
            )}
          </div>
        </div>
      </header>

      {/* ── NENHUM ELEMENTO OPERACIONAL OU DE DEPURAÇÃO NO MEIO OU RODAPÉ ──── */}
    </div>
  );
}

export default StageHUD;
