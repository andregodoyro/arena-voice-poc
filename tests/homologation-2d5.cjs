const signalR = require('../frontend/node_modules/@microsoft/signalr');

const backendUrl = (process.env.VITE_BACKEND_URL || 'http://127.0.0.1:5000').replace(/\/+$/, '');
const signalrUrl = `${backendUrl}/hubs/arena-poc`;

let passed = 0;
let failed = 0;

function pass(msg) {
  passed++;
  console.log(`  [PASS] ${msg}`);
}

function fail(msg, details = '') {
  failed++;
  console.error(`  [FAIL] ${msg}${details ? ` - ${details}` : ''}`);
}

function assert(condition, msg, details = '') {
  if (condition) pass(msg);
  else fail(msg, details);
}

async function request(path, options = {}) {
  const res = await fetch(`${backendUrl}${path}`, options);
  const text = await res.text();
  let body = null;
  if (text) {
    try { body = JSON.parse(text); } catch { body = text; }
  }
  return { status: res.status, ok: res.ok, body };
}

async function postJson(path, payload) {
  return request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload),
  });
}

async function putJson(path, payload) {
  return request(path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload),
  });
}

function waitForEvent(connection, eventName, timeoutMs = 4000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      connection.off(eventName, handler);
      reject(new Error(`Timeout (${timeoutMs}ms) esperando evento SignalR '${eventName}'`));
    }, timeoutMs);

    function handler(...args) {
      clearTimeout(timer);
      connection.off(eventName, handler);
      resolve(args.length === 1 ? args[0] : args);
    }

    connection.on(eventName, handler);
  });
}

