/**
 * HERO_WALL_CONFIG — Constantes centralizadas do Hero LED Wall (Arquitetura Simplificada).
 *
 * Configurações de geometria, iluminação reativa e dimensões visuais.
 * Mantém paridade arquitetural 3D para as fases 5C.3 e 5C.4.
 */
export const HERO_WALL_CONFIG = {
  // ── Geometria do LED Wall (metros no espaço 3D) ───────────────────────────
  /** Largura do PlaneGeometry do telão */
  LED_WALL_WIDTH: 33.8,

  /** Altura do PlaneGeometry do telão */
  LED_WALL_HEIGHT: 11.6,

  /** Posição Z do plano da tela na moldura arquitetural */
  SCREEN_Z: 0.08,

  // ── CanvasTexture de fallback ──────────────────────────────────────────────
  /** Largura do canvas de fallback (pixels) */
  FALLBACK_CANVAS_WIDTH: 1920,

  /** Altura do canvas de fallback (pixels) */
  FALLBACK_CANVAS_HEIGHT: 640,

  // ── Iluminação cênica por wallMode ────────────────────────────────────────
  /**
   * Intensidade do pointLight central projetado no palco por wallMode.
   */
  LIGHT_INTENSITY: {
    'event-idle': 1.8,
    'waiting':    2.2,
    'pitch-live': 3.2,
    'voting':     2.8,
    'result':     3.8,
  },

  /**
   * Cor das cove lights por wallMode.
   *
   * Decisão de Design:
   * - 'voting' e 'result' mantêm a imagem do projeto como protagonista visual na tela.
   * - A distinção e tensão dramática são conduzidas pela iluminação de borda (Cove Halos)
   *   e pulso de luz do palco.
   */
  COVE_COLOR: {
    'event-idle': '#0284c7', // azul institucional
    'waiting':    '#4f46e5', // índigo suave
    'pitch-live': '#ffffff', // branco neutro de alta visibilidade
    'voting':     '#f59e0b', // âmbar de tensão
    'result':     '#fbbf24', // dourado triunfante de celebração
  },

  /** Duração do ciclo de pulso da luz no modo 'voting' (segundos GSAP) */
  VOTING_LIGHT_PULSE_DURATION_S: 1.2,
};

export default HERO_WALL_CONFIG;
