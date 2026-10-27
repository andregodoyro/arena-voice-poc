import React from 'react';
import { StudioCanvas } from '../components/StudioCanvas';
import { StageHUD } from '../components/stage/StageHUD';
import { useOperatorContext } from '../contexts/OperatorContext';

/**
 * StagePage — Superfície de Apresentação ao Público (Telão 3D).
 * 
 * Milestone 2D.1: Infraestrutura de Dados, Contexto e HUD Cênico.
 * 
 * Experiência pública limpa e cinematográfica (ADR-009):
 * - Consome dados autoritativos do OperatorContext: chairs, currentProject e currentEvent;
 * - Transmite metadados do evento ativo e do pitch para a camada pública StageHUD;
 * - Mantém a cena 3D procedural do Voice Studio estável e desacoplada;
 * - Superfície 100% contemplativa, sem botões ou controles de rede.
 */
export function StagePage({
  chairs: propsChairs,
  currentProject: propsProject,
  currentEvent: propsEvent,
}) {
  let contextChairs = [];
  let contextProject = null;
  let contextEvent = null;

  try {
    const context = useOperatorContext();
    contextChairs = context?.chairs || [];
    contextProject = context?.currentProject || null;
    contextEvent = context?.currentEvent || null;
  } catch {
    contextChairs = [];
  }

  const chairs = propsChairs || contextChairs;
  const currentProject = propsProject || contextProject;
  const currentEvent = propsEvent || contextEvent;

  return (
    <main style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* 3D Canvas Layer — Preservada sem alterações na geometria nesta subfase 2D.1 */}
      <StudioCanvas chairs={chairs} />

      {/* 2D HUD Cênico — Projeta Evento, Projeto Atual e Placar da Banca */}
      <StageHUD
        chairs={chairs}
        currentProject={currentProject}
        currentEvent={currentEvent}
      />
    </main>
  );
}

export default StagePage;