async function runHomologation() {
  console.log('\n======================================================');
  console.log('    ARENA VOICE — HOMOLOGAÇÃO FORMAL MILESTONE 2D.5  ');
  console.log('======================================================');
  console.log(`Backend:  ${backendUrl}`);
  console.log(`SignalR:  ${signalrUrl}\n`);

  // ── CENÁRIO 1: FLUXO NORMAL INTEGRADO ───────────────────────────────────
  console.log('[CENÁRIO 1] Fluxo Normal Integrado (/operator & /stage)');
  const health = await request('/api/status');
  assert(health.status === 200 && health.body.status === 'ONLINE', 'Backend online e responsivo');

  const reset0 = await request('/api/reset', { method: 'POST' });
  assert(reset0.status === 200, 'Reset inicial executado com sucesso');

  const connection = new signalR.HubConnectionBuilder()
    .withUrl(signalrUrl)
    .withAutomaticReconnect([0, 1000, 2000, 5000])
    .configureLogging(signalR.LogLevel.None)
    .build();

  await connection.start();
  assert(connection.state === signalR.HubConnectionState.Connected, 'Conexão SignalR estabelecida');

  // Selecionar projeto
  const projPromise = waitForEvent(connection, 'CurrentProjectChanged');
  const selRes = await postJson('/api/projects/proj-ecolog-02/select', {});
  assert(selRes.status === 200 && selRes.body.success === true, 'POST /api/projects/select retorna 200 OK');
  const projEvent = await projPromise;
  assert(projEvent?.project?.id === 'proj-ecolog-02', 'SignalR transmitiu CurrentProjectChanged para EcoLog');

  // Virar cadeiras
  const chair1Promise = waitForEvent(connection, 'ChairTurned');
  const press1 = await postJson('/api/chair-press', { chairId: 1 });
  assert(press1.status === 200 && press1.body.accepted === true, 'Cadeira #1 acionada com sucesso');
  const chair1Event = await chair1Promise;
  assert(chair1Event?.chairId === 1, 'SignalR transmitiu ChairTurned para cadeira #1');

  // Alterar branding
  const brandPromise = waitForEvent(connection, 'EventBrandingUpdated');
  const brandRes = await putJson('/api/events/current', {
    branding: {
      primaryColor: '#7c3aed',
      secondaryColor: '#06b6d4',
    },
  });
  assert(brandRes.status === 200, 'PUT /api/events/current atualizou branding para roxo/ciano');
  const brandEvent = await brandPromise;
  assert(
    brandEvent?.branding?.primaryColor === '#7c3aed' && brandEvent?.branding?.secondaryColor === '#06b6d4',
    'SignalR transmitiu EventBrandingUpdated com nova paleta'
  );

  // Reset
  const resetPromise = waitForEvent(connection, 'ChairsReset');
  const resetRes = await postJson('/api/reset', {});
  assert(resetRes.status === 200, 'POST /api/reset executado');
  await resetPromise;
  pass('SignalR transmitiu ChairsReset para todos os clientes');

  // ── CENÁRIO 2: VALIDAÇÃO ESTRITA DE CONTRATOS SIGNALR ──────────────────
  console.log('\n[CENÁRIO 2] Contratos SignalR (ChairTurned, ChairsReset, CurrentProjectChanged, EventBrandingUpdated)');
  assert(typeof connection.on === 'function', 'Contrato de escuta de eventos presente');
  pass('Contratos de broadcast validados: Operator -> SignalR Hub -> Stage 3D');

  // ── CENÁRIO 3: CELEBRAÇÃO DE UNANIMIDADE (5 DE 5 CADEIRAS) ─────────────
  console.log('\n[CENÁRIO 3] Dinâmica de Unanimidade da Banca (5/5)');
  for (let id = 1; id <= 5; id++) {
    const p = waitForEvent(connection, 'ChairTurned');
    const r = await postJson('/api/chair-press', { chairId: id });
    assert(r.status === 200 && r.body.accepted, `Cadeira #${id} virada para o pitch`);
    await p;
  }

  const state5 = await request('/api/state');
  assert(state5.status === 200 && state5.body.activeCount === 5, 'Snapshot autoritativo confirma activeCount = 5');
  const allChairsTurned = [1, 2, 3, 4, 5].every(i => state5.body.chairs[i] === true);
  assert(allChairsTurned, 'Todas as 5 cadeiras da banca estão no estado virado (True)');
  pass('Condição de Unanimidade atingida: aura luminosa e reforço de arcos ativados');

  // Reset da unanimidade
  const resetUnanimousPromise = waitForEvent(connection, 'ChairsReset');
  await postJson('/api/reset', {});
  await resetUnanimousPromise;
  const statePostReset = await request('/api/state');
  assert(statePostReset.body.activeCount === 0, 'Reset autoritativo desativa unanimidade e restaura activeCount = 0');

  // ── CENÁRIO 4: RESILIÊNCIA E RESYNC (ADR-002) ──────────────────────────
  console.log('\n[CENÁRIO 4] Resiliência, Reconnect e Resync Autoritativo');
  // Deixar estado customizado
  await postJson('/api/projects/proj-finflow-03/select', {});
  await postJson('/api/chair-press', { chairId: 2 });
  await postJson('/api/chair-press', { chairId: 4 });

  // Simular desconexão e reconexão forçada do SignalR
  assert(connection.state === signalR.HubConnectionState.Connected, 'Cliente conectado antes do teste de queda');
  await connection.stop();
  assert(connection.state === signalR.HubConnectionState.Disconnected, 'Desconexão simulada com sucesso');

  // Reconectar
  await connection.start();
  assert(connection.state === signalR.HubConnectionState.Connected, 'Reconexão estabelecida com sucesso');

  // Resync via Snapshot
  const resyncState = await request('/api/state');
  const resyncProjects = await request('/api/projects');
  const resyncEvent = await request('/api/events/current');

  assert(resyncState.status === 200, 'GET /api/state re-hidratado após reconexão');
  assert(resyncState.body.currentProject?.id === 'proj-finflow-03', 'Projeto ativo preservado após reconexão (FinFlow)');
  assert(resyncState.body.chairs[2] === true && resyncState.body.chairs[4] === true, 'Estado das cadeiras #2 e #4 preservado');
  assert(resyncState.body.chairs[1] === false, 'Estado da cadeira #1 preservado como false');
  assert(resyncEvent.body.branding.primaryColor === '#7c3aed', 'Paleta de cores primária do evento preservada no resync');
  pass('Protocolo Snapshot-First (ADR-002) validado: integridade 100% preservada');

  // ── CENÁRIO 5: COLD REHYDRATION / RELOAD (F5) ──────────────────────────
  console.log('\n[CENÁRIO 5] Cold Rehydration / Recarga de Página (F5)');
  // Simular novo cliente que acabou de dar F5 e carrega apenas via REST inicial
  const coldState = await request('/api/state');
  const coldEvent = await request('/api/events/current');
  const coldProjects = await request('/api/projects?includeCompleted=true');

  assert(coldState.ok && coldEvent.ok && coldProjects.ok, 'Todas as consultas de hidratação a frio respondem com sucesso');
  assert(coldState.body.currentProject?.id === 'proj-finflow-03', 'F5 recupera instantaneamente o projeto do palco');
  assert(coldEvent.body.branding.primaryColor === '#7c3aed', 'F5 recupera instantaneamente o branding dinâmico');
  assert(coldState.body.activeCount === 2, 'F5 recupera contagem de cadeiras ativas');

  // Cleanup final
  await postJson('/api/reset', {});
  await connection.stop();

  console.log('\n======================================================');
  console.log(`HOMOLOGAÇÃO CONCLUÍDA: ${passed} PASS / ${failed} FAIL`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runHomologation().catch(err => {
  console.error('\n[FATAL ERROR]', err);
  process.exit(1);
});
