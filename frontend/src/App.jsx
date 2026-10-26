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

  // ── Session Event History ────────────────────────────────────────────────
  const [eventsHistory, setEventsHistory] = useState([]);

  /**
   * turnChair — Canonical Command to rotate a chair.
   * Invoked upon receiving SignalR events from backend.
   */
  const turnChair = useCallback((chairId, source = 'POC_HARDWARE') => {
    setChairs((prev) =>
      prev.map((c) => (c.id === chairId ? { ...c, isTurned: true } : c))
    );

    const now = new Date().toLocaleTimeString('pt-BR');
    const eventItem = {
      id: `${Date.now()}-${chairId}`,
      chairId,
      type: 'CHAIR_TURNED',
      description: `Cadeira #${chairId} virou`,
      source,
      time: now,
    };

    setEventsHistory((prev) => [eventItem, ...prev].slice(0, 15));

    console.log(`[ArenaVoice POC] Cadeira #${chairId} virou via [${source}] às ${now}`);
  }, []);

  /**
   * resetAllChairs — Resets all 5 chairs to facing away (isTurned: false).
   * Invoked strictly by SignalR ChairsReset broadcast listener.
   */
  const resetAllChairs = useCallback(() => {
    setChairs((prev) => prev.map((c) => ({ ...c, isTurned: false })));

    const now = new Date().toLocaleTimeString('pt-BR');
    const eventItem = {
      id: `${Date.now()}-reset`,
      type: 'RESET',
      description: 'Arena retornada à posição inicial',
      time: now,
    };
    setEventsHistory((prev) => [eventItem, ...prev].slice(0, 15));

    console.log('[ArenaVoice POC] Todas as cadeiras foram resetadas para o estado inicial');
  }, []);

  // ── Hook de Conexão SignalR ─────────────────────────────────────────────
  const { connectionStatus, backendUrl, reconnectVersion } = useSignalR({
    onChairTurned: (chairId, source) => turnChair(chairId, source),
    onChairsReset: resetAllChairs,
    initialBackendUrl: import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000',
  });

  /**
   * requestResetArena — Despacha comando autoritativo POST /api/reset ao backend.
   */
  const requestResetArena = useCallback(async () => {
    const response = await fetch(`${backendUrl}/api/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Falha no reset: HTTP ${response.status}`);
    }

    return response.json();
  }, [backendUrl]);

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
        element={<StagePage chairs={chairs} />}
      />
      <Route
        path="/operator"
        element={
          <OperatorPage
            chairs={chairs}
            connectionStatus={connectionStatus}
            events={eventsHistory}
            onResetArena={requestResetArena}
          />
        }
      />
      <Route path="*" element={<Navigate to="/stage" replace />} />
    </Routes>
  );
}
