import React from 'react';
import { RotateCcw } from 'lucide-react';
import { OperatorHeader } from '../components/operator/OperatorHeader';
import { ScoreBoard } from '../components/operator/ScoreBoard';
import { ChairGrid } from '../components/operator/ChairGrid';
import { ActivityLog } from '../components/operator/ActivityLog';

/**
 * OperatorPage — Cockpit Operacional e Administrativo (Milestone 1C).
 * 
 * Superfície dedicada da mesa técnica:
 * - Monitora o estado de prontidão do sistema;
 * - Apresenta o placar ao vivo e estado individual das 5 cadeiras;
 * - Registra o histórico recente de eventos em tempo real;
 * - Reserva espaço para o controle autoritativo de Reset (Milestone 1D).
 */
export function OperatorPage({ chairs = [], connectionStatus, events = [], onResetArena }) {
  const [isResetting, setIsResetting] = React.useState(false);

  const handleReset = async () => {
    if (isResetting || !onResetArena) return;
    try {
      setIsResetting(true);
      await onResetArena();
    } catch (err) {
      console.error('[ArenaVoice] Falha ao solicitar reset da arena:', err);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#040408] text-white flex flex-col justify-between p-4 md:p-6 select-none space-y-6">
      {/* ── HEADER OPERACIONAL ──────────────────────────────────────────────── */}
      <OperatorHeader connectionStatus={connectionStatus} />

      {/* ── PAINEL OPERACIONAL PRINCIPAL ─────────────────────────────────────── */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Coluna Esquerda: Palco e Cadeiras (2/3 da largura) */}
        <section className="lg:col-span-2 space-y-6">
          {/* Placar Consolidado */}
          <ScoreBoard chairs={chairs} />

          {/* Grade de Monitoramento das 5 Cadeiras */}
          <ChairGrid chairs={chairs} />

          {/* Controle Autoritativo da Arena (Milestone 1D) */}
          <div className="glass-panel rounded-2xl p-4 md:p-5 border border-white/10 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">
                Controle da Arena
              </span>
              <p className="text-xs text-gray-400 mt-0.5">
                Retornar todas as cadeiras para a posição inicial
              </p>
            </div>

            <button
              onClick={handleReset}
              disabled={isResetting}
              className={`
                px-5 py-2.5 rounded-xl border font-semibold text-xs flex items-center gap-2 transition-all duration-300
                ${isResetting
                  ? 'border-amber-500/40 bg-amber-950/30 text-amber-300 cursor-wait opacity-80'
                  : 'border-white/10 hover:border-red-500/50 bg-white/5 hover:bg-red-950/40 text-gray-200 hover:text-white hover:shadow-lg hover:shadow-red-950/40 active:scale-95 cursor-pointer'
                }
              `}
              title="Solicitar reset autoritativo de todas as cadeiras ao backend"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin text-amber-400' : ''}`} />
              <span>{isResetting ? 'Resetando...' : 'Resetar Arena'}</span>
            </button>
          </div>
        </section>

        {/* Coluna Direita: Registro da Sessão (1/3 da largura) */}
        <aside className="lg:col-span-1 h-full">
          <ActivityLog events={events} />
        </aside>
      </main>

      {/* ── FOOTER DISCRETO ─────────────────────────────────────────────────── */}
      <footer className="text-center text-xs text-gray-600 py-2">
        Arena Voice · Plataforma de Apresentação e Avaliação de Inovação
      </footer>
    </div>
  );
}

export default OperatorPage;
