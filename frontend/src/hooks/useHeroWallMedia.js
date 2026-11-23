import { useState, useEffect, useRef, useMemo } from 'react';
import { resolveMediaUrl } from '../utils/mediaResolver';
import { HERO_WALL_CONFIG } from '../components/stage/HeroShowcaseWall.constants';

/**
 * useHeroWallMedia — State Machine centralizada do Hero LED Wall.
 *
 * Responsabilidades:
 *  1. Derivar `wallMode` a partir de pitchState + currentProject.
 *  2. Detectar transição entre projetos (janela de TRANSITION_HOLD_MS).
 *  3. Resolver `mediaCandidate` conforme a Hero Wall Content Priority Matrix.
 *  4. Expor ponto de extensão `onWallModeChange` para Phase 5F (Áudio).
 *
 * Hero Wall Content Priority Matrix (formalizada — Phase 5C.3):
 *  ─────────────────────────────────────────────────────────────────
 *  event-idle / transition → event.branding.logoUrl → CanvasTexture
 *  waiting                 → project.coverImageUrl → logoUrl → event.logoUrl → Canvas
 *  pitch-live              → project.videoUrl → coverImageUrl → logoUrl → Canvas
 *  voting   [PROJETO★]     → project.coverImageUrl → logoUrl → event.logoUrl → Canvas
 *  result   [PROJETO★]     → project.coverImageUrl → logoUrl → event.logoUrl → Canvas
 *  ─────────────────────────────────────────────────────────────────
 *  ★ Voting e Result mantêm o projeto como protagonista visual.
 *    A diferença narrativa é expressa pela iluminação GSAP, não pela mídia.
 *
 * MediaCandidate types suportados nesta entrega:
 *  'image'   → THREE.TextureLoader (jpg, png, webp, svg)
 *  'video'   → THREE.VideoTexture  (mp4, webm)
 *  'canvas'  → THREE.CanvasTexture (fallback gerado em memória)
 *
 * MediaCandidate types reservados para extensão futura:
 *  'gallery' → Phase 5C.5 — Slideshow Engine
 *              Por ora: retorna primeiro item como 'image' (gracioso)
 *
 * @param {Object} params
 * @param {Object|null}   params.currentProject
 * @param {Object|null}   params.currentEvent
 * @param {Object|null}   params.pitchState
 * @param {Function}      [params.onWallModeChange]  - callback(wallMode) para Phase 5F
 * @returns {{ wallMode: string, mediaCandidate: Object }}
 */
export function useHeroWallMedia({ currentProject, currentEvent, pitchState, onWallModeChange }) {
  const [wallMode, setWallMode] = useState('event-idle');
  const prevProjectIdRef = useRef(null);
  const transitionTimerRef = useRef(null);

  // ── Derivação do wallMode + detecção de transição entre projetos ────────────
  useEffect(() => {
    // Limpar timer de transição anterior caso exista
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }

    if (!currentProject) {
      prevProjectIdRef.current = null;
      setWallMode('event-idle');
      return;
    }

    const newMode = deriveWallMode(pitchState, currentProject);

    // Detectar troca de projeto: aplicar modo 'transition' por TRANSITION_HOLD_MS
    if (prevProjectIdRef.current && prevProjectIdRef.current !== currentProject.id) {
      setWallMode('transition');
      transitionTimerRef.current = setTimeout(() => {
        setWallMode(newMode);
        transitionTimerRef.current = null;
      }, HERO_WALL_CONFIG.TRANSITION_HOLD_MS);
    } else {
      setWallMode(newMode);
    }

    prevProjectIdRef.current = currentProject.id;

    return () => {
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
      }
    };
  }, [currentProject?.id, pitchState?.stage]);

  // ── Ponto de extensão para Phase 5F (Áudio) ──────────────────────────────
  const prevWallModeRef = useRef(null);
  useEffect(() => {
    if (wallMode !== prevWallModeRef.current) {
      onWallModeChange?.(wallMode, prevWallModeRef.current);
      prevWallModeRef.current = wallMode;
    }
  }, [wallMode, onWallModeChange]);

  // ── Resolução do MediaCandidate ──────────────────────────────────────────
  const mediaCandidate = useMemo(
    () => resolveMediaCandidate(wallMode, currentProject, currentEvent),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [wallMode, currentProject?.id, currentProject?.media, currentEvent?.media, currentEvent?.branding]
  );

  return { wallMode, mediaCandidate };
}

