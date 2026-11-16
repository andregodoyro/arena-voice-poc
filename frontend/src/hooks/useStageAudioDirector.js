import { useEffect, useRef } from 'react';
import { audioEngine } from '../audio/AudioEngine';

/**
 * useStageAudioDirector — Diretor Cênico de Áudio Automatizado (Milestone 5B, ADR-027).
 * 
 * Monitora transições de estado na superfície cênica (/stage) e dispara as assinaturas
 * acústicas procedurais correspondentes em perfeito sincronismo temporal com animações 3D:
 * 
 * 1. ChairTurned: detecta virada de qualquer cadeira (false -> true) e aciona Whoosh + Catraca.
 * 2. UnanimousApproval: detecta 5 de 5 cadeiras viradas e aciona Fanfarra Triunfal.
 * 3. ChairsReset: detecta comando de reset geral e aciona tom suave descendente.
 * 4. VotingOpen: detecta abertura do estágio de votação e aciona acorde moderno estéreo.
 * 5. Timer15Seconds: nos últimos 15 segundos, aciona o ticker sincopado a cada segundo (com taquicardia nos 5s finais).
 * 6. VotingClosed: detecta encerramento da votação e aciona o gongo ressonante profundo.
 * 
 * @param {Object} params
 * @param {Array} params.chairs - Lista autoritativa de cadeiras [{ id, isTurned, ... }]
 * @param {Object} params.pitchState - Estado autoritativo do pitch { stage, remainingSeconds, isPaused, ... }
 */
export function useStageAudioDirector({ chairs = [], pitchState = null }) {
  const prevChairsRef = useRef(chairs);
  const prevStageRef = useRef(pitchState?.stage || pitchState?.stageName || null);
  const lastTickedSecRef = useRef(null);
  const isInitialMountRef = useRef(true);

  // ── 1. Sincronização Acústica de Cadeiras (ChairTurned, Unanimidade, Reset) ──
  useEffect(() => {
    // Evita disparar áudios na primeira renderização / reidratação do snapshot
    if (isInitialMountRef.current) {
      prevChairsRef.current = chairs;
      return;
    }

    const prevChairs = prevChairsRef.current || [];
    const prevTurnedCount = prevChairs.filter((c) => c.isTurned).length;
    const currTurnedCount = chairs.filter((c) => c.isTurned).length;

    // Detecta se alguma cadeira acabou de virar
    const turnedNow = chairs.some((currChair) => {
      const prevChair = prevChairs.find((p) => p.id === currChair.id);
      return currChair.isTurned && !prevChair?.isTurned;
    });

    if (turnedNow) {
      audioEngine.playWhoosh();
    }

    // Detecta Unanimidade (5 de 5) recém alcançada
    if (currTurnedCount === 5 && prevTurnedCount < 5) {
      // Dispara celebração após breve intervalo do whoosh (250ms)
      setTimeout(() => {
        audioEngine.playCelebration();
      }, 250);
    }

    // Detecta Reset de cadeiras (todas desligadas após pelo menos uma ligada)
    if (currTurnedCount === 0 && prevTurnedCount > 0) {
      audioEngine.playReset();
    }

    prevChairsRef.current = chairs;
  }, [chairs]);

  // ── 2. Sincronização Acústica de Estágios do Pitch (VotingOpen, VotingClosed) ─
  useEffect(() => {
    const currentStage = pitchState?.stage || pitchState?.stageName || 'Waiting';

    if (isInitialMountRef.current) {
      prevStageRef.current = currentStage;
      isInitialMountRef.current = false;
      return;
    }

    const prevStage = prevStageRef.current;

    // Transição para Votação Aberta
    if (currentStage === 'VotingOpen' && prevStage !== 'VotingOpen') {
      audioEngine.playVotingOpen();
    }

    // Transição para Votação Encerrada ou Apresentação Concluída
    const wasActiveVoting = ['VotingOpen', 'PitchRunning', 'QA'].includes(prevStage);
    const isNowClosed = ['VotingClosed', 'Finished'].includes(currentStage);

    if (wasActiveVoting && isNowClosed) {
      audioEngine.playVotingClosed();
    }

    prevStageRef.current = currentStage;
  }, [pitchState?.stage, pitchState?.stageName]);

  // ── 3. Sincronização Acústica do Ticker de Contagem Regressiva (15s) ────────
  useEffect(() => {
    const currentStage = pitchState?.stage || pitchState?.stageName || 'Waiting';
    const isTimedStage = ['PitchRunning', 'QA', 'VotingOpen'].includes(currentStage);
    const isPaused = Boolean(pitchState?.isPaused);
    const remSec = typeof pitchState?.remainingSeconds === 'number'
      ? Math.round(pitchState.remainingSeconds)
      : null;

    if (!isTimedStage || isPaused || remSec === null || remSec <= 0 || remSec > 15) {
      lastTickedSecRef.current = null;
      return;
    }

    // Dispara apenas uma vez por segundo no decremento
    if (lastTickedSecRef.current !== remSec) {
      lastTickedSecRef.current = remSec;
      const isCritical = remSec <= 5;
      audioEngine.playTimerTicker(isCritical);
    }
  }, [pitchState?.remainingSeconds, pitchState?.isPaused, pitchState?.stage, pitchState?.stageName]);
}

export default useStageAudioDirector;
