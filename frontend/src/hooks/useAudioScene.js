import { useState, useEffect, useCallback } from 'react';
import { audioEngine } from '../audio/AudioEngine';

/**
 * useAudioScene — Hook reativo para consumo do motor de áudio Web Audio API.
 * 
 * Milestone 5A: Audio Engine Infrastructure & Visual Rendering Foundation
 * Permite que componentes React no Stage e Operator controlem volume, mute e
 * disparem efeitos sonoros mantendo reatividade instantânea.
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
  };
}

export default useAudioScene;
