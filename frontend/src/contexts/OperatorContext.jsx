import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { projectsApi } from '../api/projectsApi';
import { eventsApi } from '../api/eventsApi';
import { pitchApi } from '../api/pitchApi';
import { roundsApi } from '../api/roundsApi';
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
 * OperatorProvider — Provedor de Estado Operacional e Integração Realtime (Milestone 2C.5 / 3A).
 * 
 * Centraliza a única conexão SignalR do sistema e orquestra o estado autoritativo:
 * - ADR-001 (Backend Authoritative): O backend dita o estado final em todas as circunstâncias.
 * - ADR-002 (Snapshot First): O estado inicial e o resync pós-reconexão vêm do snapshot REST.
 * - ADR-003 (ActiveContext): O projeto e evento ativos são refletidos ponta a ponta.
 * - ADR-004 (Rich SignalR Payloads): Consome os metadados ricos enviados pelo Hub.
 * - Milestone 3A (Event Lifecycle): Gerencia o catálogo de eventos e a reatividade de ativação.
 * - Milestone 3D (Round History): Preserva o histórico das rodadas arquivadas em memória.
 */
export function OperatorProvider({ children }) {
  // ── Estado Institucional e de Projetos (Fase 2 & Fase 3A) ──────────────────
  const [currentEvent, setCurrentEvent] = useState(null);
  const [currentProject, setCurrentProject] = useState(null);
  const [projects, setProjects] = useState([]);
  const [eventsList, setEventsList] = useState([]);
  const [pitchState, setPitchState] = useState(null);
  const [rounds, setRounds] = useState([]);
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

  // ── Busca de Snapshot Autoritativo (ADR-002 / Milestone 3A) ──────────────
  const fetchOperationalData = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const [stateData, projectsData, eventData, allEvents] = await Promise.all([
        eventsApi.getState(),
        projectsApi.getProjects(true),
        eventsApi.getCurrentEvent(),
        eventsApi.getEvents().catch(() => []),
      ]);

      const projectList = Array.isArray(projectsData) ? projectsData : [];
      setProjects(projectList);
      setCurrentEvent(eventData || stateData?.currentEvent || null);
      setEventsList(Array.isArray(allEvents) ? allEvents : []);

      if (stateData?.currentProject) {
        setCurrentProject(stateData.currentProject);
      } else {
        setCurrentProject(projectList.find((p) => isCurrentProject(p.status)) || null);
      }

      // Sincroniza máquina de estados do pitch (Milestone 3B)
      if (stateData?.pitchState) {
        setPitchState(stateData.pitchState);
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

      // Sincroniza histórico de rodadas (Milestone 3D)
      try {
        const roundsData = await roundsApi.getRounds();
        setRounds(Array.isArray(roundsData) ? roundsData : []);
      } catch (rErr) {
        console.warn('[OperatorContext] Aviso ao buscar histórico de rodadas:', rErr);
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
    if (!payload) return;
    const newCurrent = payload.project;
    const prevProject = payload.previousProject;

    console.log('[OperatorContext] Sincronizando novo projeto ativo no palco:', newCurrent?.title || 'Nenhum');

    // 1. Aceleração visual imediata (Reatividade instantânea)
    setCurrentProject(newCurrent || null);
    if (newCurrent) {
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
    }

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

  // ── Sincronização em Tempo Real (Milestone 3A: Mudança de Evento Ativo) ──
  const handleActiveEventChanged = useCallback((payload) => {
    if (!payload?.event) return;

    console.log('[OperatorContext] Sincronizando mudança de evento ativo na arena:', payload.event.title);

    // 1. Aceleração visual imediata
    setCurrentEvent(payload.event);
    setCurrentProject(null); // Projeto no palco é resetado para a nova fila

    // 2. Re-hidratação autoritativa completa em background
    fetchOperationalData(false);
  }, [fetchOperationalData]);

  // ── Sincronização em Tempo Real (Milestone 3B: Pitch Lifecycle Engine) ──
  const handlePitchStageChanged = useCallback((payload) => {
    if (!payload) return;
    const stageName = payload.stage || payload.currentStage;
    console.log('[OperatorContext] Sincronizando novo estágio do pitch:', stageName);

    setPitchState((prev) => ({
      ...prev,
      stage: stageName,
      stageName: stageName,
      stageCode: payload.stageCode ?? prev?.stageCode,
      stageStartedAt: payload.stageStartedAt ?? new Date().toISOString(),
      durationSeconds: payload.durationSeconds ?? prev?.durationSeconds,
      remainingSeconds: payload.remainingSeconds ?? prev?.remainingSeconds,
      isPaused: payload.isPaused ?? false,
      isExpired: payload.isExpired ?? false,
      isVotingAllowed: payload.isVotingAllowed ?? false,
      projectId: payload.projectId || prev?.projectId,
    }));

    if (stageName === 'Waiting' || payload.source === 'RESET') {
      setChairs((prevChairs) => prevChairs.map((c) => ({ ...c, isTurned: false })));
    }

    // Re-hidratação silenciosa em background (para allowedTransitions e status)
    fetchOperationalData(false);
  }, [fetchOperationalData]);

  // ── Sincronização em Tempo Real (Milestone 3C: Timers, Pause, Resume, AddTime) ──
  const handlePitchTimerUpdated = useCallback((payload) => {
    if (!payload) return;
    console.log('[OperatorContext] Sincronizando atualização do timer do pitch:', payload);

    setPitchState((prev) => ({
      ...prev,
      durationSeconds: payload.durationSeconds ?? prev?.durationSeconds,
      remainingSeconds: payload.remainingSeconds ?? prev?.remainingSeconds,
      isPaused: payload.isPaused ?? prev?.isPaused,
      isExpired: payload.isExpired ?? prev?.isExpired,
      isVotingAllowed: payload.isVotingAllowed ?? prev?.isVotingAllowed,
      pausedAt: payload.pausedAt ?? prev?.pausedAt,
    }));
  }, []);

  // ── Sincronização em Tempo Real (Milestone 3D: Round History) ─────────────
  const handleRoundArchived = useCallback((payload) => {
    if (!payload?.round) return;
    console.log('[OperatorContext] Sincronizando rodada arquivada no histórico:', payload.round);
    setRounds((prev) => [payload.round, ...prev.filter((r) => r.id !== payload.round.id)]);
  }, []);

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

  // ── Instância Única de SignalR (Milestone 2C.5.1: Foundation / 3A / 3B / 3D) ─
  const { connectionStatus, connectionError, backendUrl } = useSignalR({
    onChairTurned: (chairId, source) => turnChair(chairId, source),
    onChairsReset: resetAllChairs,
    onCurrentProjectChanged: handleCurrentProjectChanged,
    onEventBrandingUpdated: handleEventBrandingUpdated,
    onActiveEventChanged: handleActiveEventChanged,
    onPitchStageChanged: handlePitchStageChanged,
    onPitchTimerUpdated: handlePitchTimerUpdated,
    onRoundArchived: handleRoundArchived,
    onReconnected: handleReconnected,
    initialBackendUrl: getBackendUrl(),
  });

  // ── Despacho Autoritativo do Pitch (Milestone 3B & 3C) ─────────────────────
  const transitionPitch = useCallback(async (targetStage) => {
    const result = await pitchApi.transitionPitch(targetStage);
    return result;
  }, []);

  const resetPitch = useCallback(async () => {
    const result = await pitchApi.resetPitch();
    return result;
  }, []);

  const pausePitchTimer = useCallback(async () => {
    const result = await pitchApi.pauseTimer();
    return result;
  }, []);

  const resumePitchTimer = useCallback(async () => {
    const result = await pitchApi.resumeTimer();
    return result;
  }, []);

  const adjustPitchTimer = useCallback(async (seconds) => {
    const result = await pitchApi.adjustTimer(seconds);
    return result;
  }, []);

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
    eventsList,
    loading,
    error,
    refresh,

    // Hardware e Sessão da Arena
    chairs,
    eventsHistory,
    turnChair,
    resetAllChairs,
    requestResetArena,

    // Pitch Lifecycle Engine & Timers (Milestone 3B & 3C)
    pitchState,
    transitionPitch,
    resetPitch,
    pausePitchTimer,
    resumePitchTimer,
    adjustPitchTimer,

    // Histórico de Rodadas (Milestone 3D)
    rounds,

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
