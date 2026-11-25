import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { projectsApi } from '../api/projectsApi';
import { eventsApi } from '../api/eventsApi';
import { pitchApi } from '../api/pitchApi';
import { roundsApi } from '../api/roundsApi';
import { judgesApi } from '../api/judgesApi';
import { auditApi } from '../api/auditApi';
import { mapAuditEventToActivityItem } from '../utils/auditMapper';
import { isCurrentProject } from '../utils/projectStatus';
import { useSignalR } from '../services/useSignalR';
import { getBackendUrl, request } from '../api/apiClient';
import { useAuth } from './AuthContext';
import { experienceEventBus, EXPERIENCE_EVENTS } from '../services/experienceEventBus';

const OperatorContext = createContext(null);

const DEFAULT_CHAIRS = [
  { id: 1, name: 'Técnico 1', isTurned: false },
  { id: 2, name: 'Técnico 2', isTurned: false },
  { id: 3, name: 'Técnico 3', isTurned: false },
  { id: 4, name: 'Técnico 4', isTurned: false },
  { id: 5, name: 'Técnico 5', isTurned: false },
];

/**
 * OperatorProvider — Provedor de Estado Operacional e Integração Realtime (Milestone 2C.5 / 3A / 4C.5).
 * 
 * Centraliza a única conexão SignalR do sistema e orquestra o estado autoritativo:
 * - ADR-001 (Backend Authoritative): O backend dita o estado final em todas as circunstâncias.
 * - ADR-002 (Snapshot First): O estado inicial e o resync pós-reconexão vêm do snapshot REST.
 * - ADR-003 (ActiveContext): O projeto e evento ativos são refletidos ponta a ponta.
 * - ADR-004 (Rich SignalR Payloads): Consome os metadados ricos enviados pelo Hub.
 * - ADR-022 (Audit Timeline Segregation): Eventos técnicos ocultados por padrão; timeline reidratada no boot.
 * - Milestone 3A (Event Lifecycle): Gerencia o catálogo de eventos e a reatividade de ativação.
 * - Milestone 3D (Round History): Preserva o histórico das rodadas arquivadas em memória.
 * - Milestone 4C (Audit Trail & ActivityLog Rehydration): Reidratação durável após F5 via tabela audit_events.
 */
