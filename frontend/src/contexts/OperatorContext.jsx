import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { projectsApi } from '../api/projectsApi';
import { eventsApi } from '../api/eventsApi';
import { isCurrentProject } from '../utils/projectStatus';
import { useSignalR } from '../services/useSignalR';
import { getBackendUrl } from '../api/apiClient';

const OperatorContext = createContext(null);

const DEFAULT_CHAIRS = [
  { id: 1, name: 'Técnico 1', isTurned: false },
  { id: 2, name: 'Técnico 2', isTurned: false },
  { id: 3, name: 'Técnico 3', isTurned: false },
  { id: 4, name: 'Técnico 4', isTurned: false },
  { id: 5, name: 'Técnico 5', isTurned: false },
];

/**
 * OperatorProvider — Provedor de Estado Operacional e Integração Realtime (Milestone 2C.5).
 * 
 * Centraliza a única conexão SignalR do sistema e orquestra o estado autoritativo:
 * - ADR-001 (Backend Authoritative): O backend dita o estado final em todas as circunstâncias.
 * - ADR-002 (Snapshot First): O estado inicial e o resync pós-reconexão vêm do snapshot REST.
 * - ADR-003 (ActiveContext): O projeto e evento ativos são refletidos ponta a ponta.
 * - ADR-004 (Rich SignalR Payloads): Consome os metadados ricos enviados pelo Hub.
 */
