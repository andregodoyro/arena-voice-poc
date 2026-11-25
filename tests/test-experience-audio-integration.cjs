const assert = require('assert');

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${name}: ${err.message}`);
    failed++;
  }
}

async function run() {
  console.log('============================================================');
  console.log('  ARENA VOICE — VALIDAÇÃO FASE 5D.4 (EVENTBUS & INTEGRATION)');
  console.log('============================================================\n');

  const { experienceEventBus, EXPERIENCE_EVENTS } = await import('../frontend/src/services/experienceEventBus.js');
  const { AudioEventSubscriber } = await import('../frontend/src/audio/AudioEventSubscriber.js');
  const { buildAudioConfigFromApi } = await import('../frontend/src/audio/audioConfigClient.js');

  console.log('[1] ExperienceEventBus...');

  await test('subscribe, emit/publish e unsubscribe funcionam corretamente', async () => {
    experienceEventBus.clear();
    const received = [];
    const unsub = experienceEventBus.subscribe(EXPERIENCE_EVENTS.CHAIR_PRESSED, (env) => {
      received.push(env);
    });

    experienceEventBus.publish({
      type: EXPERIENCE_EVENTS.CHAIR_PRESSED,
      source: 'TEST',
      payload: { chairId: 2 },
      metadata: { round: 1 },
    });

    assert.strictEqual(received.length, 1);
    assert.strictEqual(received[0].payload.chairId, 2);
    assert.strictEqual(received[0].source, 'TEST');
    assert.strictEqual(received[0].metadata.round, 1);
    assert.ok(typeof received[0].timestamp === 'number');

    unsub();
    experienceEventBus.emit(EXPERIENCE_EVENTS.CHAIR_PRESSED, { chairId: 3 });
    assert.strictEqual(received.length, 1);
  });

  await test('Prevenção de listeners duplicados (Set)', async () => {
    experienceEventBus.clear();
    let count = 0;
    const handler = () => { count++; };
    experienceEventBus.subscribe('CustomEvt', handler);
    experienceEventBus.subscribe('CustomEvt', handler);
    assert.strictEqual(experienceEventBus.getListenerCount('CustomEvt'), 1);

    experienceEventBus.emit('CustomEvt');
    assert.strictEqual(count, 1);
    experienceEventBus.clear();
  });

  await test('Múltiplos listeners em ordem e isolamento de erro', async () => {
    experienceEventBus.clear();
    const order = [];
    const origError = console.error;
    console.error = () => {};

    experienceEventBus.subscribe('OrderEvt', () => order.push('first'));
    experienceEventBus.subscribe('OrderEvt', () => { throw new Error('boom'); });
    experienceEventBus.subscribe('OrderEvt', () => order.push('third'));

    experienceEventBus.emit('OrderEvt');
    console.error = origError;

    assert.deepStrictEqual(order, ['first', 'third']);
    experienceEventBus.dispose();
    assert.strictEqual(experienceEventBus.getListenerCount(), 0);
  });

  console.log('\n[2] AudioEventSubscriber & AudioEngine Integration...');

  const createMockEngine = () => {
    const calls = [];
    const proceduralCalls = [];
    return {
      calls,
      proceduralCalls,
      playBuffer(key, opts) {
        calls.push({ key, ...opts });
        return { key, ...opts };
      },
      playTimerTicker(isCritical) {
        proceduralCalls.push({ method: 'playTimerTicker', isCritical });
      },
      playWhoosh() {
        proceduralCalls.push({ method: 'playWhoosh' });
      },
      playCelebration() {
        proceduralCalls.push({ method: 'playCelebration' });
      },
      playReset() {
        proceduralCalls.push({ method: 'playReset' });
      },
      playVotingOpen() {
        proceduralCalls.push({ method: 'playVotingOpen' });
      },
      playVotingClosed() {
        proceduralCalls.push({ method: 'playVotingClosed' });
      },
    };
  };

  await test('Evento com mapping habilitado respeita VolumeOverride, Bus, Offset e Duration', async () => {
    const engine = createMockEngine();
    const sub = new AudioEventSubscriber({ engine, bus: experienceEventBus });
    sub.setConfigFromApi(
      [
        {
          id: 's1',
          key: 'custom-whoosh',
          name: 'Custom Whoosh',
          category: 'stage',
          url: '/audio/stage/chair-bass-whoosh.mp3',
          bus: 'Ambient',
          defaultVolume: 0.5,
          isLoop: false,
          offsetSeconds: 0.2,
          durationSeconds: 1.5,
          isEnabled: true,
        },
      ],
      [
        {
          eventKey: 'chair.turn',
          soundKey: 'custom-whoosh',
          soundDefaultVolume: 0.5,
          soundIsEnabled: true,
          enabled: true,
          layerOrder: 0,
          volumeOverride: 0.92,
        },
      ]
    );

    sub.attach(experienceEventBus, engine);
    experienceEventBus.emit(EXPERIENCE_EVENTS.CHAIR_PRESSED, { chairId: 1 });
    sub.detach();

    assert.strictEqual(engine.calls.length, 1);
    assert.strictEqual(engine.calls[0].key, 'custom-whoosh');
    assert.strictEqual(engine.calls[0].bus, 'ambient');
    assert.strictEqual(engine.calls[0].volume, 0.92);
    assert.strictEqual(engine.calls[0].offset, 0.2);
    assert.strictEqual(engine.calls[0].duration, 1.5);
  });

  await test('Múltiplos layers respeitam LayerOrder crescente', async () => {
    const engine = createMockEngine();
    const sub = new AudioEventSubscriber({ engine, bus: experienceEventBus });
    sub.setConfigFromApi(
      [
        { id: 's1', key: 'layer-a', url: '/audio/ui/ui-sci-fi-click.mp3', bus: 'SFX', defaultVolume: 0.8, isEnabled: true },
        { id: 's2', key: 'layer-b', url: '/audio/celebration/crowd-cheer.mp3', bus: 'Ambient', defaultVolume: 0.6, isEnabled: true },
      ],
      [
        { eventKey: 'chair.unanimous', soundKey: 'layer-b', soundIsEnabled: true, enabled: true, layerOrder: 2, volumeOverride: 0.4 },
        { eventKey: 'chair.unanimous', soundKey: 'layer-a', soundIsEnabled: true, enabled: true, layerOrder: 1, volumeOverride: null },
      ]
    );

    sub.attach(experienceEventBus, engine);
    experienceEventBus.emit(EXPERIENCE_EVENTS.WINNER_REVEALED, {});
    sub.detach();

    assert.strictEqual(engine.calls.length, 2);
    assert.strictEqual(engine.calls[0].key, 'layer-a');
    assert.strictEqual(engine.calls[1].key, 'layer-b');
    assert.strictEqual(engine.calls[1].volume, 0.4);
  });

  await test('Mapping desabilitado ou asset desabilitado não dispara áudio', async () => {
    const engine = createMockEngine();
    const sub = new AudioEventSubscriber({ engine, bus: experienceEventBus });
    sub.setConfigFromApi(
      [
        { id: 's1', key: 'disabled-sound', url: '/audio/ui/ui-error-pop.mp3', bus: 'SFX', defaultVolume: 0.8, isEnabled: false },
        { id: 's2', key: 'enabled-sound', url: '/audio/ui/ui-sci-fi-click.mp3', bus: 'SFX', defaultVolume: 0.8, isEnabled: true },
      ],
      [
        { eventKey: 'chair.turn', soundKey: 'enabled-sound', soundIsEnabled: true, enabled: false, layerOrder: 0 },
        { eventKey: 'voting.open', soundKey: 'disabled-sound', soundIsEnabled: false, enabled: true, layerOrder: 0 },
      ]
    );

    sub.attach(experienceEventBus, engine);
    experienceEventBus.emit(EXPERIENCE_EVENTS.CHAIR_PRESSED, { chairId: 1 });
    experienceEventBus.emit(EXPERIENCE_EVENTS.VOTING_STARTED, {});
    sub.detach();

    assert.strictEqual(engine.calls.length, 0);
  });

  await test('attach() idempotente previne playback duplicado', async () => {
    const engine = createMockEngine();
    const sub = new AudioEventSubscriber({ engine, bus: experienceEventBus });
    sub.attach(experienceEventBus, engine);
    sub.attach(experienceEventBus, engine);

    experienceEventBus.emit(EXPERIENCE_EVENTS.VOTING_STARTED, {});
    sub.detach();

    assert.strictEqual(engine.calls.length, 1);
  });

  await test('Fallback para catálogo legado e síntese procedural funciona offline', async () => {
    const engine = createMockEngine();
    const sub = new AudioEventSubscriber({ engine, bus: experienceEventBus });
    const fallbackCfg = buildAudioConfigFromApi([], []);
    assert.strictEqual(fallbackCfg.source, 'local-fallback');
    sub.setConfig(fallbackCfg);

    sub.attach(experienceEventBus, engine);
    experienceEventBus.emit(EXPERIENCE_EVENTS.TIMER_URGENCY, { isCritical: true });
    sub.detach();

    assert.strictEqual(engine.proceduralCalls.length, 1);
    assert.strictEqual(engine.proceduralCalls[0].method, 'playTimerTicker');
    assert.strictEqual(engine.proceduralCalls[0].isCritical, true);
  });

  console.log('\n[3] QA & Regression — Bus Case, Show Flow E2E & Isolamento...');

  await test('buildAudioConfigFromApi normaliza Bus (Music/Ambient/SFX) para lowercase', async () => {
    const cfg = buildAudioConfigFromApi(
      [
        { id: '1', key: 'bg-music', url: '/audio/music/idle-keep-moving.mp3', bus: 'Music', isEnabled: true },
        { id: '2', key: 'crowd', url: '/audio/celebration/applause-stage.mp3', bus: 'Ambient', isEnabled: true },
      ],
      []
    );
    assert.strictEqual(cfg.catalog['bg-music'].bus, 'music');
    assert.strictEqual(cfg.catalog['crowd'].bus, 'ambient');
  });

  await test('Subscriber removido durante emissão não quebra iteração', async () => {
    experienceEventBus.clear();
    const calls = [];
    let unsubA = null;
    unsubA = experienceEventBus.subscribe('DynamicEvt', () => {
      calls.push('A');
      unsubA();
    });
    experienceEventBus.subscribe('DynamicEvt', () => calls.push('B'));
    experienceEventBus.emit('DynamicEvt');
    assert.deepStrictEqual(calls, ['A', 'B']);
    experienceEventBus.clear();
  });

  await test('Fluxo completo de Show Flow executa em ordem sem exceções', async () => {
    const engine = createMockEngine();
    const sub = new AudioEventSubscriber({ engine, bus: experienceEventBus });
    sub.attach(experienceEventBus, engine);

    experienceEventBus.emit(EXPERIENCE_EVENTS.STAGE_CHANGED, { stage: 'Standby' });
    experienceEventBus.emit(EXPERIENCE_EVENTS.STAGE_CHANGED, { stage: 'PitchRunning' });
    experienceEventBus.emit(EXPERIENCE_EVENTS.VOTING_STARTED, {});
    experienceEventBus.emit(EXPERIENCE_EVENTS.CHAIR_PRESSED, { chairId: 1 });
    experienceEventBus.emit(EXPERIENCE_EVENTS.TIMER_URGENCY, { isCritical: true });
    experienceEventBus.emit(EXPERIENCE_EVENTS.WINNER_REVEALED, {});
    experienceEventBus.emit(EXPERIENCE_EVENTS.VOTING_FINISHED, {});
    experienceEventBus.emit(EXPERIENCE_EVENTS.RESULTS_CALCULATED, { round: { result: 'Approved' } });
    experienceEventBus.emit(EXPERIENCE_EVENTS.ARENA_RESET, {});
    sub.detach();

    assert.ok(engine.calls.length >= 6, `Esperado >= 6 chamadas de buffer, obtido ${engine.calls.length}`);
    assert.strictEqual(engine.proceduralCalls.length, 1);
  });

  console.log('\n[4] Sound Design Polish (5D.6) — Transições, Pitch Jitter & Mix...');

  await test('Transições VotingFinished, PitchRunning e ArenaReset acionam fade-out de loops', async () => {
    const stopCalls = [];
    const engine = {
      ...createMockEngine(),
      stopLoop(bus, fadeOutMs) {
        stopCalls.push({ bus, fadeOutMs });
      },
    };
    const sub = new AudioEventSubscriber({ engine, bus: experienceEventBus });
    sub.attach(experienceEventBus, engine);

    experienceEventBus.emit(EXPERIENCE_EVENTS.STAGE_CHANGED, { stage: 'PitchRunning' });
    experienceEventBus.emit(EXPERIENCE_EVENTS.VOTING_FINISHED, {});
    experienceEventBus.emit(EXPERIENCE_EVENTS.ARENA_RESET, {});
    sub.detach();

    assert.ok(stopCalls.some((c) => c.bus === 'music' && c.fadeOutMs >= 700));
    assert.ok(stopCalls.some((c) => c.bus === 'ambient' && c.fadeOutMs >= 700));
  });

  await test('pitchJitter sutil aplicado em SFX one-shot e 0 em Music loops', async () => {
    const engine = createMockEngine();
    const sub = new AudioEventSubscriber({ engine, bus: experienceEventBus });
    sub.setConfigFromApi(
      [
        { id: 's1', key: 'sfx-hit', url: '/audio/stage/chair-bass-whoosh.mp3', bus: 'SFX', defaultVolume: 0.8, isLoop: false, isEnabled: true },
        { id: 's2', key: 'bg-loop', url: '/audio/music/voting-tension-loop.mp3', bus: 'Music', defaultVolume: 0.4, isLoop: true, isEnabled: true },
      ],
      [
        { eventKey: 'chair.turn', soundKey: 'sfx-hit', soundIsEnabled: true, enabled: true, layerOrder: 0 },
        { eventKey: 'voting.open', soundKey: 'bg-loop', soundIsEnabled: true, enabled: true, layerOrder: 0 },
      ]
    );

    sub.attach(experienceEventBus, engine);
    experienceEventBus.emit(EXPERIENCE_EVENTS.CHAIR_PRESSED, { chairId: 1 });
    experienceEventBus.emit(EXPERIENCE_EVENTS.VOTING_STARTED, {});
    sub.detach();

    assert.strictEqual(engine.calls[0].pitchJitter, 0.025);
    assert.strictEqual(engine.calls[1].pitchJitter, 0);
  });

  console.log('\n============================================================');
  console.log(`RESULTADO 5D.4: ${passed} PASS | ${failed} FAIL`);
  console.log('============================================================');
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
