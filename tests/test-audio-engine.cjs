/**
 * test-audio-engine.cjs — Suíte determinística da Fase 5D.2 (AudioEngine)
 * Valida com mocks de Web Audio API e localStorage:
 * - 4 buses (Master, SFX, Ambient, Music) + ganho e encaminhamento
 * - Persistência e recuperação de preferências (incluindo JSON inválido/corrompido)
 * - Mute / Unmute e Master Volume
 * - Cache, deduplicação de requests, 404 e falha de decodeAudioData
 * - Cooldown, limite de simultaneidade e prioridade
 * - Ducking suave e restauração coordenada
 * - Crossfade de loops (sem sobreposição indevida)
 * - Fallback procedural e bloqueio antes do unlock()
 * - Regressão nos métodos atuais (playWhoosh, playVotingOpen, playTimerTicker, etc.)
 */

const path = require('path');
const { pathToFileURL } = require('url');

let pass = 0;
let fail = 0;

function assert(cond, msg) {
  if (cond) {
    pass++;
    console.log(`  [PASS] ${msg}`);
  } else {
    fail++;
    console.error(`  [FAIL] ${msg}`);
    process.exitCode = 1;
  }
}

function createMockStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    _dump: () => Object.fromEntries(store.entries()),
  };
}

function createMockAudioContext(options = {}) {
  const createdNodes = [];
  const createdSources = [];

  class MockGainNode {
    constructor() {
      this.connections = [];
      this.gain = {
        value: 1,
        setValueAtTime: (v) => { this.gain.value = v; },
        cancelScheduledValues: () => {},
        setTargetAtTime: (v) => { this.gain.value = v; },
        linearRampToValueAtTime: (v) => { this.gain.value = v; },
        exponentialRampToValueAtTime: (v) => { this.gain.value = v; },
      };
      createdNodes.push(this);
    }
    connect(target) {
      this.connections.push(target);
      return target;
    }
  }

  class MockSourceNode {
    constructor() {
      this.buffer = null;
      this.loop = false;
      this.started = false;
      this.stopped = false;
      this.startArgs = null;
      this.connections = [];
      this.playbackRate = { setValueAtTime: () => {} };
      this.onended = null;
      createdSources.push(this);
    }
    connect(target) {
      this.connections.push(target);
      return target;
    }
    start(...args) {
      this.started = true;
      this.startArgs = args;
    }
    stop() {
      this.stopped = true;
      if (typeof this.onended === 'function') {
        this.onended();
      }
    }
  }

  class MockOscillator {
    constructor() {
      this.type = 'sine';
      this.frequency = { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} };
    }
    connect() {}
    start() {}
    stop() {}
  }

  class MockFilter {
    constructor() {
      this.type = 'bandpass';
      this.Q = { setValueAtTime: () => {} };
      this.frequency = { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} };
    }
    connect() {}
  }

  return class MockAudioContext {
    constructor() {
      this.state = options.initialState || 'suspended';
      this.currentTime = 0;
      this.sampleRate = 44100;
      this.destination = { isDestination: true };
      this._createdNodes = createdNodes;
      this._createdSources = createdSources;
    }
    createGain() { return new MockGainNode(); }
    createBufferSource() { return new MockSourceNode(); }
    createOscillator() { return new MockOscillator(); }
    createBiquadFilter() { return new MockFilter(); }
    createBuffer(channels, length, sr) {
      return { channels, length, sampleRate: sr, getChannelData: () => new Float32Array(length) };
    }
    async resume() { this.state = 'running'; }
    async decodeAudioData(ab) {
      if (options.failDecode) throw new Error('Corrupt audio');
      return { duration: 2.5, byteLength: ab?.byteLength || 16 };
    }
  };
}

