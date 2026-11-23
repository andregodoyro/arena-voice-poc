import { useState, useEffect, useRef, useMemo } from 'react';
import { resolveMediaUrl } from '../utils/mediaResolver';

/**
 * useHeroWallMedia — State Machine Narrativa Simplificada do Hero LED Wall.
 *
 * Responsabilidades:
 *  1. Derivar `wallMode` a partir de pitchState + currentProject.
 *  2. Resolver `mediaCandidate` conforme a Matriz de Prioridade:
 *     - EventIdle   → imagem do evento (branding) ou canvas corporativo
 *     - Waiting     → imagem do projeto (cover ou logo)
 *     - PitchRunning→ vídeo do projeto (com fallback automático para cover/logo)
 *     - Voting      → imagem do projeto mantida fixa como protagonista
 *     - Result      → imagem do projeto mantida fixa como protagonista
 *  3. Notificar callback opcional `onWallModeChange` para futuras integrações (ex: áudio).
 *
 * @param {Object} params
 * @param {Object|null}   params.currentProject
 * @param {Object|null}   params.currentEvent
 * @param {Object|null}   params.pitchState
 * @param {Function}      [params.onWallModeChange]
 * @returns {{ wallMode: string, mediaCandidate: { type: string, url: string|null, label: string, themeColor: string } }}
 */
export function useHeroWallMedia({ currentProject, currentEvent, pitchState, onWallModeChange }) {
  const wallMode = useMemo(() => {
    return deriveWallMode(pitchState, currentProject);
  }, [pitchState?.stage, pitchState?.stageName, currentProject?.id]);

  // Ponto de extensão para notificações de mudança de modo
  const prevWallModeRef = useRef(wallMode);
  useEffect(() => {
    if (wallMode !== prevWallModeRef.current) {
      onWallModeChange?.(wallMode, prevWallModeRef.current);
      prevWallModeRef.current = wallMode;
    }
  }, [wallMode, onWallModeChange]);

  const mediaCandidate = useMemo(() => {
    return resolveMediaCandidate(wallMode, currentProject, currentEvent);
  }, [wallMode, currentProject?.id, currentProject?.media, currentEvent?.id, currentEvent?.branding]);

  return { wallMode, mediaCandidate };
}

// ── Funções Puras ────────────────────────────────────────────────────────────

function deriveWallMode(pitchState, currentProject) {
  if (!currentProject) return 'event-idle';

  const stage = pitchState?.stageName || pitchState?.stage || 'Waiting';

  switch (stage) {
    case 'PitchRunning':
    case 'QA':
      return 'pitch-live';
    case 'VotingOpen':
    case 'VotingClosed':
      return 'voting';
    case 'Approved':
    case 'Finished':
      return 'result';
    case 'Waiting':
    default:
      return 'waiting';
  }
}

function resolveMediaCandidate(wallMode, project, event) {
  const media = project?.media ?? {};
  const brand = event?.branding ?? {};

  const primaryColor = brand.primaryColor ?? '#d90429';
  const label = project?.title ?? event?.title ?? 'Arena Voice';

  function firstValid(candidates) {
    for (const c of candidates) {
      if (c.type === 'canvas') return c;
      if (c.url) return c;
    }
    return { type: 'canvas', url: null, label, themeColor: primaryColor };
  }

  switch (wallMode) {
    case 'event-idle':
      return firstValid([
        { type: 'image', url: resolveMediaUrl(brand.logoUrl || event?.logoUrl) },
        { type: 'canvas', url: null, label: event?.title ?? 'Arena Voice', themeColor: primaryColor },
      ]);

    case 'waiting':
      return firstValid([
        { type: 'image', url: resolveMediaUrl(media.coverImageUrl) },
        { type: 'image', url: resolveMediaUrl(media.logoUrl) },
        { type: 'image', url: resolveMediaUrl(brand.logoUrl || event?.logoUrl) },
        { type: 'canvas', url: null, label, themeColor: primaryColor },
      ]);

    case 'pitch-live':
      return firstValid([
        { type: 'video', url: resolveMediaUrl(media.videoUrl) },
        { type: 'image', url: resolveMediaUrl(media.coverImageUrl) },
        { type: 'image', url: resolveMediaUrl(media.logoUrl) },
        { type: 'canvas', url: null, label, themeColor: primaryColor },
      ]);

    // ★ VOTING — Projeto como protagonista visual na tela
    case 'voting':
      return firstValid([
        { type: 'image', url: resolveMediaUrl(media.coverImageUrl) },
        { type: 'image', url: resolveMediaUrl(media.logoUrl) },
        { type: 'canvas', url: null, label, themeColor: '#f59e0b' },
      ]);

    // ★ RESULT — Projeto como protagonista visual na tela
    case 'result':
      return firstValid([
        { type: 'image', url: resolveMediaUrl(media.coverImageUrl) },
        { type: 'image', url: resolveMediaUrl(media.logoUrl) },
        { type: 'canvas', url: null, label, themeColor: '#fbbf24' },
      ]);

    default:
      return { type: 'canvas', url: null, label, themeColor: primaryColor };
  }
}

export default useHeroWallMedia;