export function OperatorProvider({ children }) {
  const { isAuthenticated, hasRole } = useAuth();
  const canOperate = isAuthenticated && hasRole('Admin', 'Operator');
  // ── Estado Institucional e de Projetos (Fase 2 & Fase 3A) ──────────────────
  const [currentEvent, setCurrentEvent] = useState(null);
  const [currentProject, setCurrentProject] = useState(null);
  const [projects, setProjects] = useState([]);
  const [eventsList, setEventsList] = useState([]);
  const [pitchState, setPitchState] = useState(null);
  const [rounds, setRounds] = useState([]);
  const [judges, setJudges] = useState([]);
  const [jury, setJury] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Estado das Cadeiras e Histórico Cênico (Fase 1 / 4C.5) ─────────────────
  const [chairs, setChairs] = useState(DEFAULT_CHAIRS);
  const [eventsHistory, setEventsHistory] = useState([]);
  const [isResyncing, setIsResyncing] = useState(false);

  // ── Helper para adicionar eventos ao log em tempo real com desduplicação ───
  const addRealtimeActivity = useCallback((newItem) => {
    setEventsHistory((prev) => {
      // Evita duplicar item idêntico se já existir
      const exists = prev.some((e) => e.id === newItem.id);
      if (exists) return prev;
      return [newItem, ...prev].slice(0, 50);
    });
  }, []);

  // ── Ações de Cadeiras (Fase 1 / Realtime) ─────────────────────────────────
  const turnedChairsRef = React.useRef(new Set());

  const turnChair = useCallback((chairId, source = 'SIGNALR') => {
    if (turnedChairsRef.current.has(chairId)) return;
    turnedChairsRef.current.add(chairId);
    setChairs((prev) =>
      prev.map((c) => (c.id === chairId ? { ...c, isTurned: true } : c))
    );

    const now = new Date().toLocaleTimeString('pt-BR');
    const eventItem = {
      id: `rt-${Date.now()}-${chairId}`,
      chairId,
      type: 'CHAIR_TURNED',
      category: 'chair',
      description: `Cadeira #${chairId} virou`,
      subtext: 'Voto computado',
      source,
      time: now,
      timestamp: Date.now(),
    };

    addRealtimeActivity(eventItem);
    experienceEventBus.emit(EXPERIENCE_EVENTS.CHAIR_PRESSED, { chairId, source });
  }, [addRealtimeActivity]);

  const resetAllChairs = useCallback(() => {
    turnedChairsRef.current.clear();
    setChairs((prev) => prev.map((c) => ({ ...c, isTurned: false })));

    const now = new Date().toLocaleTimeString('pt-BR');
    const eventItem = {
      id: `rt-${Date.now()}-reset`,
      type: 'RESET',
      category: 'chair',
      description: 'Arena retornada à posição inicial',
      subtext: 'Comando do sistema',
      time: now,
      timestamp: Date.now(),
    };

    addRealtimeActivity(eventItem);
    experienceEventBus.emit(EXPERIENCE_EVENTS.ARENA_RESET, { source: 'SIGNALR' });
  }, [addRealtimeActivity]);

  // ── Busca de Snapshot Autoritativo e Reidratação de Auditoria (ADR-002 / 4C.5) ─
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
        const nextTurned = new Set();
        for (const [k, v] of Object.entries(stateData.chairs)) {
          if (v === true) nextTurned.add(Number(k));
        }
        turnedChairsRef.current = nextTurned;
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

      // Sincroniza catálogo de jurados e banca do evento ativo (Milestone 3E)
      if (Array.isArray(stateData?.jury)) {
        setJury(stateData.jury);
      }
      try {
        const judgesData = await judgesApi.getJudges(true);
        setJudges(Array.isArray(judgesData) ? judgesData : []);
      } catch (jErr) {
        console.warn('[OperatorContext] Aviso ao buscar catálogo de jurados:', jErr);
      }

      // ── Reidratação do ActivityLog via Audit Trail (Milestone 4C.5 / ADR-022) ─
      try {
        const auditResponse = await auditApi.getTimeline({
          page: 1,
          pageSize: 30,
          includeTechnical: false, // Regra mandatória da ADR-022
        });

        if (auditResponse?.items && Array.isArray(auditResponse.items)) {
          const rehydratedItems = auditResponse.items
            .map(mapAuditEventToActivityItem)
            .filter(Boolean);

          setEventsHistory((prev) => {
            // Preserva eventos efêmeros que acabaram de chegar em tempo real (< 5s)
            const recentRealtime = prev.filter(
              (p) => p.id?.startsWith('rt-') && Date.now() - (p.timestamp || 0) < 5000
            );

            // Mescla sem duplicar e ordena cronologicamente
            const combined = [...recentRealtime, ...rehydratedItems];
            const seen = new Set();
            const unique = [];
            for (const item of combined) {
              const key = item.auditId ? `audit-${item.auditId}` : item.id;
              if (!seen.has(key)) {
                seen.add(key);
                unique.push(item);
              }
            }
            return unique.slice(0, 50);
          });
        }
      } catch (auditErr) {
        console.warn('[OperatorContext] Aviso ao reidratar timeline de auditoria:', auditErr);
      }

      setError(null);
    } catch (err) {
      console.error('[OperatorContext] Falha ao carregar snapshot inicial:', err);
      setError(err);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [canOperate]);

  const refresh = useCallback(() => {
    return fetchOperationalData(false);
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

      // Adiciona evento na timeline em tempo real
      const now = new Date().toLocaleTimeString('pt-BR');
      addRealtimeActivity({
        id: `rt-${Date.now()}-proj-active`,
        type: 'PROJECT_ACTIVATED',
        category: 'project',
        description: `Projeto chamado ao palco: "${newCurrent.title}"`,
        subtext: 'Pitch selecionado para apresentação',
        time: now,
        timestamp: Date.now(),
      });
    }

    experienceEventBus.emit(EXPERIENCE_EVENTS.PROJECT_CHANGED, { project: newCurrent, previousProject: prevProject });

    // 2. Re-hidratação autoritativa silenciosa em background (ADR-002)
    fetchOperationalData(false);
  }, [fetchOperationalData, addRealtimeActivity]);

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

    const now = new Date().toLocaleTimeString('pt-BR');
    addRealtimeActivity({
      id: `rt-${Date.now()}-evt-active`,
      type: 'EVENT_ACTIVATED',
      category: 'event',
      description: `Evento ativado: "${payload.event.title}"`,
      subtext: 'Governança de evento',
      time: now,
      timestamp: Date.now(),
    });

    // 2. Re-hidratação autoritativa completa em background
    fetchOperationalData(false);
  }, [fetchOperationalData, addRealtimeActivity]);

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
      turnedChairsRef.current.clear();
    }

    // Emite transição de estágio no ExperienceEventBus (Fase 5D.4)
    experienceEventBus.emit(EXPERIENCE_EVENTS.STAGE_CHANGED, {
      stage: stageName,
      fromStage: payload.fromStage,
      projectId: payload.projectId,
    }, { source: 'SIGNALR' });

    if (stageName === 'VotingOpen') {
      experienceEventBus.emit(EXPERIENCE_EVENTS.VOTING_STARTED, { stage: stageName }, { source: 'SIGNALR' });
    } else if (stageName === 'VotingClosed' || stageName === 'Finished') {
      experienceEventBus.emit(EXPERIENCE_EVENTS.VOTING_FINISHED, { stage: stageName }, { source: 'SIGNALR' });
    }

    // Registra transição relevante no log operacional
    const now = new Date().toLocaleTimeString('pt-BR');
    let evtType = 'PITCH_STAGE';
    let evtDesc = `Estágio alterado para: ${stageName}`;
    let evtSub = payload.fromStage ? `De ${payload.fromStage}` : 'Ciclo de pitch';

    if (stageName === 'PitchRunning') {
      evtType = 'PITCH_STARTED';
      evtDesc = 'Pitch iniciado no palco';
      evtSub = 'Apresentação em andamento';
    } else if (stageName === 'Finished') {
      evtType = 'PITCH_COMPLETED';
      evtDesc = 'Apresentação do pitch concluída';
      evtSub = 'Transição para encerramento';
    }

    addRealtimeActivity({
      id: `rt-${Date.now()}-${stageName}`,
      type: evtType,
      category: 'pitch',
      description: evtDesc,
      subtext: evtSub,
      time: now,
      timestamp: Date.now(),
    });

    // Re-hidratação silenciosa em background (para allowedTransitions e status)
    fetchOperationalData(false);
  }, [fetchOperationalData, addRealtimeActivity]);

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
    experienceEventBus.emit(EXPERIENCE_EVENTS.RESULTS_CALCULATED, { round: payload.round });

    const now = new Date().toLocaleTimeString('pt-BR');
    addRealtimeActivity({
      id: `rt-${Date.now()}-round-archived`,
      type: 'PROJECT_COMPLETED',
      category: 'project',
      description: `Rodada arquivada: "${payload.round.projectTitle || 'Projeto'}"`,
      subtext: `Resultado: ${payload.round.result} (${payload.round.approvalMode})`,
      time: now,
      timestamp: Date.now(),
    });
  }, [addRealtimeActivity]);

  // ── Sincronização em Tempo Real (Milestone 3E: Judges & Jury) ─────────────
  const handleEventJuryUpdated = useCallback((payload) => {
    if (!payload) return;
    console.log('[OperatorContext] Sincronizando atualização da banca de jurados:', payload);
    if (Array.isArray(payload.jury)) {
      setJury(payload.jury);
    }
  }, []);

  // ── Reconexão e Resync Hardening (Milestone 2C.5.5) ──────────────────────
  const handleReconnected = useCallback(async () => {
    console.log('[OperatorContext] Reconexão detectada. Executando resync autoritativo completo...');
    setIsResyncing(true);
    try {
      await fetchOperationalData(false);
      experienceEventBus.emit(EXPERIENCE_EVENTS.AUDIO_CONFIG_UPDATED, { reason: 'reconnect' }, { source: 'RECONNECT' });
    } catch (err) {
      console.error('[OperatorContext] Falha no resync pós-reconexão:', err);
    } finally {
      setIsResyncing(false);
    }
  }, [fetchOperationalData]);

  // ── Instância Única de SignalR (Milestone 2C.5.1: Foundation / 3A / 3B / 3D / 3E) ─
  const { connectionStatus, connectionError, backendUrl } = useSignalR({
    onChairTurned: (chairId, source) => turnChair(chairId, source),
    onChairsReset: resetAllChairs,
    onCurrentProjectChanged: handleCurrentProjectChanged,
    onEventBrandingUpdated: handleEventBrandingUpdated,
    onActiveEventChanged: handleActiveEventChanged,
    onPitchStageChanged: handlePitchStageChanged,
    onPitchTimerUpdated: handlePitchTimerUpdated,
    onRoundArchived: handleRoundArchived,
    onEventJuryUpdated: handleEventJuryUpdated,
    onAudioConfigUpdated: (payload) => experienceEventBus.emit(EXPERIENCE_EVENTS.AUDIO_CONFIG_UPDATED, payload || {}, { source: 'SIGNALR' }),
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
    return request('/api/reset', { method: 'POST' });
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

    // Catálogo de Jurados & Banca (Milestone 3E)
    judges,
    jury,

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
