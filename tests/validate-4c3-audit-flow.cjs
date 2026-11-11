/**
 * validate-4c3-audit-flow.cjs
 * Executa as 7 mutações obrigatórias do Milestone 4C.3 e valida os eventos em audit_events.
 */

const http = require('http');
const { spawn, execSync } = require('child_process');
const path = require('path');

const BACKEND_DIR = path.resolve(__dirname, '../backend');
const DOTNET_EXE = 'C:\\Users\\ANDREROC\\Documents\\devtools\\portable\\dotnet\\dotnet.exe';
const PSQL = 'C:\\Users\\ANDREROC\\Documents\\devtools\\portable\\pgsql\\bin\\psql.exe';
const BASE_URL = 'http://127.0.0.1:5000';

let backendProcess = null;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function pingBackend() {
  return new Promise((resolve) => {
    const req = http.get(`${BASE_URL}/api/status`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(800, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function ensureBackendRunning() {
  if (await pingBackend()) {
    console.log('✅ Backend já está em execução na porta 5000.');
    return;
  }

  console.log('🚀 Iniciando backend Arena Voice (PostgreSQL mode)...');
  backendProcess = spawn(DOTNET_EXE, ['run', '--no-build'], {
    cwd: BACKEND_DIR,
    env: {
      ...process.env,
      ARENA_STORAGE_ENGINE: 'postgres',
      ASPNETCORE_URLS: BASE_URL,
      DOTNET_CLI_TELEMETRY_OPTOUT: '1'
    },
    stdio: 'ignore'
  });

  const start = Date.now();
  while (Date.now() - start < 20000) {
    if (await pingBackend()) {
      console.log('✅ Backend online na porta 5000.');
      return;
    }
    await sleep(400);
  }
  throw new Error('Timeout aguardando backend subir na porta 5000');
}

function killBackend() {
  if (backendProcess) {
    try {
      execSync(`taskkill /F /T /PID ${backendProcess.pid}`, { stdio: 'ignore' });
    } catch (e) {}
    backendProcess = null;
  }
  try {
    execSync('taskkill /F /IM ArenaVoicePocBackend.exe', { stdio: 'ignore' });
  } catch (e) {}
}

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = data ? JSON.parse(data) : null;
        } catch (e) {
          parsed = data;
        }
        resolve({ status: res.statusCode, data: parsed });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runValidation() {
  console.log('======================================================');
  console.log('   MILESTONE 4C.3 — VALIDAÇÃO MANUAL OBRIGATÓRIA      ');
  console.log('======================================================\n');

  await ensureBackendRunning();

  // 1. Criar Projeto
  console.log('\n[1] Criando Projeto...');
  const createRes = await request('POST', '/api/projects', {
    eventId: 'evt-demo-day-2026',
    title: 'Projeto Auditoria 4C',
    pitchLeader: 'Líder Teste',
    track: 'Fintech',
    description: 'Projeto criado para validar instrumentação de auditoria'
  });
  console.log(`   Status: ${createRes.status}, Id: ${createRes.data?.id}`);
  const projectId = createRes.data?.id;

  // 2. Editar Projeto
  console.log('[2] Editando Projeto...');
  const updateRes = await request('PUT', `/api/projects/${projectId}`, {
    title: 'Projeto Auditoria 4C (Atualizado)',
    pitchLeader: 'Líder Teste',
    track: 'Fintech',
    description: 'Descrição editada'
  });
  console.log(`   Status: ${updateRes.status}`);

  // 2.1 Selecionar Projeto para o Palco (Ativar Projeto)
  console.log('[2.1] Selecionando Projeto para o Palco...');
  const selectRes = await request('POST', `/api/projects/${projectId}/select`);
  console.log(`   Status: ${selectRes.status}`);

  // 3. Iniciar Pitch (Waiting -> PitchRunning)
  console.log('[3] Iniciando Pitch (PitchRunning)...');
  const startRes = await request('POST', '/api/pitch/transition', { targetStage: 'PitchRunning' });
  console.log(`   Status: ${startRes.status}, CurrentStage: ${startRes.data?.currentStage}`);

  // 4. Pausar Pitch
  console.log('[4] Pausando Pitch...');
  const pauseRes = await request('POST', '/api/pitch/timer/pause');
  console.log(`   Status: ${pauseRes.status}, IsPaused: ${pauseRes.data?.isPaused}`);

  // 5. Retomar Pitch
  console.log('[5] Retomando Pitch...');
  const resumeRes = await request('POST', '/api/pitch/timer/resume');
  console.log(`   Status: ${resumeRes.status}, IsPaused: ${resumeRes.data?.isPaused}`);

  // 5.1 Abrir Votação para acionar cadeiras sem lockout
  console.log('[5.1] Transicionando para VotingOpen...');
  await request('POST', '/api/pitch/transition', { targetStage: 'VotingOpen' });

  // 6. Girar Cadeira 1 (ESP32)
  console.log('[6] Acionando Cadeira 1 (source = ESP32)...');
  const chairRes = await request('POST', '/api/chair-press', { chairId: 1, source: 'ESP32' });
  console.log(`   Status: ${chairRes.status}, Accepted: ${chairRes.data?.accepted}`);

  // 7. Resetar Cadeiras
  console.log('[7] Resetando Cadeiras...');
  const resetChairsRes = await request('POST', '/api/reset');
  console.log(`   Status: ${resetChairsRes.status}`);

  console.log('\nAguardando 800ms para descarga do buffer pelo AuditEventWriter...');
  await sleep(800);

  console.log('\n================================================================================');
  console.log('   CONSULTA DIRETA EM AUDIT_EVENTS (POSTGRESQL)                                 ');
  console.log('================================================================================\n');

  const sqlQuery = `SELECT id, event_type, aggregate_type, aggregate_id, actor_type, to_char(occurred_at, 'HH24:MI:SS.MS') as time, success, payload::text as payload_preview FROM audit_events ORDER BY id DESC LIMIT 15;`;
  const result = execSync(`"${PSQL}" -U postgres -d arena_voice -c "${sqlQuery}"`).toString();
  console.log(result);

  const countQuery = `SELECT count(*) FROM audit_events;`;
  const countResult = execSync(`"${PSQL}" -U postgres -d arena_voice -t -c "${countQuery}"`).toString().trim();
  console.log(`TOTAL DE EVENTOS GRAVADOS EM AUDIT_EVENTS: ${countResult}`);

  killBackend();

  if (parseInt(countResult, 10) > 0) {
    console.log('\n✅ SUCESSO: Eventos gravados e auditados com êxito na tabela audit_events!');
  } else {
    console.error('\n❌ FALHA: audit_events permaneceu vazio.');
    process.exit(1);
  }
}

runValidation().catch(err => {
  killBackend();
  console.error('Erro na validação:', err);
  process.exit(1);
});
