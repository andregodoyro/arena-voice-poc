import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { projectsApi } from '../api/projectsApi';
import { eventsApi } from '../api/eventsApi';
import { isCurrentProject } from '../utils/projectStatus';

const OperatorContext = createContext(null);

/**
 * OperatorProvider — Provedor de dados operacionais e de gestão de pitches.
 * 
 * Segue ADR-002 (Snapshot First) e ADR-003 (ActiveContext):
 * Carrega e compartilha os dados de estado global, evento ativo e lista de projetos
 * entre as abas do painel operacional (/operator/cockpit, /operator/projects, /operator/event).
 */
export function OperatorProvider({ children }) {
  const [currentEvent, setCurrentEvent] = useState(null);
  const [currentProject, setCurrentProject] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOperationalData = useCallback(async () => {
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
      setError(null);
    } catch (err) {
      console.error('[OperatorContext] Falha ao carregar dados operacionais:', err);
      setError(err.message || 'Erro ao comunicar com o servidor');
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchOperationalData();
  }, [fetchOperationalData]);

  useEffect(() => {
    fetchOperationalData();
  }, [fetchOperationalData]);

  const value = {
    currentEvent,
    currentProject,
    projects,
    loading,
    error,
    refresh,
  };

  return (
    <OperatorContext.Provider value={value}>
      {children}
    </OperatorContext.Provider>
  );
}

/**
 * Hook para consumo do contexto operacional.
 */
export function useOperatorContext() {
  const context = useContext(OperatorContext);
  if (!context) {
    throw new Error('useOperatorContext deve ser utilizado dentro de um OperatorProvider');
  }
  return context;
}

export default OperatorContext;
