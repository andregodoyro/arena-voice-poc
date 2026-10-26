import React from 'react';
import { StudioCanvas } from '../components/StudioCanvas';
import { StageHUD } from '../components/stage/StageHUD';

/**
 * StagePage — Superfície de Apresentação ao Público (Telão 3D).
 * 
 * Experiência pública limpa e cinematográfica:
 * - Voice Studio 3D com animações GSAP de 5 cadeiras;
 * - HUD cênico sem controles de depuração ou intervenções manuais de mouse;
 * - Reage exclusivamente a eventos do backend (SignalR) e snapshot inicial.
 */
export function StagePage({ chairs = [] }) {
  return (
    <main style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* 3D Canvas Layer — sem manipulador de clique manual */}
      <StudioCanvas chairs={chairs} />

      {/* 2D HUD Cênico Limpo */}
      <StageHUD chairs={chairs} />
    </main>
  );
}

export default StagePage;