async function run() {
  console.log('============================================================');
  console.log('  ARENA VOICE — VALIDAÇÃO FASE 5D.2 (AUDIO ENGINE)');
  console.log('============================================================\n');

  const rootDir = path.resolve(__dirname, '..');
  const engineUrl = pathToFileURL(path.join(rootDir, 'frontend', 'src', 'audio', 'AudioEngine.js')).href;
  const eventsUrl = pathToFileURL(path.join(rootDir, 'frontend', 'src', 'audio', 'soundMap.js')).href;

  const { AudioEngine } = await import(engineUrl);
  const { SOUND_EVENTS, SOUND_PRIORITIES } = await import(eventsUrl);

  // ── 1. Persistência: dados inválidos/corrompidos no localStorage ──────────
  console.log('[1] Persistência & Validação de Preferências...');
  globalThis.localStorage = createMockStorage({
    arena_audio_mixer_v1: '{corrupted_json',
  });
  const engineCorrupt = new AudioEngine();
  assert(engineCorrupt.masterVolume === 0.8, 'JSON corrompido cai no default masterVolume (0.8)');
  assert(engineCorrupt.musicVolume === 0.5, 'JSON corrompido cai no default musicVolume (0.5)');

  globalThis.localStorage = createMockStorage({
    arena_audio_mixer_v1: JSON.stringify({
      masterVolume: 9.5,
      sfxVolume: -3,
      ambientVolume: 'nan',
      musicVolume: 0.42,
      isMuted: true,
    }),
  });
  const engineClamped = new AudioEngine();
  assert(engineClamped.masterVolume === 1, 'masterVolume > 1 é limitado a 1');
  assert(engineClamped.sfxVolume === 0, 'sfxVolume < 0 é limitado a 0');
  assert(engineClamped.ambientVolume === 0.7, 'ambientVolume NaN cai no default (0.7)');
  assert(engineClamped.musicVolume === 0.42, 'musicVolume válido (0.42) é restaurado');
  assert(engineClamped.isMuted === true, 'isMuted válido (true) é restaurado');

  // ── 2. Inicialização sem unlock não dispara áudio ────────────────────────
  console.log('\n[2] Segurança antes do unlock()...');
  globalThis.localStorage = createMockStorage();
  globalThis.AudioContext = createMockAudioContext({ initialState: 'suspended' });
  const engine = new AudioEngine({ maxConcurrentVoices: 3 });

  assert(engine.playEvent(SOUND_EVENTS.UI_CLICK) === null, 'playEvent antes do unlock retorna null sem erro');
  assert(engine.playBuffer('ui-sci-fi-click') === null, 'playBuffer antes do unlock retorna null sem erro');

  // ── 3. Unlock + 4 Buses + Master/Mute ────────────────────────────────────
  console.log('\n[3] Unlock, 4 Buses (Master, SFX, Ambient, Music) e Mute...');
  const unlocked = await engine.unlock();
  assert(unlocked === true && engine.isUnlocked === true, 'unlock() retoma AudioContext para running');
  assert(engine.sfxGainNode.connections.includes(engine.masterGainNode), 'sfxGainNode conectado ao masterGainNode');
  assert(engine.ambientGainNode.connections.includes(engine.ambientDuckGainNode), 'ambientGainNode conectado ao ambientDuckGainNode');
  assert(engine.ambientDuckGainNode.connections.includes(engine.masterGainNode), 'ambientDuckGainNode conectado ao masterGainNode');
  assert(engine.musicGainNode.connections.includes(engine.musicDuckGainNode), 'musicGainNode conectado ao musicDuckGainNode');
  assert(engine.musicDuckGainNode.connections.includes(engine.masterGainNode), 'musicDuckGainNode conectado ao masterGainNode');

  engine.setMasterVolume(0.65);
  engine.setSfxVolume(0.9);
  engine.setAmbientVolume(0.4);
  engine.setMusicVolume(0.3);
  assert(engine.masterGainNode.gain.value === 0.65, 'setMasterVolume ajusta ganho Master');
  assert(engine.sfxGainNode.gain.value === 0.9, 'setSfxVolume ajusta ganho SFX');
  assert(engine.ambientGainNode.gain.value === 0.4, 'setAmbientVolume ajusta ganho Ambient');
  assert(engine.musicGainNode.gain.value === 0.3, 'setMusicVolume ajusta ganho Music');

  const saved = JSON.parse(globalThis.localStorage.getItem('arena_audio_mixer_v1'));
  assert(saved.musicVolume === 0.3 && saved.masterVolume === 0.65, 'Preferências persistidas corretamente no localStorage');

  engine.setMute(true);
  assert(engine.masterGainNode.gain.value === 0, 'setMute(true) zera Master Gain');
  engine.setMute(false);
  assert(engine.masterGainNode.gain.value === 0.65, 'setMute(false) restaura Master Gain anterior');

  // ── 4. Cache, Deduplicação, 404 e Erro de Decoding ───────────────────────
  console.log('\n[4] Cache de buffers, deduplicação, 404 e falha de decode...');
  let fetchCalls = 0;
  globalThis.fetch = async (url) => {
    fetchCalls++;
    if (url.includes('404')) return { ok: false, status: 404 };
    return { ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(32) };
  };

  const [b1, b2] = await Promise.all([
    engine.loadBuffer('ui-sci-fi-click', '/audio/ui/ui-sci-fi-click.mp3'),
    engine.loadBuffer('ui-sci-fi-click', '/audio/ui/ui-sci-fi-click.mp3'),
  ]);
  assert(b1 !== null && b1 === b2, 'loadBuffer simultâneo retorna o mesmo buffer');
  assert(fetchCalls === 1, `Deduplicação executou apenas 1 fetch (atual: ${fetchCalls})`);

  const notFoundBuf = await engine.loadBuffer('missing-404', '/audio/missing-404.mp3');
  assert(notFoundBuf === null && engine.failedAssets.has('missing-404'), 'Asset 404 retorna null e marca failedAssets');
  const retryCountBefore = fetchCalls;
  await engine.loadBuffer('missing-404', '/audio/missing-404.mp3');
  assert(fetchCalls === retryCountBefore, 'Asset marcado como falho não gera loop de fetches repetidos');

  globalThis.AudioContext = createMockAudioContext({ initialState: 'running', failDecode: true });
  const decodeFailEngine = new AudioEngine();
  decodeFailEngine.init();
  const badDecode = await decodeFailEngine.loadBuffer('corrupt-mp3', '/audio/corrupt.mp3');
  assert(badDecode === null, 'Falha em decodeAudioData é tratada graciosamente retornando null');

  // ── 5. Cooldown, Prioridade e Limite de Simultaneidade ───────────────────
  console.log('\n[5] Cooldown, Limite de Simultaneidade e Prioridade...');
  const s1 = engine.playBuffer('ui-sci-fi-click', { cooldownMs: 500, priority: SOUND_PRIORITIES.LOW });
  assert(s1 !== null && s1.started === true, 'Primeira reprodução inicia AudioBufferSourceNode');
  const sDup = engine.playBuffer('ui-sci-fi-click', { cooldownMs: 500 });
  assert(sDup === null, 'Disparo repetido dentro da janela de cooldown é ignorado');

  // Preencher até maxConcurrentVoices = 3
  await engine.loadBuffer('ui-hover-tick', '/audio/ui/ui-hover-tick.mp3');
  await engine.loadBuffer('stage-braam-impact-dark', '/audio/stage/braam-impact-dark.mp3');
  const low1 = engine.playBuffer('ui-hover-tick', { priority: SOUND_PRIORITIES.LOW, cooldownMs: 0 });
  const med1 = engine.playBuffer('ui-sci-fi-click', { priority: SOUND_PRIORITIES.MEDIUM, cooldownMs: 0 });
  assert(engine.activeVoices.size === 3, `Simultaneidade atingiu teto configurado (3)`);

  // Voz LOW com fila cheia de >= LOW: s1 (LOW) ou low1 (LOW) é substituído apenas se prioridade >= menor;
  // Quando todas as vozes são HIGH/CRITICAL, uma LOW deve ser descartada:
  low1.stop();
  s1.stop();
  med1.stop();
  const h1 = engine.playBuffer('ui-sci-fi-click', { priority: SOUND_PRIORITIES.HIGH, cooldownMs: 0 });
  const h2 = engine.playBuffer('ui-hover-tick', { priority: SOUND_PRIORITIES.HIGH, cooldownMs: 0 });
  const h3 = engine.playBuffer('stage-braam-impact-dark', { priority: SOUND_PRIORITIES.HIGH, cooldownMs: 0 });
  const lowBlocked = engine.playBuffer('ui-hover-tick', { priority: SOUND_PRIORITIES.LOW, cooldownMs: 0 });
  assert(lowBlocked === null, 'Voz LOW é descartada quando limite de vozes está ocupado por prioridades HIGH');
  const critOverride = engine.playBuffer('stage-braam-impact-dark', { priority: SOUND_PRIORITIES.CRITICAL, cooldownMs: 0 });
  assert(critOverride !== null, 'Voz CRITICAL substitui voz de menor prioridade quando no limite');
  h1.stop(); h2.stop(); h3.stop(); critOverride.stop();

  // ── 6. Ducking & Crossfade de Loops ──────────────────────────────────────
  console.log('\n[6] Ducking suave e Crossfade de loops...');
  const releaseDuck = engine.triggerDucking({ durationMs: 5000, musicFactor: 0.2, ambientFactor: 0.4 });
  assert(engine.musicDuckGainNode.gain.value === 0.2, 'Ducking reduz musicDuckGainNode suavemente para 0.2');
  assert(engine.ambientDuckGainNode.gain.value === 0.4, 'Ducking reduz ambientDuckGainNode suavemente para 0.4');
  releaseDuck();
  assert(engine.musicDuckGainNode.gain.value === 1.0, 'Restauração de ducking devolve musicDuckGainNode para 1.0');

  await engine.loadBuffer('music-idle-keep-moving', '/audio/music/idle-keep-moving.mp3');
  await engine.loadBuffer('music-voting-tension-loop', '/audio/music/voting-tension-loop.mp3');
  const loop1 = engine.playBuffer('music-idle-keep-moving', { loop: true, bus: 'music', crossfadeMs: 0 });
  assert(engine.activeLoops.get('music')?.key === 'music-idle-keep-moving', 'Loop 1 ativo no barramento music');
  const loop2 = engine.playBuffer('music-voting-tension-loop', { loop: true, bus: 'music', crossfadeMs: 0 });
  assert(loop1.stopped === true, 'Crossfade encerrou o loop anterior ao iniciar o novo');
  assert(engine.activeLoops.get('music')?.key === 'music-voting-tension-loop', 'Apenas o novo loop permanece registrado em music');
  engine.stopLoop('music', 0);
  assert(loop2.stopped === true && !engine.activeLoops.has('music'), 'stopLoop encerra faixa e limpa estado');

  // ── 7. playEvent + Fallback Procedural + Regressão ───────────────────────
  console.log('\n[7] playEvent (SOUND_MAP), Fallback Procedural e Regressão...');
  let tickerCalled = false;
  const origTicker = engine.playTimerTicker.bind(engine);
  engine.playTimerTicker = (isCrit) => { tickerCalled = isCrit === true; origTicker(isCrit); };
  engine.playEvent(SOUND_EVENTS.COUNTDOWN_TICK, { isCritical: true });
  assert(tickerCalled === true, 'playEvent sem asset externo aciona fallback procedural playTimerTicker');

  // Testar métodos legados preservados sem erro
  engine.playWhoosh();
  engine.playVotingOpen();
  engine.playVotingClosed();
  engine.playCelebration();
  engine.playReset();
  engine.playProceduralTone(440, 'sine', 0.1, 0.1);
  assert(true, 'Todos os métodos procedurais legados executaram sem erro');

  console.log('\n============================================================');
  console.log(`RESULTADO 5D.2: ${pass} PASS | ${fail} FAIL`);
  console.log('============================================================');
}

run().catch((err) => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
