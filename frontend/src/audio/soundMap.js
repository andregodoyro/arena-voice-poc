/**
 * ==============================================================================
 * ARENA VOICE — SOUND MAP (MILESTONE 5D.1)
 * ==============================================================================
 * Mapeamento declarativo dos eventos da Arena Voice para assets do `SOUND_CATALOG`,
 * preservando compatibilidade total com os métodos procedurais do `SoundSynthesizer.js`.
 *
 * Princípios:
 * - Reutilização inteligente sem redundância;
 * - Fallback procedural sempre definido quando aplicável;
 * - Suporte a camada dupla (ex: clique imediato ESP32 + whoosh cinemático da cadeira);
 * - Lacunas marcadas explicitamente com `missingAssetHint` para futuros downloads.
 */

import { AUDIO_BUSES, SOUND_CATALOG } from './soundCatalog.js';

export const SOUND_PRIORITIES = Object.freeze({
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
});

export const SOUND_EVENTS = Object.freeze({
  // Interface
  UI_HOVER: 'ui.hover',
  UI_CLICK: 'ui.click',
  UI_CONFIRM: 'ui.confirm',
  UI_ERROR: 'ui.error',
  UI_TRANSITION: 'ui.transition',

  // Arena Idle & Palco
  ARENA_IDLE: 'arena.idle',
  PITCH_START: 'pitch.start',
  PITCH_AMBIENCE: 'pitch.ambience',
  PITCH_FINISH: 'pitch.finish',

  // Jurados & Cadeiras (ESP32)
  CHAIR_BUTTON_PRESS: 'chair.button_press',
  CHAIR_TURN: 'chair.turn',
  CHAIR_UNANIMOUS: 'chair.unanimous',
  CHAIR_SUPPORT: 'chair.support',
  ARENA_RESET: 'arena.reset',

  // Votação & Countdown
  VOTING_OPEN: 'voting.open',
  COUNTDOWN_TICK: 'voting.countdown_tick',
  VOTING_CLOSED: 'voting.closed',

  // Resultados, Ranking & Pódio
  RESULTS_SUSPENSE: 'results.suspense',
  RESULTS_PODIUM_STEP: 'results.podium_step',
  RESULTS_WINNER: 'results.winner',

  // Gamificação, Cartas & Leilão
  CARD_SELECT: 'gamification.card_select',
  CARD_ACTIVATE: 'gamification.card_activate',
  ABILITY_SPECIAL: 'gamification.ability_special',
  AUCTION_BID: 'gamification.auction_bid',
  AUCTION_WON: 'gamification.auction_won',
  HOSTILE_ACTION: 'gamification.hostile_action',
  ACTION_BLOCKED: 'gamification.action_blocked',
  ACHIEVEMENT_UNLOCKED: 'gamification.achievement_unlocked',
});

/**
 * @typedef {Object} SoundEventMapping
 * @property {string} eventKey
 * @property {string|null} soundId - ID principal no SOUND_CATALOG (null quando há lacuna)
 * @property {string|null} [secondarySoundId] - Camada secundária opcional
 * @property {string} bus - sfx | ambient | music
 * @property {number} volume - Volume relativo sugerido (0.0 a 1.0)
 * @property {boolean} loop - Reprodução contínua
 * @property {number} priority - SOUND_PRIORITIES
 * @property {number} cooldownMs - Anti-sobreposição em ms
 * @property {boolean} duckMusic - Reduz música/ambiente durante reprodução
 * @property {string|null} fallbackSynth - Método equivalente em SoundSynthesizer.js / AudioEngine.js
 * @property {string|null} [missingAssetHint] - Termo de busca no Pixabay quando faltar asset ideal
 * @property {string} notes - Observações operacionais
 */

