import React, { useState, useCallback, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { StagePage } from './pages/StagePage';
import { OperatorPage } from './pages/OperatorPage';
import { useSignalR } from './services/useSignalR';

/**
 * App — Orquestrador de Estado, Sincronização e Roteamento.
 * 
 * Mantém a única fonte de verdade compartilhada (snapshot + realtime SignalR)
 * e delega a renderização para as superfícies /stage e /operator via React Router.
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
  const [lastEvent, setLastEvent] = useState(null);

  /**
   * turnChair — Canonical Command to rotate a chair.
   * Can be invoked by SignalR (hardware) or manual Dev interactions.
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
   * resetAllChairs — Resets all 5 chairs to facing away (isTurned: false).
   */
  const resetAllChairs = useCallback(() => {
    setChairs((prev) => prev.map((c) => ({ ...c, isTurned: false })));
    setLastEvent(null);
    console.log('[ArenaVoice POC] Todas as cadeiras foram resetadas para o estado inicial');
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
   * turnAllChairs — Convenience function for full demo.
   */
  const turnAllChairs = useCallback(() => {
    setChairs((prev) => {
      const allTurned = prev.every((c) => c.isTurned);
      return prev.map((c) => ({ ...c, isTurned: !allTurned }));
    });
  }, []);

  // ── Hook de Conexão SignalR ─────────────────────────────────────────────
  const { connectionStatus, connectionError, backendUrl, reconnectVersion, setBackendUrl } = useSignalR({
    onChairTurned: (chairId, source) => turnChair(chairId, source),
    onChairsReset: resetAllChairs,
    initialBackendUrl: import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000',
  });

  useEffect(() => {
    let cancelled = false;

    async function loadArenaState() {
      try {
        const response = await fetch(`${backendUrl}/api/state`);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const state = await response.json();

        if (cancelled) {
          return;
        }

        setChairs((prev) =>
          prev.map((chair) => ({
            ...chair,
            isTurned: state.chairs?.[String(chair.id)] === true,
          }))
        );

        console.log(
          `[ArenaVoice POC] Estado inicial sincronizado: ${state.activeCount} cadeira(s) ativa(s)`
        );
      } catch (err) {
        if (!cancelled) {
          console.warn(
            '[ArenaVoice POC] Falha ao carregar estado inicial do backend:',
            err.message
          );
        }
      }
    }

    loadArenaState();

    return () => {
      cancelled = true;
    };
  }, [backendUrl, reconnectVersion]);

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/stage" replace />} />
      <Route
        path="/stage"
        element={
          <StagePage
            chairs={chairs}
            toggleChair={toggleChairManual}
            turnAll={turnAllChairs}
            resetAll={resetAllChairs}
            isDevMode={isDevMode}
            setIsDevMode={setIsDevMode}
            connectionStatus={connectionStatus}
            connectionError={connectionError}
            backendUrl={backendUrl}
            setBackendUrl={setBackendUrl}
            lastEvent={lastEvent}
            turnChair={turnChair}
          />
        }
      />
      <Route
        path="/operator"
        element={
          <OperatorPage
            connectionStatus={connectionStatus}
          />
        }
      />
      <Route path="*" element={<Navigate to="/stage" replace />} />
    </Routes>
  );
}