// ── Funções Puras ──────────────────────────────────────────────────────────────

/**
 * Deriva o wallMode a partir do pitchState e currentProject.
 * Função pura — sem side effects, testável de forma isolada.
 */
function deriveWallMode(pitchState, currentProject) {
  if (!currentProject) return 'event-idle';

  const stage = pitchState?.stage ?? 'Waiting';

  switch (stage) {
    case 'PitchRunning':
    case 'QA':          return 'pitch-live';
    case 'VotingOpen':  return 'voting';
    case 'Approved':
    case 'Finished':    return 'result';
    case 'Waiting':
    default:            return 'waiting';
  }
}

/**
 * Resolve o MediaCandidate conforme a Hero Wall Content Priority Matrix.
 * Retorna sempre um candidato válido — nunca retorna null.
 *
 * @param {string}      wallMode
 * @param {Object|null} project
 * @param {Object|null} event
 * @returns {Object} MediaCandidate
 */
function resolveMediaCandidate(wallMode, project, event) {
  const p     = project?.media ?? {};
  const brand = event?.branding ?? {};

  const primaryColor = brand.primaryColor ?? '#d90429';
  const label        = project?.title ?? event?.title ?? 'Arena Voice';

  // Helper: retorna o primeiro candidato com URL válida, ou o fallback canvas
  function firstOf(candidates) {
    for (const c of candidates) {
      if (c.type === 'canvas') return c; // canvas é sempre válido
      if (c.url)               return c;
    }
    return { type: 'canvas', url: null, label, themeColor: primaryColor };
  }

  // ── EXTENSÃO FUTURA Phase 5C.5 (Gallery): ────────────────────────────────
  // Se project.media.items contiver imagens, o primeiro item é usado como
  // fallback de imagem. Quando 'gallery' estiver implementado, este bloco
  // retornará { type: 'gallery', urls: [...] } e o HeroShowcaseWall terá
  // o slideshow engine para tratá-lo. Por ora, comportamento gracioso.
  const galleryFallbackUrl = p.items?.find(i => i.type === 'image')?.url ?? null;

  switch (wallMode) {
    case 'event-idle':
    case 'transition':
      return firstOf([
        { type: 'image',  url: resolveMediaUrl(brand.logoUrl) },
        { type: 'canvas', url: null, label: event?.title ?? 'Arena Voice', themeColor: primaryColor },
      ]);

    case 'waiting':
      return firstOf([
        { type: 'image',  url: resolveMediaUrl(p.coverImageUrl) },
        { type: 'image',  url: resolveMediaUrl(p.logoUrl) },
        { type: 'image',  url: resolveMediaUrl(brand.logoUrl) },
        { type: 'image',  url: resolveMediaUrl(galleryFallbackUrl) },
        { type: 'canvas', url: null, label, themeColor: primaryColor },
      ]);

    case 'pitch-live':
      return firstOf([
        { type: 'video',  url: resolveMediaUrl(p.videoUrl) },
        { type: 'image',  url: resolveMediaUrl(p.coverImageUrl) },
        { type: 'image',  url: resolveMediaUrl(p.logoUrl) },
        { type: 'image',  url: resolveMediaUrl(galleryFallbackUrl) },
        { type: 'canvas', url: null, label, themeColor: primaryColor },
      ]);

    // ★ VOTING — Projeto permanece protagonista visual
    // A diferença narrativa é expressa pela iluminação âmbar (COVE_COLOR.voting)
    case 'voting':
      return firstOf([
        { type: 'image',  url: resolveMediaUrl(p.coverImageUrl) },
        { type: 'image',  url: resolveMediaUrl(p.logoUrl) },
        { type: 'image',  url: resolveMediaUrl(brand.logoUrl) },
        { type: 'canvas', url: null, label, themeColor: '#f59e0b' }, // âmbar
      ]);

    // ★ RESULT — Projeto permanece protagonista visual
    // A diferença narrativa é expressa pela iluminação dourada (COVE_COLOR.result)
    case 'result':
      return firstOf([
        { type: 'image',  url: resolveMediaUrl(p.coverImageUrl) },
        { type: 'image',  url: resolveMediaUrl(p.logoUrl) },
        { type: 'image',  url: resolveMediaUrl(brand.logoUrl) },
        { type: 'canvas', url: null, label, themeColor: '#fbbf24' }, // dourado
      ]);

    default:
      return { type: 'canvas', url: null, label, themeColor: primaryColor };
  }
}
