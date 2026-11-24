import React from 'react';
import { StudioCanvas } from '../components/StudioCanvas';
import { StageHUD } from '../components/stage/StageHUD';
import { AudioUnlockOverlay } from '../components/stage/AudioUnlockOverlay';
import { useStageAudioDirector } from '../hooks/useStageAudioDirector';
import { useOperatorContext } from '../contexts/OperatorContext';

/**
 * StagePage — Superfície de Apresentação ao Público (Telão 3D).
 * 
 * Milestone 2D.1: Infraestrutura de Dados, Contexto e HUD Cênico.
 * Milestone 5A: Audio Engine Infrastructure & Visual Rendering Foundation (ADR-026).
 * Milestone 5B: Audio & Visual Event Synchronization (ADR-027).
 * 
 * Experiência pública limpa e cinematográfica (ADR-009):
 * - Consome dados autoritativos do OperatorContext: chairs, currentProject e currentEvent;
 * - Transmite metadados do evento ativo e do pitch para a camada pública StageHUD;
 * - Mantém a cena 3D procedural do Voice Studio reativa aos estágios e cadeiras;
 * - useStageAudioDirector: orquestra a resposta de áudio procedural coordenada
 *   para ChairTurned, VotingOpen, Timer15Seconds, VotingClosed, UnanimousApproval e Reset;
 * - AudioUnlockOverlay garante conformidade com políticas de autoplay do navegador;
 * - Superfície 100% contemplativa, sem botões ou controles de rede.
 */
export function StagePage({
  chairs: propsChairs,
  currentProject: propsProject,
  currentEvent: propsEvent,
  pitchState: propsPitchState,
  jury: propsJury,
}) {
  let contextChairs = [];
  let contextProject = null;
  let contextEvent = null;
  let contextPitchState = null;
  let contextJury = [];

  try {
    const context = useOperatorContext();
    contextChairs = context?.chairs || [];
    contextProject = context?.currentProject || null;
    contextEvent = context?.currentEvent || null;
    contextPitchState = context?.pitchState || null;
    contextJury = context?.jury || [];
  } catch {
    contextChairs = [];
  }

  const chairs = propsChairs || contextChairs;
  const currentProject = propsProject || contextProject;
  const currentEvent = propsEvent || contextEvent;
  const pitchState = propsPitchState || contextPitchState;
  const jury = propsJury || contextJury;

  // ── Diretor de Áudio Cênico Sincronizado (Milestone 5B) ────────────────────
  useStageAudioDirector({
    chairs,
    pitchState,
  });

  return (
    <main style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* 3D Canvas Layer — Projeção Cênica Reativa com Branding, Projeto Ativo e PitchState */}
      <StudioCanvas
        chairs={chairs}
        branding={currentEvent?.branding}
        pitchState={pitchState}
        currentProject={currentProject}
        currentEvent={currentEvent}
      />

      {/* 2D HUD Cênico — Projeta Evento, Projeto Atual, Estágio do Pitch, Placar e Banca de Jurados */}
      <StageHUD
        chairs={chairs}
        currentProject={currentProject}
        currentEvent={currentEvent}
        pitchState={pitchState}
        jury={jury}
      />

      {/* Audio Unlock Overlay — Conformidade com políticas de autoplay (Milestone 5A, ADR-026) */}
      <AudioUnlockOverlay />
    </main>
  );
}

export default StagePage;
