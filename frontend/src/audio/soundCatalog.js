/**
 * ==============================================================================
 * ARENA VOICE — SOUND CATALOG (MILESTONE 5D.1)
 * ==============================================================================
 * Catálogo local padronizado de assets de áudio curados em `frontend/public/audio/`.
 * Estruturado com schema compatível para futura migração à tabela `sound_library`
 * (Fase 5D.3) sem necessidade de reconstrução.
 *
 * IMPORTANTE: Nenhum áudio é carregado ou reproduzido automaticamente na importação
 * deste módulo (proteção contra autoplay e re-renderizações).
 */

export const AUDIO_BUSES = Object.freeze({
  SFX: 'sfx',
  AMBIENT: 'ambient',
  MUSIC: 'music',
});

export const AUDIO_CATEGORIES = Object.freeze({
  UI: 'ui',
  STAGE: 'stage',
  MUSIC: 'music',
  CELEBRATION: 'celebration',
});

/**
 * @typedef {Object} SoundAssetEntry
 * @property {string} id - Identificador estável (usado no soundMap e futura sound_library)
 * @property {string} name - Nome legível para exibição no Cockpit / Admin
 * @property {string} category - ui | stage | music | celebration
 * @property {string} bus - sfx | ambient | music
 * @property {string} url - Caminho público estático em /audio/...
 * @property {string} originalFile - Nome original preservado na auditoria
 * @property {number} durationSeconds - Duração aproximada em segundos
 * @property {number} defaultVolume - Volume relativo padrão (0.0 a 1.0)
 * @property {boolean} isLoop - Se o asset é destinado a reprodução contínua
 * @property {number} offsetSeconds - Offset inicial padrão (recorte opcional)
 * @property {number|null} clipDurationSeconds - Duração de recorte opcional (null = completo)
 * @property {string} packName - Preset padrão ('futuristic')
 * @property {boolean} isBuiltIn - Asset embutido no projeto
 * @property {string[]} tags - Tags semânticas para filtro/busca
 */

