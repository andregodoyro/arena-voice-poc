import React, { useEffect, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useAudioScene } from '../../hooks/useAudioScene';

/**
 * AudioUnlockOverlay — Banner não-obstrusivo para desbloqueio do áudio cênico.
 * 
 * Milestone 5A: Audio Engine Infrastructure & Visual Rendering Foundation
 * Conformidade com as políticas rígidas de Autoplay dos navegadores modernos:
 * - O áudio da Web Audio API exige interação humana inicial para transicionar de 'suspended' para 'running';
 * - Exibe um pill sutil e elegante no canto superior do telão;
 * - Registra listener global passivo (qualquer clique/toque na tela ativa o som sem interrupções);
 * - Fica 100% invisível assim que o áudio é ativado.
 */
export function AudioUnlockOverlay() {
  const { isUnlocked, isMuted, unlock } = useAudioScene();
  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    if (isUnlocked) return;

    // Listener passivo global: qualquer clique ou tecla na janela desbloqueia o áudio suavemente
    const handleGlobalInteraction = async () => {
      setHasInteracted(true);
      await unlock();
    };

    window.addEventListener('pointerdown', handleGlobalInteraction, { once: true });
    window.addEventListener('keydown', handleGlobalInteraction, { once: true });

    return () => {
      window.removeEventListener('pointerdown', handleGlobalInteraction);
      window.removeEventListener('keydown', handleGlobalInteraction);
    };
  }, [isUnlocked, unlock]);

  if (isUnlocked) {
    return null; // Zero presença visual no telão após o desbloqueio
  }

  return (
    <aside
      aria-label="Controle de Áudio Cênico"
      style={{
        position: 'absolute',
        top: '1.25rem',
        right: '1.5rem',
        zIndex: 50,
        pointerEvents: 'auto',
      }}
    >
      <button
        onClick={async () => {
          setHasInteracted(true);
          await unlock();
        }}
        type="button"
        className="flex items-center gap-2.5 px-4 py-2 rounded-full text-xs font-semibold tracking-wider uppercase transition-all duration-300 shadow-2xl cursor-pointer"
        style={{
          background: 'rgba(15, 23, 42, 0.85)',
          color: '#f8fafc',
          border: '1px solid rgba(245, 158, 11, 0.6)',
          boxShadow: '0 0 20px rgba(245, 158, 11, 0.35)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <span
          className="w-2.5 h-2.5 rounded-full animate-ping"
          style={{ background: '#f59e0b' }}
        />
        <Volume2 className="w-4 h-4 text-amber-400" />
        <span>Ativar Áudio Cênico</span>
      </button>
    </aside>
  );
}

export default AudioUnlockOverlay;
