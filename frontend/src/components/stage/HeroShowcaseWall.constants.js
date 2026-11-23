/**
 * HERO_WALL_CONFIG — Constantes centralizadas do Media Crossfade Engine.
 *
 * Alterar aqui propaga para todo o sistema sem modificar lógica de componente.
 * Todas as durações são em milissegundos, salvo indicação de "GSAP" (segundos).
 *
 * Phase 5C.3 — State Machine Narrativa
 * Phase 5C.4 — Video no LED Wall
 */
export const HERO_WALL_CONFIG = {
  // ── Crossfade ──────────────────────────────────────────────────────────────
  /** Duração do crossfade entre mídias (ms) */
  CROSSFADE_DURATION_MS: 600,

  /** Easing GSAP para o crossfade */
  CROSSFADE_EASE: 'power2.inOut',

  // ── Transição entre projetos ───────────────────────────────────────────────
  /** Janela de permanência no modo 'transition' ao trocar de projeto (ms) */
  TRANSITION_HOLD_MS: 500,

  // ── Carregamento de vídeo ─────────────────────────────────────────────────
  /** Timeout máximo aguardando 'canplaythrough' antes de acionar fallback (ms) */
  VIDEO_LOAD_TIMEOUT_MS: 8000,

  // ── Geometria do LED Wall ─────────────────────────────────────────────────
  /** Largura do PlaneGeometry do telão (metros no espaço 3D) */
  LED_WALL_WIDTH: 33.8,

  /** Altura do PlaneGeometry do telão (metros no espaço 3D) */
  LED_WALL_HEIGHT: 11.6,

  /** Posição Z do Mesh A (textura ativa) no espaço local do group */
  MESH_A_Z: 0.080,

  /** Posição Z do Mesh B (textura entrante) — Δ para evitar Z-fighting */
  MESH_B_Z: 0.082,

  // ── CanvasTexture de fallback ──────────────────────────────────────────────
  /** Largura do canvas de fallback (pixels) */
  FALLBACK_CANVAS_WIDTH: 1920,

  /** Altura do canvas de fallback (pixels) */
  FALLBACK_CANVAS_HEIGHT: 640,

  // ── Iluminação cênica por wallMode ────────────────────────────────────────
  /**
   * Intensidade do pointLight central por wallMode.
   * Ajustável sem alterar lógica de componente.
   */
  LIGHT_INTENSITY: {
    'event-idle': 1.8,
    'waiting':    2.2,
    'pitch-live': 3.0,
    'voting':     2.8,
    'result':     3.6,
    'transition': 1.6,
  },

  /**
   * Cor das cove lights por wallMode.
   * Ausência de chave = usar secondaryColor do branding do evento.
   *
   * Decisão arquitetural:
   * - 'voting' e 'result' diferem por COR DE ILUMINAÇÃO, não por troca de mídia.
   *   O projeto permanece protagonista visual em ambos os estados.
   */
  COVE_COLOR: {
    'pitch-live': '#fff4e0',  // branca quente — foco no pitch
    'voting':     '#f59e0b',  // âmbar — tensão da votação
    'result':     '#fbbf24',  // dourado — celebração
  },

  /** Duração do pulso de iluminação no estado 'voting' (segundos GSAP) */
  VOTING_LIGHT_PULSE_DURATION_S: 1.2,

  // ── Pontos de extensão futuros ────────────────────────────────────────────
  /**
   * Duração de exibição de cada slide em slideshow (Phase 5C.5 — Gallery).
   * Declarado aqui para reservar o namespace de configuração.
   */
  GALLERY_SLIDE_DURATION_MS: 5000,
};

export default HERO_WALL_CONFIG;