/** @type {Readonly<Record<string, SoundAssetEntry>>} */
export const SOUND_CATALOG = Object.freeze({
  'ui-hover-tick': {
    id: 'ui-hover-tick',
    name: 'UI Hover / Micro Tick',
    category: AUDIO_CATEGORIES.UI,
    bus: AUDIO_BUSES.SFX,
    url: '/audio/ui/ui-hover-tick.mp3',
    originalFile: 'juniorsoundays-ui-sound-01-527815.mp3',
    durationSeconds: 0.4,
    defaultVolume: 0.35,
    isLoop: false,
    offsetSeconds: 0,
    clipDurationSeconds: null,
    packName: 'futuristic',
    isBuiltIn: true,
    tags: ['ui', 'hover', 'micro', 'support'],
  },
  'ui-sci-fi-click': {
    id: 'ui-sci-fi-click',
    name: 'Sci-Fi UI Click / Botão Físico',
    category: AUDIO_CATEGORIES.UI,
    bus: AUDIO_BUSES.SFX,
    url: '/audio/ui/ui-sci-fi-click.mp3',
    originalFile: 'soundshelfstudio-sci-fi-ui-click-sound-596258.mp3',
    durationSeconds: 1.0,
    defaultVolume: 0.6,
    isLoop: false,
    offsetSeconds: 0,
    clipDurationSeconds: null,
    packName: 'futuristic',
    isBuiltIn: true,
    tags: ['ui', 'click', 'button', 'esp32', 'card', 'bid'],
  },
  'ui-error-pop': {
    id: 'ui-error-pop',
    name: 'UI Error / Ação Negada',
    category: AUDIO_CATEGORIES.UI,
    bus: AUDIO_BUSES.SFX,
    url: '/audio/ui/ui-error-pop.mp3',
    originalFile: 'soundshelfstudio-ui-error-pop-515668.mp3',
    durationSeconds: 1.0,
    defaultVolume: 0.65,
    isLoop: false,
    offsetSeconds: 0,
    clipDurationSeconds: null,
    packName: 'futuristic',
    isBuiltIn: true,
    tags: ['ui', 'error', 'lockout', 'denied'],
  },
  'stage-chair-bass-whoosh': {
    id: 'stage-chair-bass-whoosh',
    name: 'Cinematic Whoosh + Bass Drop',
    category: AUDIO_CATEGORIES.STAGE,
    bus: AUDIO_BUSES.SFX,
    url: '/audio/stage/chair-bass-whoosh.mp3',
    originalFile: 'chrysalyn-cinematic-intro-whoosh-with-deep-bass-drop-543523.mp3',
    durationSeconds: 4.0,
    defaultVolume: 0.75,
    isLoop: false,
    offsetSeconds: 0,
    clipDurationSeconds: null,
    packName: 'futuristic',
    isBuiltIn: true,
    tags: ['stage', 'chair', 'whoosh', 'pitch-start', 'cinematic'],
  },
  'stage-transition-dreamy': {
    id: 'stage-transition-dreamy',
    name: 'Transição Cinematográfica Suave',
    category: AUDIO_CATEGORIES.STAGE,
    bus: AUDIO_BUSES.SFX,
    url: '/audio/stage/transition-dreamy.mp3',
    originalFile: 'chrysalyn-cinematic-whoosh-flashback-dreamy-transition-sfx-529465.mp3',
    durationSeconds: 1.0,
    defaultVolume: 0.55,
    isLoop: false,
    offsetSeconds: 0,
    clipDurationSeconds: null,
    packName: 'futuristic',
    isBuiltIn: true,
    tags: ['transition', 'stage', 'project', 'card'],
  },
  'stage-braam-impact-dark': {
    id: 'stage-braam-impact-dark',
    name: 'Biodynamic Impact Braam (Dark)',
    category: AUDIO_CATEGORIES.STAGE,
    bus: AUDIO_BUSES.SFX,
    url: '/audio/stage/braam-impact-dark.mp3',
    originalFile: 'bryansantosbreton-biodynamic-impact-braam-tonal-dark-176441.mp3',
    durationSeconds: 8.0,
    defaultVolume: 0.8,
    isLoop: false,
    offsetSeconds: 0,
    clipDurationSeconds: 4.0,
    packName: 'futuristic',
    isBuiltIn: true,
    tags: ['impact', 'braam', 'voting-closed', 'ranking', 'hostile'],
  },
  'stage-ability-sci-fi-shift': {
    id: 'stage-ability-sci-fi-shift',
    name: 'Sci-Fi Ability / Shield Shift',
    category: AUDIO_CATEGORIES.STAGE,
    bus: AUDIO_BUSES.SFX,
    url: '/audio/stage/ability-sci-fi-shift.mp3',
    originalFile: 'trading_nation-transition-futuristic-ufo-121421.mp3',
    durationSeconds: 2.0,
    defaultVolume: 0.6,
    isLoop: false,
    offsetSeconds: 0,
    clipDurationSeconds: null,
    packName: 'futuristic',
    isBuiltIn: true,
    tags: ['sci-fi', 'ability', 'shield', 'freeze', 'polish-pending'],
  },
  'music-idle-keep-moving': {
    id: 'music-idle-keep-moving',
    name: 'Arena Idle — Keep Moving Forward',
    category: AUDIO_CATEGORIES.MUSIC,
    bus: AUDIO_BUSES.MUSIC,
    url: '/audio/music/idle-keep-moving.mp3',
    originalFile: 'bodleasons-keep-moving-forward-short-2-version-605930.mp3',
    durationSeconds: 34.0,
    defaultVolume: 0.25,
    isLoop: true,
    offsetSeconds: 0,
    clipDurationSeconds: null,
    packName: 'futuristic',
    isBuiltIn: true,
    tags: ['music', 'idle', 'waiting', 'loop'],
  },
  'music-voting-tension-loop': {
    id: 'music-voting-tension-loop',
    name: 'Votação / Suspense — Tension Loop',
    category: AUDIO_CATEGORIES.MUSIC,
    bus: AUDIO_BUSES.MUSIC,
    url: '/audio/music/voting-tension-loop.mp3',
    originalFile: 'hitslab-tension-suspense-mystery-629029.mp3',
    durationSeconds: 28.0,
    defaultVolume: 0.35,
    isLoop: true,
    offsetSeconds: 0,
    clipDurationSeconds: null,
    packName: 'futuristic',
    isBuiltIn: true,
    tags: ['music', 'tension', 'voting', 'podium', 'loop'],
  },
  'celebration-victory-fanfare': {
    id: 'celebration-victory-fanfare',
    name: 'Fanfarra de Vitória / Sino Sucesso',
    category: AUDIO_CATEGORIES.CELEBRATION,
    bus: AUDIO_BUSES.SFX,
    url: '/audio/celebration/victory-fanfare.mp3',
    originalFile: 'emand_edroff-victory-bell-success-fanfare-576275.mp3',
    durationSeconds: 6.0,
    defaultVolume: 0.85,
    isLoop: false,
    offsetSeconds: 0,
    clipDurationSeconds: null,
    packName: 'futuristic',
    isBuiltIn: true,
    tags: ['celebration', 'winner', 'unanimous', 'auction-won', 'achievement'],
  },
  'celebration-applause-stage': {
    id: 'celebration-applause-stage',
    name: 'Aplausos de Plateia (Palco)',
    category: AUDIO_CATEGORIES.CELEBRATION,
    bus: AUDIO_BUSES.AMBIENT,
    url: '/audio/celebration/applause-stage.mp3',
    originalFile: 'pwlpl-applause-sound-effect-521104.mp3',
    durationSeconds: 5.0,
    defaultVolume: 0.55,
    isLoop: false,
    offsetSeconds: 0,
    clipDurationSeconds: null,
    packName: 'futuristic',
    isBuiltIn: true,
    tags: ['audience', 'applause', 'pitch-finished', 'podium'],
  },
  'celebration-crowd-cheer': {
    id: 'celebration-crowd-cheer',
    name: 'Torcida / Celebração Intensa',
    category: AUDIO_CATEGORIES.CELEBRATION,
    bus: AUDIO_BUSES.AMBIENT,
    url: '/audio/celebration/crowd-cheer.mp3',
    originalFile: 'dragon-studio-crowd-cheer-406646.mp3',
    durationSeconds: 4.0,
    defaultVolume: 0.5,
    isLoop: false,
    offsetSeconds: 0,
    clipDurationSeconds: null,
    packName: 'futuristic',
    isBuiltIn: true,
    tags: ['audience', 'cheer', 'winner', 'unanimous'],
  },
});

export const SOUND_CATALOG_LIST = Object.freeze(Object.values(SOUND_CATALOG));

export function getSoundById(soundId) {
  return soundId ? SOUND_CATALOG[soundId] ?? null : null;
}