export function OperatorProvider({ children }) {
  // ── Estado Institucional e de Projetos (Fase 2) ──────────────────────────
  const [currentEvent, setCurrentEvent] = useState(null);
  const [currentProject, setCurrentProject] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Estado das Cadeiras e Histórico Cênico (Fase 1 / 2C.5.4) ──────────────
  const [chairs, setChairs] = useState(DEFAULT_CHAIRS);
  const [eventsHistory, setEventsHistory] = useState([]);
  const [isResyncing, setIsResyncing] = useState(false);

  // ── Ações de Cadeiras (Fase 1 / Realtime) ─────────────────────────────────
  const turnChair = useCallback((chairId, source = 'SIGNALR') => {
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

    setEventsHistory((prev) => [eventItem, ...prev].slice(0, 20));
  }, []);

  const resetAllChairs = useCallback(() => {
    setChairs((prev) => prev.map((c) => ({ ...c, isTurned: false })));

    const now = new Date().toLocaleTimeString('pt-BR');
    const eventItem = {
      id: `${Date.now()}-reset`,
      type: 'RESET',
      description: 'Arena retornada à posição inicial',
      time: now,
    };

    setEventsHistory((prev) => [eventItem, ...prev].slice(0, 20));
  }, []);

  // ── Busca de Snapshot Autoritativo (ADR-002) ─────────────────────────────
  const fetchOperationalData = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const [stateData, projectsData, eventData] = await Promise.all([
        eventsApi.getState(),
        projectsApi.getProjects(true),
        eventsApi.getCurrentEvent(),
      ]);

      const projectList = Array.isArray(projectsData) ? projectsData : [];
      setProjects(projectList);
      setCurrentEvent(eventData || stateData?.currentEvent || null);

      if (stateData?.currentProject) {
        setCurrentProject(stateData.currentProject);
      } else {
        setCurrentProject(projectList.find((p) => isCurrentProject(p.status)) || null);
      }

      // Sincroniza estado das cadeiras com o snapshot autoritativo
      if (stateData?.chairs) {
        setChairs((prev) =>
          prev.map((chair) => ({
            ...chair,
            isTurned: stateData.chairs[String(chair.id)] === true,
          }))
        );
      }

      setError(null);
    } catch (err) {
      console.error('[OperatorContext] Falha ao sincronizar snapshot operacional:', err);
      setError(err.message || 'Erro ao comunicar com o servidor');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    await fetchOperationalData(true);
  }, [fetchOperationalData]);

  // ── Sincronização em Tempo Real (Milestone 2C.5.2: Projetos) ─────────────
  const handleCurrentProjectChanged = useCallback((payload) => {
    if (!payload?.project) return;
    const newCurrent = payload.project;
    const prevProject = payload.previousProject;

    console.log('[OperatorContext] Sincronizando novo projeto ativo no palco:', newCurrent.title);

    // 1. Aceleração visual imediata (Reatividade instantânea)
    setCurrentProject(newCurrent);
    setProjects((prevList) => {
      return prevList.map((p) => {
        if (p.id === newCurrent.id) {
          return { ...p, ...newCurrent, status: 1 };
        }
        if (prevProject && p.id === prevProject.id) {
          return { ...p, ...prevProject, status: 2 };
        }
        if (p.status === 1 && p.id !== newCurrent.id) {
          return { ...p, status: 2 };
        }
        return p;
      });
    });

    // 2. Re-hidratação autoritativa silenciosa em background (ADR-002)
    fetchOperationalData(false);
  }, [fetchOperationalData]);

  // ── Sincronização em Tempo Real (Milestone 2C.5.3: Branding) ──────────────
  const handleEventBrandingUpdated = useCallback((payload) => {
    if (!payload?.branding) return;

    console.log('[OperatorContext] Sincronizando identidade visual do evento:', payload.branding);

    // 1. Aceleração visual imediata
    setCurrentEvent((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        branding: {
          ...prev.branding,
          ...payload.branding,
        },
      };
    });

    // 2. Re-hidratação autoritativa silenciosa em background (ADR-002)
    fetchOperationalData(false);
  }, [fetchOperationalData]);

  // ── Reconexão e Resync Hardening (Milestone 2C.5.5) ──────────────────────
  const handleReconnected = useCallback(async () => {
    console.log('[OperatorContext] Reconexão detectada. Executando resync autoritativo completo...');
    setIsResyncing(true);
    try {
      await fetchOperationalData(false);
    } catch (err) {
      console.error('[OperatorContext] Falha no resync pós-reconexão:', err);
    } finally {
      setIsResyncing(false);
    }
  }, [fetchOperationalData]);

  // ── Instância Única de SignalR (Milestone 2C.5.1: Foundation) ───────────
  const { connectionStatus, connectionError, backendUrl } = useSignalR({
    onChairTurned: (chairId, source) => turnChair(chairId, source),
    onChairsReset: resetAllChairs,
    onCurrentProjectChanged: handleCurrentProjectChanged,
    onEventBrandingUpdated: handleEventBrandingUpdated,
    onReconnected: handleReconnected,
    initialBackendUrl: getBackendUrl(),
  });

  // ── Despacho Autoritativo de Reset de Arena ──────────────────────────────
  const requestResetArena = useCallback(async () => {
    const baseUrl = getBackendUrl().replace(/\/+$/, '');
    const response = await fetch(`${baseUrl}/api/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Falha no reset: HTTP ${response.status}`);
    }

    return response.json();
  }, []);

  // ── Inicialização do Snapshot na Montagem ────────────────────────────────
  useEffect(() => {
    fetchOperationalData(true);
  }, [fetchOperationalData]);

  const value = {
    // Entidades de Negócio
    currentEvent,
    currentProject,
    projects,
    loading,
    error,
    refresh,

    // Hardware e Sessão da Arena
    chairs,
    eventsHistory,
    turnChair,
    resetAllChairs,
    requestResetArena,

    // Conexão e Resync
    connectionStatus,
    connectionError,
    isResyncing,
    backendUrl,
  };

  return (
    <OperatorContext.Provider value={value}>
      {children}
    </OperatorContext.Provider>
  );
}

/**
 * Hook para consumo do contexto operacional unificado.
 */
export function useOperatorContext() {
  const context = useContext(OperatorContext);
  if (!context) {
    throw new Error('useOperatorContext deve ser utilizado dentro de um OperatorProvider');
  }
  return context;
}

export default OperatorContext;