/** @type {Readonly<Record<string, SoundEventMapping>>} */
export const SOUND_MAP = Object.freeze({
  // ── A. Interface ──────────────────────────────────────────────────────────
  [SOUND_EVENTS.UI_HOVER]: {
    eventKey: SOUND_EVENTS.UI_HOVER,
    soundId: 'ui-hover-tick',
    bus: AUDIO_BUSES.SFX,
    volume: 0.3,
    loop: false,
    priority: SOUND_PRIORITIES.LOW,
    cooldownMs: 80,
    duckMusic: false,
    fallbackSynth: null,
    notes: 'Micro-feedback leve ao navegar cards/itens do Cockpit.',
  },
  [SOUND_EVENTS.UI_CLICK]: {
    eventKey: SOUND_EVENTS.UI_CLICK,
    soundId: 'ui-sci-fi-click',
    bus: AUDIO_BUSES.SFX,
    volume: 0.5,
    loop: false,
    priority: SOUND_PRIORITIES.MEDIUM,
    cooldownMs: 60,
    duckMusic: false,
    fallbackSynth: null,
    notes: 'Clique padrão de ações no Cockpit.',
  },
  [SOUND_EVENTS.UI_CONFIRM]: {
    eventKey: SOUND_EVENTS.UI_CONFIRM,
    soundId: 'ui-sci-fi-click',
    bus: AUDIO_BUSES.SFX,
    volume: 0.6,
    loop: false,
    priority: SOUND_PRIORITIES.MEDIUM,
    cooldownMs: 100,
    duckMusic: false,
    fallbackSynth: 'playUnlockChime',
    notes: 'Reutiliza clique sci-fi com ganho levemente superior.',
  },
  [SOUND_EVENTS.UI_ERROR]: {
    eventKey: SOUND_EVENTS.UI_ERROR,
    soundId: 'ui-error-pop',
    bus: AUDIO_BUSES.SFX,
    volume: 0.65,
    loop: false,
    priority: SOUND_PRIORITIES.HIGH,
    cooldownMs: 150,
    duckMusic: false,
    fallbackSynth: null,
    notes: 'Erros de API, lockout HTTP 409 ou validações.',
  },
  [SOUND_EVENTS.UI_TRANSITION]: {
    eventKey: SOUND_EVENTS.UI_TRANSITION,
    soundId: 'stage-transition-dreamy',
    bus: AUDIO_BUSES.SFX,
    volume: 0.5,
    loop: false,
    priority: SOUND_PRIORITIES.MEDIUM,
    cooldownMs: 250,
    duckMusic: false,
    fallbackSynth: null,
    notes: 'Troca de projeto no palco ou transição de modo visual.',
  },

  // ── B. Arena Idle & Pitch ─────────────────────────────────────────────────
  [SOUND_EVENTS.ARENA_IDLE]: {
    eventKey: SOUND_EVENTS.ARENA_IDLE,
    soundId: 'music-idle-keep-moving',
    bus: AUDIO_BUSES.MUSIC,
    volume: 0.25,
    loop: true,
    priority: SOUND_PRIORITIES.LOW,
    cooldownMs: 1000,
    duckMusic: false,
    fallbackSynth: null,
    missingAssetHint: 'futuristic ambient corporate drone loop (opcional para substituir)',
    notes: 'Fundo suave enquanto o palco aguarda o próximo pitch; aplicar fade-out ao iniciar.',
  },
  [SOUND_EVENTS.PITCH_START]: {
    eventKey: SOUND_EVENTS.PITCH_START,
    soundId: 'stage-chair-bass-whoosh',
    bus: AUDIO_BUSES.SFX,
    volume: 0.7,
    loop: false,
    priority: SOUND_PRIORITIES.HIGH,
    cooldownMs: 500,
    duckMusic: true,
    fallbackSynth: null,
    notes: 'Marca entrada da startup no palco (Waiting -> PitchRunning).',
  },
  [SOUND_EVENTS.PITCH_AMBIENCE]: {
    eventKey: SOUND_EVENTS.PITCH_AMBIENCE,
    soundId: null,
    bus: AUDIO_BUSES.AMBIENT,
    volume: 0.15,
    loop: true,
    priority: SOUND_PRIORITIES.LOW,
    cooldownMs: 1000,
    duckMusic: false,
    fallbackSynth: null,
    missingAssetHint: 'subtle dark tech ambient pad loop',
    notes: 'SEM ASSET — RECOMENDAR DOWNLOAD. Não usar música melódica para não competir com a voz.',
  },
  [SOUND_EVENTS.PITCH_FINISH]: {
    eventKey: SOUND_EVENTS.PITCH_FINISH,
    soundId: 'celebration-applause-stage',
    bus: AUDIO_BUSES.AMBIENT,
    volume: 0.55,
    loop: false,
    priority: SOUND_PRIORITIES.MEDIUM,
    cooldownMs: 1000,
    duckMusic: true,
    fallbackSynth: null,
    notes: 'Aplausos ao encerrar apresentação (Finished).',
  },

  // ── C. Jurados & Cadeiras (ESP32) ─────────────────────────────────────────
  [SOUND_EVENTS.CHAIR_BUTTON_PRESS]: {
    eventKey: SOUND_EVENTS.CHAIR_BUTTON_PRESS,
    soundId: 'ui-sci-fi-click',
    bus: AUDIO_BUSES.SFX,
    volume: 0.6,
    loop: false,
    priority: SOUND_PRIORITIES.HIGH,
    cooldownMs: 50,
    duckMusic: false,
    fallbackSynth: null,
    notes: 'Camada 1 imediata (<20ms) ao receber evento físico do ESP32.',
  },
  [SOUND_EVENTS.CHAIR_TURN]: {
    eventKey: SOUND_EVENTS.CHAIR_TURN,
    soundId: 'stage-chair-bass-whoosh',
    secondarySoundId: 'ui-sci-fi-click',
    bus: AUDIO_BUSES.SFX,
    volume: 0.75,
    loop: false,
    priority: SOUND_PRIORITIES.HIGH,
    cooldownMs: 180,
    duckMusic: true,
    fallbackSynth: 'playWhoosh',
    missingAssetHint: 'futuristic hydraulic servo mechanical whoosh (camada mecânica complementar)',
    notes: 'Camada dupla: clique imediato + whoosh sincronizado à rotação 3D; cooldown evita saturação em viradas simultâneas.',
  },
  [SOUND_EVENTS.CHAIR_UNANIMOUS]: {
    eventKey: SOUND_EVENTS.CHAIR_UNANIMOUS,
    soundId: 'celebration-victory-fanfare',
    secondarySoundId: 'celebration-crowd-cheer',
    bus: AUDIO_BUSES.SFX,
    volume: 0.85,
    loop: false,
    priority: SOUND_PRIORITIES.CRITICAL,
    cooldownMs: 1500,
    duckMusic: true,
    fallbackSynth: 'playCelebration',
    notes: 'Dispara ~250ms após a 5ª cadeira virar (5/5 unanimidade).',
  },
  [SOUND_EVENTS.CHAIR_SUPPORT]: {
    eventKey: SOUND_EVENTS.CHAIR_SUPPORT,
    soundId: 'ui-hover-tick',
    bus: AUDIO_BUSES.SFX,
    volume: 0.45,
    loop: false,
    priority: SOUND_PRIORITIES.LOW,
    cooldownMs: 120,
    duckMusic: false,
    fallbackSynth: null,
    notes: 'Feedback discreto para /api/support sem competir com giro de cadeira.',
  },
  [SOUND_EVENTS.ARENA_RESET]: {
    eventKey: SOUND_EVENTS.ARENA_RESET,
    soundId: 'stage-transition-dreamy',
    bus: AUDIO_BUSES.SFX,
    volume: 0.45,
    loop: false,
    priority: SOUND_PRIORITIES.MEDIUM,
    cooldownMs: 300,
    duckMusic: false,
    fallbackSynth: 'playReset',
    notes: 'Retorno das cadeiras a 0° no reset.',
  },

  // ── D. Votação & Countdown ────────────────────────────────────────────────
  [SOUND_EVENTS.VOTING_OPEN]: {
    eventKey: SOUND_EVENTS.VOTING_OPEN,
    soundId: 'music-voting-tension-loop',
    bus: AUDIO_BUSES.MUSIC,
    volume: 0.35,
    loop: true,
    priority: SOUND_PRIORITIES.HIGH,
    cooldownMs: 500,
    duckMusic: false,
    fallbackSynth: 'playVotingOpen',
    notes: 'Acorde de abertura (synth) + loop sutil de tensão durante janela de votação.',
  },
  [SOUND_EVENTS.COUNTDOWN_TICK]: {
    eventKey: SOUND_EVENTS.COUNTDOWN_TICK,
    soundId: null,
    bus: AUDIO_BUSES.SFX,
    volume: 0.6,
    loop: false,
    priority: SOUND_PRIORITIES.HIGH,
    cooldownMs: 450,
    duckMusic: false,
    fallbackSynth: 'playTimerTicker',
    missingAssetHint: 'digital countdown clock tick sci fi',
    notes: 'SEM ASSET EXTERNO — Preserva ticker sincopado do SoundSynthesizer nos últimos 15s.',
  },
  [SOUND_EVENTS.VOTING_CLOSED]: {
    eventKey: SOUND_EVENTS.VOTING_CLOSED,
    soundId: 'stage-braam-impact-dark',
    bus: AUDIO_BUSES.SFX,
    volume: 0.8,
    loop: false,
    priority: SOUND_PRIORITIES.CRITICAL,
    cooldownMs: 800,
    duckMusic: true,
    fallbackSynth: 'playVotingClosed',
    notes: 'Recorte 0–4s do braam escuro; substitui com sofisticação o buzzer de lava-jato.',
  },

  // ── E. Resultados, Ranking & Pódio ────────────────────────────────────────
  [SOUND_EVENTS.RESULTS_SUSPENSE]: {
    eventKey: SOUND_EVENTS.RESULTS_SUSPENSE,
    soundId: 'music-voting-tension-loop',
    bus: AUDIO_BUSES.MUSIC,
    volume: 0.45,
    loop: true,
    priority: SOUND_PRIORITIES.HIGH,
    cooldownMs: 500,
    duckMusic: false,
    fallbackSynth: null,
    notes: 'Preparação antes da revelação do 3º/2º/1º lugar.',
  },
  [SOUND_EVENTS.RESULTS_PODIUM_STEP]: {
    eventKey: SOUND_EVENTS.RESULTS_PODIUM_STEP,
    soundId: 'stage-transition-dreamy',
    secondarySoundId: 'celebration-applause-stage',
    bus: AUDIO_BUSES.SFX,
    volume: 0.65,
    loop: false,
    priority: SOUND_PRIORITIES.HIGH,
    cooldownMs: 600,
    duckMusic: true,
    fallbackSynth: null,
    notes: 'Revelação de Bronze (3º) e Prata (2º) sem ofuscar o vencedor.',
  },
  [SOUND_EVENTS.RESULTS_WINNER]: {
    eventKey: SOUND_EVENTS.RESULTS_WINNER,
    soundId: 'celebration-victory-fanfare',
    secondarySoundId: 'celebration-crowd-cheer',
    bus: AUDIO_BUSES.SFX,
    volume: 0.9,
    loop: false,
    priority: SOUND_PRIORITIES.CRITICAL,
    cooldownMs: 2000,
    duckMusic: true,
    fallbackSynth: 'playCelebration',
    notes: 'Revelação do 1º lugar (Ouro / Diamante); interrompe trilha de suspense.',
  },

  // ── F. Gamificação, Cartas & Leilão ───────────────────────────────────────
  [SOUND_EVENTS.CARD_SELECT]: {
    eventKey: SOUND_EVENTS.CARD_SELECT,
    soundId: 'ui-sci-fi-click',
    bus: AUDIO_BUSES.SFX,
    volume: 0.55,
    loop: false,
    priority: SOUND_PRIORITIES.MEDIUM,
    cooldownMs: 80,
    duckMusic: false,
    fallbackSynth: null,
    notes: 'Seleção ou compra de carta.',
  },
  [SOUND_EVENTS.CARD_ACTIVATE]: {
    eventKey: SOUND_EVENTS.CARD_ACTIVATE,
    soundId: 'stage-transition-dreamy',
    bus: AUDIO_BUSES.SFX,
    volume: 0.65,
    loop: false,
    priority: SOUND_PRIORITIES.MEDIUM,
    cooldownMs: 200,
    duckMusic: false,
    fallbackSynth: null,
    notes: 'Ativação de carta padrão.',
  },
  [SOUND_EVENTS.ABILITY_SPECIAL]: {
    eventKey: SOUND_EVENTS.ABILITY_SPECIAL,
    soundId: 'stage-ability-sci-fi-shift',
    bus: AUDIO_BUSES.SFX,
    volume: 0.65,
    loop: false,
    priority: SOUND_PRIORITIES.HIGH,
    cooldownMs: 300,
    duckMusic: false,
    fallbackSynth: null,
    missingAssetHint: 'sci fi energy shield power up (se ufo-121421 soar caricato na 5D.6)',
    notes: 'Carta rara, blindagem ou congelamento.',
  },
  [SOUND_EVENTS.AUCTION_BID]: {
    eventKey: SOUND_EVENTS.AUCTION_BID,
    soundId: 'ui-sci-fi-click',
    bus: AUDIO_BUSES.SFX,
    volume: 0.6,
    loop: false,
    priority: SOUND_PRIORITIES.MEDIUM,
    cooldownMs: 100,
    duckMusic: false,
    fallbackSynth: null,
    notes: 'Lance de leilão ou aquisição de créditos.',
  },
  [SOUND_EVENTS.AUCTION_WON]: {
    eventKey: SOUND_EVENTS.AUCTION_WON,
    soundId: 'celebration-victory-fanfare',
    bus: AUDIO_BUSES.SFX,
    volume: 0.75,
    loop: false,
    priority: SOUND_PRIORITIES.HIGH,
    cooldownMs: 1000,
    duckMusic: true,
    fallbackSynth: 'playCelebration',
    notes: 'Leilão vencido.',
  },
  [SOUND_EVENTS.HOSTILE_ACTION]: {
    eventKey: SOUND_EVENTS.HOSTILE_ACTION,
    soundId: 'stage-braam-impact-dark',
    bus: AUDIO_BUSES.SFX,
    volume: 0.75,
    loop: false,
    priority: SOUND_PRIORITIES.HIGH,
    cooldownMs: 500,
    duckMusic: true,
    fallbackSynth: 'playVotingClosed',
    notes: 'Aquisição hostil ou impacto estratégico.',
  },
  [SOUND_EVENTS.ACTION_BLOCKED]: {
    eventKey: SOUND_EVENTS.ACTION_BLOCKED,
    soundId: 'ui-error-pop',
    bus: AUDIO_BUSES.SFX,
    volume: 0.65,
    loop: false,
    priority: SOUND_PRIORITIES.HIGH,
    cooldownMs: 150,
    duckMusic: false,
    fallbackSynth: null,
    notes: 'Bloqueio por escudo, saldo insuficiente ou ação negada.',
  },
  [SOUND_EVENTS.ACHIEVEMENT_UNLOCKED]: {
    eventKey: SOUND_EVENTS.ACHIEVEMENT_UNLOCKED,
    soundId: 'celebration-victory-fanfare',
    bus: AUDIO_BUSES.SFX,
    volume: 0.75,
    loop: false,
    priority: SOUND_PRIORITIES.HIGH,
    cooldownMs: 1000,
    duckMusic: true,
    fallbackSynth: 'playCelebration',
    notes: 'Desbloqueio de conquista (Bronze/Prata/Ouro/Diamante).',
  },
});

export function getMappingForEvent(eventKey) {
  return SOUND_MAP[eventKey] ?? null;
}

export function resolveEventAssets(eventKey) {
  const mapping = getMappingForEvent(eventKey);
  if (!mapping) return null;
  return {
    mapping,
    primary: mapping.soundId ? SOUND_CATALOG[mapping.soundId] ?? null : null,
    secondary: mapping.secondarySoundId ? SOUND_CATALOG[mapping.secondarySoundId] ?? null : null,
  };
}
