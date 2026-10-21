import React from 'react';
import { StudioCanvas } from '../components/StudioCanvas';
import { HUD } from '../components/HUD';

/**
 * StagePage — Superfície de Apresentação ao Público (Telão 3D).
 * 
 * Nesta etapa de transição, preserva o comportamento visual e interativo
 * do Voice Studio existente, preparando o terreno para a limpeza subsequente do HUD.
 */
export function StagePage({
  chairs,
  toggleChair,
  turnAll,
  resetAll,
  isDevMode,
  setIsDevMode,
  connectionStatus,
  connectionError,
  backendUrl,
  setBackendUrl,
  lastEvent,
  turnChair,
}) {
  return (
    <main style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* 3D Canvas Layer */}
      <StudioCanvas chairs={chairs} toggleChair={toggleChair} />

      {/* 2D HUD Layer */}
      <HUD
        chairs={chairs}
        toggleChair={toggleChair}
        turnAll={turnAll}
        resetAll={resetAll}
        isDevMode={isDevMode}
        setIsDevMode={setIsDevMode}
        connectionStatus={connectionStatus}
        connectionError={connectionError}
        backendUrl={backendUrl}
        setBackendUrl={setBackendUrl}
        lastEvent={lastEvent}
        turnChair={turnChair}
      />
    </main>
  );
}

export default StagePage;
