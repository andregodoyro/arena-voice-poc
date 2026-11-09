import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause,
  MessageSquare, 
  Vote, 
  CheckCircle, 
  RotateCcw, 
  Clock, 
  ArrowRight,
  AlertCircle,
  Sparkles,
  Lock,
  Unlock,
  Plus
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

const formatTime = (totalSeconds) => {
  const safe = Math.max(0, Math.floor(totalSeconds || 0));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export function PitchLifecycleControl() {
  const { 
    pitchState, 
    currentProject, 
    transitionPitch, 
    resetPitch,
    pausePitchTimer,
    resumePitchTimer,
    adjustPitchTimer 
  } = useOperatorContext();

  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isTimerActionLoading, setIsTimerActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [displayRemaining, setDisplayRemaining] = useState(0);

  const currentStageName = pitchState?.stageName || pitchState?.stage || 'Waiting';
  const currentStageCode = typeof pitchState?.stageCode === 'number' ? pitchState.stageCode : 0;
  const allowedTransitions = pitchState?.allowedTransitions || [];
  const durationSeconds = pitchState?.durationSeconds || 0;
  const isPaused = Boolean(pitchState?.isPaused);
  const isVotingAllowed = Boolean(pitchState?.isVotingAllowed);
  const isTimedStage = durationSeconds > 0 && currentStageCode >= 1 && currentStageCode <= 3;

  // ── TICKER DE ALTA PRECISÃO SINCRONIZADO COM O SERVIDOR ─────────────────
  useEffect(() => {
    if (!isTimedStage) {
      setDisplayRemaining(0);
      return;
    }

    const tick = () => {
      if (isPaused) {
        setDisplayRemaining(Math.max(0, Math.round(pitchState?.remainingSeconds || 0)));
        return;
      }
      if (!pitchState?.stageStartedAt) {
        setDisplayRemaining(durationSeconds);
        return;
      }

      const startedMs = new Date(pitchState.stageStartedAt).getTime();
      const nowMs = Date.now();
      const elapsedSec = Math.max(0, (nowMs - startedMs) / 1000);
      const rem = Math.max(0, durationSeconds - elapsedSec);
      setDisplayRemaining(Math.round(rem));
    };

    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [pitchState?.stageStartedAt, durationSeconds, isPaused, pitchState?.remainingSeconds, isTimedStage]);

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

  const handleTogglePause = async () => {
    if (isTimerActionLoading || !isTimedStage) return;
    setActionError(null);
    setIsTimerActionLoading(true);
    try {
      if (isPaused) {
        await resumePitchTimer();
      } else {
        await pausePitchTimer();
      }
    } catch (err) {
      console.error('[PitchControl] Erro ao pausar/retomar timer:', err);
      setActionError(err.message || 'Falha no comando de cronômetro.');
    } finally {
      setIsTimerActionLoading(false);
    }
  };

  const handleAddTime = async (seconds) => {
    if (isTimerActionLoading || !isTimedStage) return;
    setActionError(null);
    setIsTimerActionLoading(true);
    try {
      await adjustPitchTimer(seconds);
    } catch (err) {
      console.error('[PitchControl] Erro ao adicionar tempo:', err);
      setActionError(err.message || 'Falha ao adicionar tempo.');
    } finally {
      setIsTimerActionLoading(false);
    }
  };

  const isExpired = isTimedStage && displayRemaining <= 0;
  const isUrgent = isTimedStage && displayRemaining > 0 && displayRemaining <= 20;

  return (
    <div className="glass-panel rounded-2xl p-5 border border-white/10 space-y-4">
      {/* ── HEADER DO CONTROLE DE PITCH ───────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Pitch Lifecycle & Timers
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-gray-300">
                Milestone 3C
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

      {/* ── PAINEL DE CRONÔMETRO OPERACIONAL E LOCKOUT (MILESTONE 3C) ────── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3.5 rounded-2xl bg-black/30 border border-white/5 items-center">
        {/* Mostrador Numérico do Cronômetro */}
        <div className="md:col-span-5 flex items-center gap-3.5">
          <div className={`
            p-3 rounded-2xl border flex items-center justify-center transition-all duration-300
            ${isExpired
              ? 'bg-red-950/80 border-red-500 text-red-400 animate-pulse'
              : isPaused
              ? 'bg-amber-950/60 border-amber-500/60 text-amber-300'
              : isUrgent
              ? 'bg-orange-950/60 border-orange-500/60 text-orange-400 animate-pulse'
              : isTimedStage
              ? 'bg-white/5 border-white/10 text-white'
              : 'bg-white/5 border-white/5 text-gray-500'
            }
          `}>
            <Clock className="w-6 h-6" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                {isTimedStage ? `Tempo da Etapa (${currentStageName})` : 'Cronômetro'}
              </span>
              {isPaused && (
                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                  Pausado
                </span>
              )}
              {isExpired && (
                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40">
                  Esgotado
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-2">
              <span className={`
                font-mono text-3xl font-extrabold tracking-tight leading-none
                ${isExpired ? 'text-red-400' : isPaused ? 'text-amber-300' : isUrgent ? 'text-orange-400' : 'text-white'}
              `}>
                {isTimedStage ? formatTime(displayRemaining) : '--:--'}
              </span>
              {isTimedStage && (
                <span className="text-xs font-mono text-gray-400">
                  / {formatTime(durationSeconds)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Controles do Timer (Play/Pause e Add Time) */}
        <div className="md:col-span-4 flex flex-wrap items-center gap-1.5">
          {/* Botão Play / Pause Toggle */}
          <button
            onClick={handleTogglePause}
            disabled={!isTimedStage || isTimerActionLoading}
            title={isPaused ? 'Retomar contagem do timer' : 'Pausar contagem do timer'}
            className={`
              px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all
              ${!isTimedStage
                ? 'opacity-40 border-white/5 bg-white/5 text-gray-500 cursor-not-allowed'
                : isPaused
                ? 'border-emerald-500/50 bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/40 cursor-pointer active:scale-95'
                : 'border-amber-500/40 bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 cursor-pointer active:scale-95'
              }
            `}
          >
            {isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5 fill-current" />}
            <span>{isPaused ? 'Retomar' : 'Pausar'}</span>
          </button>

          {/* Atalhos Rápidos de Extensão de Tempo */}
          <button
            onClick={() => handleAddTime(30)}
            disabled={!isTimedStage || isTimerActionLoading}
            title="Adiciona +30 segundos à rodada ativa"
            className="px-2.5 py-1.5 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-xs font-mono font-semibold text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-95 flex items-center gap-0.5"
          >
            <Plus className="w-3 h-3 text-gray-400" />30s
          </button>

          <button
            onClick={() => handleAddTime(60)}
            disabled={!isTimedStage || isTimerActionLoading}
            title="Adiciona +60 segundos (1 minuto) à rodada ativa"
            className="px-2.5 py-1.5 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-xs font-mono font-semibold text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-95 flex items-center gap-0.5"
          >
            <Plus className="w-3 h-3 text-gray-400" />60s
          </button>

          <button
            onClick={() => handleAddTime(120)}
            disabled={!isTimedStage || isTimerActionLoading}
            title="Adiciona +120 segundos (2 minutos) à rodada ativa"
            className="px-2.5 py-1.5 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-xs font-mono font-semibold text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-95 flex items-center gap-0.5"
          >
            <Plus className="w-3 h-3 text-gray-400" />120s
          </button>
        </div>

        {/* Indicador de Status do Hardware (Lockout) */}
        <div className="md:col-span-3 flex justify-end">
          <div className={`
            px-3 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 transition-all
            ${isVotingAllowed
              ? 'bg-emerald-950/50 border-emerald-500/60 text-emerald-300 shadow-md shadow-emerald-950/50'
              : isPaused
              ? 'bg-amber-950/40 border-amber-500/40 text-amber-300'
              : 'bg-white/5 border-white/10 text-gray-400'
            }
          `}>
            {isVotingAllowed ? (
              <>
                <Unlock className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>VOTAÇÃO LIBERADA</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 text-gray-400" />
                <span>HARDWARE TRAVADO</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── STEPPER VISUAL DE 6 ESTÁGIOS ─────────────────────────────────── */}
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

      {/* Alerta de Erro de Transição / Timer */}
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
