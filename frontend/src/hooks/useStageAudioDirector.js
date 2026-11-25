import { useEffect, useRef } from 'react';
import { audioEngine } from '../audio/AudioEngine';
import { audioEventSubscriber } from '../audio/AudioEventSubscriber';
import { experienceEventBus, EXPERIENCE_EVENTS } from '../services/experienceEventBus';
import { getAccessToken, getBackendUrl } from '../api/apiClient';

/**
 * useStageAudioDirector — Diretor Cênico de Áudio Automatizado (Milestone 5B / 5D.4).
 *
 * Conecta o ExperienceEventBus ao AudioEngine via AudioEventSubscriber usando
 * a configuração persistida no backend (SoundLibrary + SoundEventMapping) com
 * fallback transparente para o catálogo local e síntese procedural.
 *
 * Também observa transições derivadas no Stage (/stage):
 * - Unanimidade (5/5 cadeiras viradas) -> EXPERIENCE_EVENTS.WINNER_REVEALED
 * - Contagem regressiva (últimos 15s / 5s críticos) -> EXPERIENCE_EVENTS.TIMER_URGENCY
 *
 * Os eventos primários (ChairPressed, ArenaReset, StageChanged, VotingStarted,
 * VotingFinished, ResultsCalculated, AudioConfigUpdated) são publicados no
 * ExperienceEventBus pelo OperatorContext a partir do SignalR autoritativo.
 */
export function useStageAudioDirector({ chairs = [], pitchState = null }) {
  const prevChairsRef = useRef(chairs);
  const lastTickedSecRef = useRef(null);
  const isInitialMountRef = useRef(true);

  // ── 0. Conecta AudioEventSubscriber e carrega configuração persistida ───────
  useEffect(() => {
    const detach = audioEventSubscriber.attach(experienceEventBus, audioEngine);
    audioEventSubscriber
      .loadConfig({
        apiBaseUrl: getBackendUrl(),
        token: getAccessToken(),
      })
      .catch(() => {});

    return () => {
      detach();
    };
  }, []);

  // ── 1. Detecção de Unanimidade (5 de 5 cadeiras viradas) ────────────────────
  useEffect(() => {
    if (isInitialMountRef.current) {
      prevChairsRef.current = chairs;
      isInitialMountRef.current = false;
      return;
    }

    const prevChairs = prevChairsRef.current || [];
    const prevTurnedCount = prevChairs.filter((c) => c.isTurned).length;
    const currTurnedCount = chairs.filter((c) => c.isTurned).length;

    if (currTurnedCount === 5 && prevTurnedCount < 5) {
      setTimeout(() => {
        experienceEventBus.emit(
          EXPERIENCE_EVENTS.WINNER_REVEALED,
          { turnedCount: currTurnedCount },
          { source: 'STAGE_DIRECTOR' }
        );
      }, 250);
    }

    prevChairsRef.current = chairs;
  }, [chairs]);

  // ── 2. Sincronização Acústica do Ticker de Contagem Regressiva (15s) ────────
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

    if (lastTickedSecRef.current !== remSec) {
      lastTickedSecRef.current = remSec;
      const isCritical = remSec <= 5;
      experienceEventBus.emit(
        EXPERIENCE_EVENTS.TIMER_URGENCY,
        { remainingSeconds: remSec, isCritical, stage: currentStage },
        { source: 'STAGE_DIRECTOR' }
      );
    }
  }, [pitchState?.remainingSeconds, pitchState?.isPaused, pitchState?.stage, pitchState?.stageName]);
}

export default useStageAudioDirector;
