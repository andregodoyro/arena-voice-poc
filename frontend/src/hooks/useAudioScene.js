import { useState, useEffect, useCallback } from 'react';
import { audioEngine } from '../audio/AudioEngine';

/**
 * useAudioScene — Hook reativo para consumo do motor de áudio Web Audio API.
 * 
 * Milestone 5A & 5B: Live Show Experience & Immersive Stage (ADR-026 & ADR-027)
 * Permite que componentes React no Stage e Operator controlem volume, mute e
 * disparem efeitos sonoros procedurais (Whoosh, VotingOpen, TimerTicker, VotingClosed,
 * Celebration e Reset) mantendo reatividade instantânea e zero downloads.
 */
export function useAudioScene() {
  const [audioState, setAudioState] = useState(() => audioEngine.getState());

  useEffect(() => {
    // Sincroniza estado com o singleton AudioEngine
    const unsubscribe = audioEngine.subscribe((nextState) => {
      setAudioState(nextState);
    });

    return () => unsubscribe();
  }, []);

  const unlock = useCallback(async () => {
    return await audioEngine.unlock();
  }, []);

  const setMasterVolume = useCallback((vol) => {
    audioEngine.setMasterVolume(vol);
  }, []);

  const setMute = useCallback((mute) => {
    audioEngine.setMute(mute);
  }, []);

  const playSfx = useCallback((name, options) => {
    return audioEngine.playSfx(name, options);
  }, []);

  const playProceduralTone = useCallback((freq, type, duration, gain) => {
    audioEngine.playProceduralTone(freq, type, duration, gain);
  }, []);

  const loadBuffer = useCallback(async (name, url) => {
    return await audioEngine.loadBuffer(name, url);
  }, []);

  // ── Dispatchers de Eventos Procedurais (Milestone 5B) ───────────────────────
  const playWhoosh = useCallback(() => {
    audioEngine.playWhoosh();
  }, []);

  const playVotingOpen = useCallback(() => {
    audioEngine.playVotingOpen();
  }, []);

  const playTimerTicker = useCallback((isCritical = false) => {
    audioEngine.playTimerTicker(isCritical);
  }, []);

  const playVotingClosed = useCallback(() => {
    audioEngine.playVotingClosed();
  }, []);

  const playCelebration = useCallback(() => {
    audioEngine.playCelebration();
  }, []);

  const playReset = useCallback(() => {
    audioEngine.playReset();
  }, []);

  return {
    isUnlocked: audioState.isUnlocked,
    isMuted: audioState.isMuted,
    masterVolume: audioState.masterVolume,
    sfxVolume: audioState.sfxVolume,
    ambientVolume: audioState.ambientVolume,
    ctxState: audioState.ctxState,
    unlock,
    setMasterVolume,
    setMute,
    playSfx,
    playProceduralTone,
    loadBuffer,
    // Eventos 5B
    playWhoosh,
    playVotingOpen,
    playTimerTicker,
    playVotingClosed,
    playCelebration,
    playReset,
  };
}

export default useAudioScene;
