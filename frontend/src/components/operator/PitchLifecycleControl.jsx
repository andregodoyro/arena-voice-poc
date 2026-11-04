import React, { useState } from 'react';
import { 
  Play, 
  MessageSquare, 
  Vote, 
  CheckCircle, 
  RotateCcw, 
  Clock, 
  ArrowRight,
  AlertCircle,
  Sparkles,
  Lock
} from 'lucide-react';
import { useOperatorContext } from '../../contexts/OperatorContext';

const STAGES = [
  { code: 0, key: 'Waiting', label: 'Aguardando', icon: Clock },
  { code: 1, key: 'PitchRunning', label: 'Pitch ao Vivo', icon: Play },
  { code: 2, key: 'QA', label: 'Q&A', icon: MessageSquare },
  { code: 3, key: 'VotingOpen', label: 'Votação Aberta', icon: Vote },
  { code: 4, key: 'VotingClosed', label: 'Votação Encerrada', icon: Lock },
  { code: 5, key: 'Finished', label: 'Concluído', icon: CheckCircle },
];

const STAGE_ACTION_LABELS = {
  PitchRunning: 'Iniciar Pitch',
  QA: 'Iniciar Perguntas (Q&A)',
  VotingOpen: 'Abrir Votação',
  VotingClosed: 'Encerrar Votação',
  Finished: 'Concluir Apresentação',
  Waiting: 'Voltar p/ Aguardando',
};

export function PitchLifecycleControl() {
  const { pitchState, currentProject, transitionPitch, resetPitch } = useOperatorContext();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [actionError, setActionError] = useState(null);

  const currentStageName = pitchState?.stageName || pitchState?.stage || 'Waiting';
  const currentStageCode = typeof pitchState?.stageCode === 'number' ? pitchState.stageCode : 0;
  const allowedTransitions = pitchState?.allowedTransitions || [];

  const handleTransition = async (targetStage) => {
    if (isTransitioning) return;
    setActionError(null);
    setIsTransitioning(true);
    try {
      await transitionPitch(targetStage);
    } catch (err) {
      console.error('[PitchControl] Erro ao transicionar estágio:', err);
      setActionError(err.message || 'Falha ao executar transição.');
    } finally {
      setIsTransitioning(false);
    }
  };

  const handleResetPitch = async () => {
    if (isResetting) return;
    setActionError(null);
    setIsResetting(true);
    try {
      await resetPitch();
    } catch (err) {
      console.error('[PitchControl] Erro ao resetar pitch:', err);
      setActionError(err.message || 'Falha ao resetar pitch.');
    } finally {
      setIsResetting(false);
    }
  };

  // Determina a ação primária recomendada
  const primaryTarget = allowedTransitions[0] || null;

  return (
    <div className="glass-panel rounded-2xl p-5 border border-white/10 space-y-4">
      {/* Header do Controle de Pitch */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Pitch Lifecycle Engine
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-gray-300">
                Milestone 3B
              </span>
            </div>
            <h3 className="text-sm font-semibold text-white">
              {currentProject ? (
                <span>Projeto no Palco: <strong className="text-red-400">{currentProject.title}</strong></span>
              ) : (
                <span className="text-gray-400 italic">Nenhum projeto selecionado no palco</span>
              )}
            </h3>
          </div>
        </div>

        {/* Botão de Reset de Rodada */}
        <button
          onClick={handleResetPitch}
          disabled={isResetting || !currentProject}
          title="Reseta as cadeiras para 0° e reinicia o pitch em Aguardando"
          className={`
            px-3.5 py-1.5 rounded-xl border font-semibold text-xs flex items-center gap-1.5 transition-all
            ${isResetting
              ? 'border-amber-500/40 bg-amber-950/30 text-amber-300 cursor-wait'
              : !currentProject
              ? 'border-white/5 bg-white/5 text-gray-500 cursor-not-allowed'
              : 'border-white/10 hover:border-amber-500/40 bg-white/5 hover:bg-amber-950/30 text-gray-300 hover:text-amber-300 cursor-pointer active:scale-95'
            }
          `}
        >
          <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin text-amber-400' : ''}`} />
          <span>{isResetting ? 'Resetando...' : 'Reset Pitch'}</span>
        </button>
      </div>

      {/* Stepper Visual de 6 Estágios */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-1">
        {STAGES.map((s) => {
          const isCurrent = s.key === currentStageName || s.code === currentStageCode;
          const isPast = s.code < currentStageCode;
          const Icon = s.icon;

          return (
            <div
              key={s.key}
              className={`
                relative p-3 rounded-xl border flex flex-col items-center justify-center text-center transition-all duration-300
                ${isCurrent
                  ? 'bg-red-950/50 border-red-500/60 shadow-lg shadow-red-950/50 ring-1 ring-red-500/40 scale-[1.02]'
                  : isPast
                  ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400/80'
                  : 'bg-white/5 border-white/10 text-gray-500'
                }
              `}
            >
              <div className={`p-1.5 rounded-lg mb-1.5 ${
                isCurrent 
                  ? 'bg-red-500 text-white animate-pulse' 
                  : isPast 
                  ? 'bg-emerald-500/20 text-emerald-300' 
                  : 'bg-white/5 text-gray-500'
              }`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <span className={`text-[11px] font-bold ${isCurrent ? 'text-white' : isPast ? 'text-gray-300' : 'text-gray-400'}`}>
                {s.label}
              </span>
              <span className="text-[9px] font-mono text-gray-500 mt-0.5">
                Etapa {s.code}
              </span>
            </div>
          );
        })}
      </div>

      {/* Alerta de Erro de Transição */}
      {actionError && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-xs text-red-300">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Ações Operacionais de Transição */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/5">
        <div className="text-xs text-gray-400">
          Estágio Atual: <strong className="text-white uppercase font-mono">{currentStageName}</strong>
          {currentStageName === 'Finished' && (
            <span className="ml-2 text-emerald-400 font-medium">
              (Apresentação concluída — selecione o próximo projeto)
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {allowedTransitions.map((target, idx) => {
            const isPrimary = idx === 0;
            const actionText = STAGE_ACTION_LABELS[target] || `Ir para ${target}`;

            return (
              <button
                key={target}
                onClick={() => handleTransition(target)}
                disabled={isTransitioning || !currentProject}
                className={`
                  px-4 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer active:scale-95
                  ${isPrimary
                    ? 'border-red-500/50 bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-950/40'
                    : 'border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-gray-200'
                  }
                  ${isTransitioning || !currentProject ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <span>{actionText}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
