const assert = require('assert');

const BASE_URL = process.env.ARENA_API_URL || 'http://127.0.0.1:5000';
const DEVICE_KEY = process.env.ARENA_DEVICE_API_KEY || 'test-device-key';
const ADMIN_CREDS = {
  email: 'admin@arenavoice.local',
  password: process.env.ARENA_ADMIN_PASSWORD || 'ArenaAdmin@2026',
};

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

async function api(path, { method = 'GET', token = null, deviceKey = null, body = null } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (deviceKey) headers['X-Device-Key'] = deviceKey;
  if (body !== null) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== null ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, data };
}

async function ensureActiveProject(token) {
  const state = await api('/api/state');
  if (state.data?.currentProject?.id) return state.data.currentProject.id;

  const projects = await api('/api/projects', { token });
  const first = Array.isArray(projects.data) ? projects.data[0] : null;
  if (first?.id) {
    await api(`/api/projects/${first.id}/activate`, { method: 'POST', token });
    return first.id;
  }
  throw new Error('Nenhum projeto disponível para ensaio operacional.');
}

async function run() {
  console.log('============================================================');
  console.log('  ARENA VOICE — FASE 5D.7 (FULL SHOW OPERATIONAL REHEARSAL)');
  console.log('============================================================\n');

  const loginRes = await api('/api/auth/login', { method: 'POST', body: ADMIN_CREDS });
  assert.strictEqual(loginRes.status, 200, 'Admin login failed');
  const token = loginRes.data.accessToken || loginRes.data.token;

  await ensureActiveProject(token);
  await api('/api/pitch/reset', { method: 'POST', token });

  const { experienceEventBus, EXPERIENCE_EVENTS } = await import('../frontend/src/services/experienceEventBus.js');
  const { AudioEventSubscriber } = await import('../frontend/src/audio/AudioEventSubscriber.js');

  const stateInit = await api('/api/state');
  const lockoutEnabled = Boolean(stateInit.data?.currentEvent?.timers?.lockoutEnabled);

  console.log(`[Cenário A & I] Show Normal + Proteção contra Spam/Estados Inválidos (lockoutEnabled=${lockoutEnabled})...`);

  await test('Cenário I.1: ESP32 sem X-Device-Key é rejeitado com 401', async () => {
    const res = await api('/api/chair-press', { method: 'POST', body: { chairId: 1, source: 'ESP32_SIM' } });
    assert.strictEqual(res.status, 401);
  });

  await test('Cenário I.2: ESP32 em Waiting respeita política LockoutEnabled do evento', async () => {
    const res = await api('/api/chair-press', {
      method: 'POST',
      deviceKey: DEVICE_KEY,
      body: { chairId: 1, source: 'ESP32_SIM' },
    });
    if (lockoutEnabled) {
      assert.strictEqual(res.status, 409);
      assert.strictEqual(res.data.accepted, false);
    } else {
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.accepted, true);
    }
    await api('/api/pitch/reset', { method: 'POST', token });
  });

  await test('Cenário I.3: Transição inválida Waiting -> Finished é bloqueada com 422', async () => {
    const res = await api('/api/pitch/transition', {
      method: 'POST',
      token,
      body: { targetStage: 'Finished' },
    });
    assert.strictEqual(res.status, 422);
  });

  await test('Cenário A: Show normal (Waiting -> PitchRunning -> VotingOpen -> VotingClosed -> Finished, 0 viradas)', async () => {
    for (const stage of ['PitchRunning', 'VotingOpen', 'VotingClosed', 'Finished']) {
      const r = await api('/api/pitch/transition', { method: 'POST', token, body: { targetStage: stage } });
      assert.strictEqual(r.status, 200, `Falha na transição para ${stage}: ${JSON.stringify(r.data)}`);
    }
    const state = await api('/api/state');
    assert.strictEqual(state.data.activeCount, 0);
  });

  console.log('\n[Cenário B, C, D & I] Jurados Físicos (ESP32 Simulado), Concorrência & Unanimidade...');

  await test('Cenário B & I.4: Virada individual + clique duplicado idempotente', async () => {
    await api('/api/pitch/reset', { method: 'POST', token });
    await api('/api/pitch/transition', { method: 'POST', token, body: { targetStage: 'PitchRunning' } });
    await api('/api/pitch/transition', { method: 'POST', token, body: { targetStage: 'VotingOpen' } });

    const first = await api('/api/chair-press', {
      method: 'POST',
      deviceKey: DEVICE_KEY,
      body: { chairId: 1, source: 'ESP32_1' },
    });
    assert.strictEqual(first.status, 200);
    assert.strictEqual(first.data.alreadyTurned, false);
    assert.strictEqual(first.data.activeCount, 1);

    const dup = await api('/api/chair-press', {
      method: 'POST',
      deviceKey: DEVICE_KEY,
      body: { chairId: 1, source: 'ESP32_1' },
    });
    assert.strictEqual(dup.status, 200);
    assert.strictEqual(dup.data.alreadyTurned, true);
    assert.strictEqual(dup.data.activeCount, 1);
  });

  await test('Cenário C: Viradas simultâneas de múltiplos jurados (cadeiras 2 e 3)', async () => {
    const [r2, r3] = await Promise.all([
      api('/api/chair-press', { method: 'POST', deviceKey: DEVICE_KEY, body: { chairId: 2, source: 'ESP32_2' } }),
      api('/api/chair-press', { method: 'POST', deviceKey: DEVICE_KEY, body: { chairId: 3, source: 'ESP32_3' } }),
    ]);
    assert.strictEqual(r2.status, 200);
    assert.strictEqual(r3.status, 200);
    const state = await api('/api/state');
    assert.strictEqual(state.data.activeCount, 3);
  });

  await test('Cenário D & E: Unanimidade (5/5) + Reidratação via GET /api/state', async () => {
    await api('/api/chair-press', { method: 'POST', deviceKey: DEVICE_KEY, body: { chairId: 4, source: 'ESP32_4' } });
    const r5 = await api('/api/chair-press', { method: 'POST', deviceKey: DEVICE_KEY, body: { chairId: 5, source: 'ESP32_5' } });
    assert.strictEqual(r5.status, 200);
    assert.strictEqual(r5.data.activeCount, 5);

    const rehydrated = await api('/api/state');
    assert.strictEqual(rehydrated.data.activeCount, 5);
    assert.strictEqual(rehydrated.data.pitchState.stageName, 'VotingOpen');
  });

  await test('Cenário I.5: Acionamento após VotingClosed respeita política LockoutEnabled', async () => {
    await api('/api/pitch/transition', { method: 'POST', token, body: { targetStage: 'VotingClosed' } });
    const late = await api('/api/chair-press', {
      method: 'POST',
      deviceKey: DEVICE_KEY,
      body: { chairId: 1, source: 'ESP32_LATE' },
    });
    assert.strictEqual(late.status, lockoutEnabled ? 409 : 200);
  });

  console.log('\n[Cenário F, G & H] Reset no Meio do Show, Ciclos Consecutivos & Lifecycle de Áudio...');

  await test('Cenário F: Reset no meio da votação limpa cadeiras, estágio e loops de áudio', async () => {
    await api('/api/pitch/reset', { method: 'POST', token });
    await api('/api/pitch/transition', { method: 'POST', token, body: { targetStage: 'PitchRunning' } });
    await api('/api/pitch/transition', { method: 'POST', token, body: { targetStage: 'VotingOpen' } });
    await api('/api/chair-press', { method: 'POST', deviceKey: DEVICE_KEY, body: { chairId: 2, source: 'ESP32_2' } });

    const reset = await api('/api/pitch/reset', { method: 'POST', token });
    assert.strictEqual(reset.status, 200);

    const state = await api('/api/state');
    assert.strictEqual(state.data.activeCount, 0);
    assert.strictEqual(state.data.pitchState.stageName, 'Waiting');
  });

  await test('Cenário G & H: 3 ciclos consecutivos no EventBus + AudioEventSubscriber sem leak de listeners', async () => {
    const stopCalls = [];
    const playCalls = [];
    const mockEngine = {
      playBuffer(key, opts) { playCalls.push({ key, ...opts }); return { key }; },
      stopLoop(bus, ms) { stopCalls.push({ bus, ms }); },
      playTimerTicker() {},
      playWhoosh() {},
      playCelebration() {},
      playReset() {},
      playVotingOpen() {},
      playVotingClosed() {},
    };

    experienceEventBus.clear();
    const sub = new AudioEventSubscriber({ engine: mockEngine, bus: experienceEventBus });
    const detach = sub.attach(experienceEventBus, mockEngine);
    const baselineListeners = experienceEventBus.getListenerCount();

    for (let round = 1; round <= 3; round++) {
      experienceEventBus.emit(EXPERIENCE_EVENTS.STAGE_CHANGED, { stage: 'PitchRunning' });
      experienceEventBus.emit(EXPERIENCE_EVENTS.VOTING_STARTED, {});
      experienceEventBus.emit(EXPERIENCE_EVENTS.CHAIR_PRESSED, { chairId: 1 });
      experienceEventBus.emit(EXPERIENCE_EVENTS.VOTING_FINISHED, {});
      experienceEventBus.emit(EXPERIENCE_EVENTS.ARENA_RESET, {});
    }

    assert.strictEqual(experienceEventBus.getListenerCount(), baselineListeners);
    assert.ok(playCalls.length >= 12);
    assert.ok(stopCalls.length >= 9);

    detach();
    assert.strictEqual(experienceEventBus.getListenerCount(), 0);
  });

  // Limpeza final para deixar a Arena em Waiting limpo
  await api('/api/pitch/reset', { method: 'POST', token });

  console.log('\n============================================================');
  console.log(`RESULTADO 5D.7: ${passed} PASS | ${failed} FAIL`);
  console.log('============================================================');
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
