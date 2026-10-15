import React, { useState, useCallback } from 'react';
import { StudioCanvas } from './components/StudioCanvas';
import { HUD } from './components/HUD';

/**
 * App — Root component for Arena Voice POC.
 * 
 * Architectural Decoupling:
 * Separates Event Sources (Mouse/Dev vs SignalR/Hardware) from Chair State & Animation.
 * The 3D animation receives only the state update and triggers GSAP accordingly.
 */
export default function App() {
  // ── Global Chair State ───────────────────────────────────────────────────
  const [chairs, setChairs] = useState([
    { id: 1, name: 'Técnico 1', isTurned: false },
    { id: 2, name: 'Técnico 2', isTurned: false },
    { id: 3, name: 'Técnico 3', isTurned: false },
    { id: 4, name: 'Técnico 4', isTurned: false },
    { id: 5, name: 'Técnico 5', isTurned: false },
  ]);

  // ── Mode & Audit State ───────────────────────────────────────────────────
  const [isDevMode, setIsDevMode] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('DESCONECTADO');
  const [lastEvent, setLastEvent] = useState(null);

  /**
   * turnChair — Canonical Command to rotate a chair.
   * Agnostic to the event source. Can be called by:
   * - SignalR listener (POC Hardware Mode)
   * - Mouse click on 3D mesh (Dev Mode)
   * - HUD button (Dev Mode)
   */
  const turnChair = useCallback((chairId, source = 'POC_HARDWARE') => {
    setChairs((prev) =>
      prev.map((c) => (c.id === chairId ? { ...c, isTurned: true } : c))
    );

    const now = new Date().toLocaleTimeString('pt-BR');
    setLastEvent({
      chairId,
      source,
      time: now,
    });

    console.log(`[ArenaVoice POC] Cadeira #${chairId} virou via [${source}] às ${now}`);
  }, []);

  /**
   * toggleChairManual — Used strictly by Dev Mode UI/mouse interactions.
   * If Dev Mode is disabled, manual clicks are ignored to guarantee
   * that only physical hardware/SignalR can control the chairs.
   */
  const toggleChairManual = useCallback((chairId) => {
    if (!isDevMode) {
      console.warn(`[ArenaVoice POC] Clique manual na cadeira #${chairId} ignorado (Modo Dev DESATIVADO)`);
      return;
    }

    setChairs((prev) =>
      prev.map((c) => (c.id === chairId ? { ...c, isTurned: !c.isTurned } : c))
    );

    const now = new Date().toLocaleTimeString('pt-BR');
    setLastEvent({
      chairId,
      source: 'DEV_MANUAL',
      time: now,
    });
  }, [isDevMode]);

  /**
   * resetAllChairs — Resets all 5 chairs to facing away (isTurned: false).
   */
  const resetAllChairs = useCallback(() => {
    setChairs((prev) => prev.map((c) => ({ ...c, isTurned: false })));
    setLastEvent(null);
    console.log('[ArenaVoice POC] Todas as cadeiras foram resetadas para o estado inicial');
  }, []);

  /**
   * turnAllChairs — Convenience function for full demo.
   */
  const turnAllChairs = useCallback(() => {
    setChairs((prev) => {
      const allTurned = prev.every((c) => c.isTurned);
      return prev.map((c) => ({ ...c, isTurned: !allTurned }));
    });
  }, []);

  return (
    <main style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* 3D Canvas Layer */}
      <StudioCanvas chairs={chairs} toggleChair={toggleChairManual} />

      {/* 2D HUD Layer with decoupled control */}
      <HUD
        chairs={chairs}
        toggleChair={toggleChairManual}
        turnAll={turnAllChairs}
        resetAll={resetAllChairs}
        isDevMode={isDevMode}
        setIsDevMode={setIsDevMode}
        connectionStatus={connectionStatus}
        lastEvent={lastEvent}
        turnChair={turnChair}
      />
    </main>
  );
}
