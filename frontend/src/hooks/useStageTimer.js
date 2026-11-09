import { useState, useEffect } from 'react';

const STAGE_LABELS = {
  Waiting: 'Aguardando Início',
  PitchRunning: 'Pitch ao Vivo',
  QA: 'Perguntas e Respostas',
  VotingOpen: 'Votação Aberta',
  VotingClosed: 'Votação Encerrada',
  Finished: 'Apresentação Concluída',
};

/**
 * useStageTimer — Hook de cronômetro local de alta precisão ancorado no servidor.
 * 
 * Garante sincronização perfeita com o operador:
 * - Ancoragem em remainingSeconds emitido pelo servidor via SignalR;
 * - Respeita pausa instantaneamente (isPaused = true);
 * - Retoma sem descontinuidade ou saltos após resume;
 * - Reage imediatamente a extensões de tempo (+30s, +60s, +120s);
 * - Ticker suave a cada 200ms.
 */
export function useStageTimer(pitchState) {
  const [remaining, setRemaining] = useState(0);

  const stageName = pitchState?.stageName || pitchState?.stage || 'Waiting';
  const durationSeconds = Number(pitchState?.durationSeconds) || 0;
  const isPaused = Boolean(pitchState?.isPaused);
  const isTimedStage = durationSeconds > 0 && ['PitchRunning', 'QA', 'VotingOpen'].includes(stageName);

  useEffect(() => {
    if (!isTimedStage) {
      setRemaining(0);
      return;
    }

    // Âncora autoritativa fornecida pelo backend via SignalR ou snapshot
    const serverRemaining = typeof pitchState?.remainingSeconds === 'number'
      ? pitchState.remainingSeconds
      : durationSeconds;

    const anchorRemaining = Math.max(0, serverRemaining);
    const anchorTime = Date.now();

    const tick = () => {
      if (isPaused) {
        setRemaining(Math.max(0, Math.round(anchorRemaining)));
        return;
      }

      const elapsedSec = (Date.now() - anchorTime) / 1000;
      const currentRemaining = Math.max(0, Math.round(anchorRemaining - elapsedSec));
      setRemaining(currentRemaining);
    };

    tick();
    const intervalId = setInterval(tick, 200);

    return () => clearInterval(intervalId);
  }, [
    stageName,
    durationSeconds,
    isPaused,
    pitchState?.remainingSeconds,
    pitchState?.stageStartedAt,
    isTimedStage,
  ]);

  const safeRemaining = Math.max(0, remaining);
  const minutes = Math.floor(safeRemaining / 60);
  const seconds = safeRemaining % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const isUrgent = isTimedStage && safeRemaining > 0 && safeRemaining <= 15;
  const isExpired = isTimedStage && safeRemaining <= 0;
  const stageLabel = STAGE_LABELS[stageName] || stageName;

  return {
    remaining: safeRemaining,
    minutes,
    seconds,
    formattedTime,
    isTimedStage,
    isPaused,
    isUrgent,
    isExpired,
    stageName,
    stageLabel,
  };
}
