/**
 * test-crash-rehydration.cjs
 * Suíte de validação de Crash Recovery e Re-hydration do Milestone 4B.
 * 
 * Valida os 7 cenários obrigatórios do Milestone 4B.5:
 * 1. Seleção de Projeto -> Restart Backend -> Projeto continua selecionado.
 * 2. Acionamento de Cadeiras [1,3,4] -> Restart Backend -> Cadeiras restauradas [1,3,4].
 * 3. Pitch em andamento -> Crash -> Restart -> RecoveredFromCrash == true.
 * 4. Pitch em andamento -> Crash -> Restart -> Timer congelado no ponto do último checkpoint (Paused).
 * 5. Resume após recovery -> Pitch continua normalmente com tempo decorrendo.
 * 6. Reset após recovery -> Estado limpo, Waiting, RecoveredFromCrash == false.
 * 7. Validação de LastCheckpointAt -> Snapshot e coluna de checkpoint atualizados corretamente.
 */

const http = require('http');
const { spawn, execSync } = require('child_process');
const path = require('path');

const BASE_URL = process.env.ARENA_API_URL || 'http://127.0.0.1:5000';
const BACKEND_DIR = path.resolve(__dirname, '../backend');
const DOTNET_EXE = 'C:\\Users\\ANDREROC\\Documents\\devtools\\portable\\dotnet\\dotnet.exe';

let testsPassed = 0;
let testsFailed = 0;
let backendProcess = null;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    testsPassed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    testsFailed++;
  }
}

async function request(method, reqPath, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(reqPath, BASE_URL);
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
        resolve({ status: res.statusCode, data: parsed, headers: res.headers });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForServerReady(timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await request('GET', '/api/status');
      if (res.status === 200) return true;
    } catch (e) {
      // continua tentando
    }
    await sleep(400);
  }
  throw new Error('Timeout aguardando backend iniciar.');
}

async function startBackend() {
  console.log('   [Proc] Iniciando backend Arena Voice (PostgreSQL mode)...');
  backendProcess = spawn(DOTNET_EXE, ['run', '--no-build'], {
    cwd: BACKEND_DIR,
    env: {
      ...process.env,
      ARENA_STORAGE_ENGINE: 'postgres'
    },
    stdio: 'ignore'
  });

  backendProcess.on('error', (err) => {
    console.error('   [Proc] Erro ao iniciar processo backend:', err);
  });

  await waitForServerReady();
  console.log('   [Proc] Backend online e pronto para requisições.\n');
}

function killBackend() {
  console.log('   [Proc] Simulando falha/crash: derrubando backend...');
  if (backendProcess) {
    try {
      backendProcess.kill('SIGKILL');
    } catch (e) {}
    backendProcess = null;
  }
  // Força encerramento do processo ArenaVoicePocBackend se houver
  try {
    execSync('taskkill /F /IM ArenaVoicePocBackend.exe 2>nul');
  } catch (e) {}
}

async function restartBackend() {
  killBackend();
  await sleep(1000);
  await startBackend();
}

async function runRecoverySuite() {
  console.log('======================================================');
  console.log('   ARENA VOICE — CRASH RECOVERY VALIDATION SUITE      ');
  console.log('                 (Milestone 4B.5)                     ');
  console.log('======================================================\n');

  try {
    // Garante backend ativo no início
    await startBackend();

    // Reset inicial para estado limpo
    await request('POST', '/api/reset');
    await request('POST', '/api/events/evt-demo-day-2026/activate');

    // =========================================================================
    // CENÁRIO 1: Seleção de Projeto -> Restart Backend -> Projeto Continua
    // =========================================================================
    console.log('[Cenário 1] Testando preservação de projeto ativo pós-restart...');
    const targetProject = 'proj-ecolog-02';
    const selectRes = await request('POST', `/api/projects/${targetProject}/select`);
    assert(selectRes.status === 200, `Seleção de projeto ${targetProject} retorna HTTP 200`);

    const preState = await request('GET', '/api/state');
    assert(preState.data.currentProject?.id === targetProject, `Projeto ${targetProject} ativo no estado atual`);

    await restartBackend();

    const postState = await request('GET', '/api/state');
    assert(postState.status === 200, `GET /api/state retorna HTTP 200 pós-restart`);
    assert(postState.data.currentProject?.id === targetProject, `Projeto ${targetProject} continua selecionado após restart`);

    // =========================================================================
    // CENÁRIO 2: Acionamento de Cadeiras [1,3,4] -> Restart -> Cadeiras Restauradas
    // =========================================================================
    console.log('\n[Cenário 2] Testando preservação e reidratação de cadeiras [1,3,4]...');
    await request('POST', '/api/reset');
    await request('POST', '/api/chair-press', { chairId: 1 });
    await request('POST', '/api/chair-press', { chairId: 3 });
    await request('POST', '/api/chair-press', { chairId: 4 });

    const chairsPre = await request('GET', '/api/state');
    assert(chairsPre.data.chairs['1'] === true && chairsPre.data.chairs['3'] === true && chairsPre.data.chairs['4'] === true, 'Cadeiras 1, 3 e 4 acionadas antes do restart');
    assert(chairsPre.data.chairs['2'] === false && chairsPre.data.chairs['5'] === false, 'Cadeiras 2 e 5 permanecem desativadas');

    await restartBackend();

    const chairsPost = await request('GET', '/api/state');
    assert(chairsPost.data.chairs['1'] === true, 'Cadeira 1 restaurada como ativa');
    assert(chairsPost.data.chairs['3'] === true, 'Cadeira 3 restaurada como ativa');
    assert(chairsPost.data.chairs['4'] === true, 'Cadeira 4 restaurada como ativa');
    assert(chairsPost.data.chairs['2'] === false, 'Cadeira 2 restaurada como inativa');
    assert(chairsPost.data.chairs['5'] === false, 'Cadeira 5 restaurada como inativa');
    assert(chairsPost.data.activeCount === 3, `Contador de cadeiras ativas coincide (3)`);

    // =========================================================================
    // CENÁRIO 3: Pitch em Andamento -> Crash -> Restart -> RecoveredFromCrash == true
    // =========================================================================
    console.log('\n[Cenário 3] Testando Crash Recovery com flag RecoveredFromCrash...');
    await request('POST', '/api/reset');
    await request('POST', '/api/pitch/transition', { targetStage: 'PitchRunning' });

    const runningState = await request('GET', '/api/pitch/state');
    assert(runningState.data.stageName === 'PitchRunning', 'Pitch em execução (PitchRunning)');
    assert(runningState.data.isPaused === false, 'Cronômetro ativo (isPaused: false)');

    // Aguarda 1.5s para acumular tempo e registra interação para atualizar checkpoint
    await sleep(1500);
    await request('POST', '/api/chair-press', { chairId: 2 });

    // Queda abrupta sem pausa
    await restartBackend();

    const recoveredState = await request('GET', '/api/pitch/state');
    assert(recoveredState.data.stageName === 'PitchRunning', 'Estágio PitchRunning preservado (sem descarte para Waiting)');
    assert(recoveredState.data.recoveredFromCrash === true, 'Metadado recoveredFromCrash == true exposto no DTO');
    assert(recoveredState.data.interruptedStage === 1 || recoveredState.data.interruptedStage === 'PitchRunning', 'InterruptedStage gravado com estágio correto');
    assert(recoveredState.data.recoveredAt !== null, 'Timestamp recoveredAt preenchido');

    // =========================================================================
    // CENÁRIO 4: Pitch em Andamento -> Crash -> Restart -> Timer Congelado
    // =========================================================================
    console.log('\n[Cenário 4] Testando preservação de tempo restante congelado pós-crash...');
    assert(recoveredState.data.isPaused === true, 'Cronômetro entra obrigatoriamente em modo PAUSED');
    const remainingFirst = recoveredState.data.remainingSeconds;
    assert(remainingFirst > 0 && remainingFirst < 180, `Tempo restante congelado válido: ${remainingFirst}s de 180s`);

    // Aguarda 2 segundos com o servidor ativo e verifica se o tempo NÃO decrementou
    await sleep(2000);
    const recoveredStateLater = await request('GET', '/api/pitch/state');
    assert(recoveredStateLater.data.remainingSeconds === remainingFirst, `Tempo restante permanece estritamente congelado enquanto pausado (${recoveredStateLater.data.remainingSeconds}s)`);

    // =========================================================================
    // CENÁRIO 5: Resume após Recovery -> Pitch Continua
    // =========================================================================
    console.log('\n[Cenário 5] Testando retomada (Resume) após recovery...');
    const resumeRes = await request('POST', '/api/pitch/timer/resume');
    assert(resumeRes.status === 200, `POST /api/pitch/timer/resume retorna HTTP 200`);
    assert(resumeRes.data.isPaused === false, 'Cronômetro despausado');

    await sleep(1200);
    const postResumeState = await request('GET', '/api/pitch/state');
    assert(postResumeState.data.remainingSeconds < remainingFirst, `Tempo voltou a decrementar normalmente (${postResumeState.data.remainingSeconds}s < ${remainingFirst}s)`);
    assert(postResumeState.data.stageName === 'PitchRunning', 'Estágio continua PitchRunning');

    // =========================================================================
    // CENÁRIO 6: Reset após Recovery -> Estado Limpo
    // =========================================================================
    console.log('\n[Cenário 6] Testando reset após recovery (limpeza de estado)...');
    const resetRes = await request('POST', '/api/pitch/reset');
    assert(resetRes.status === 200, 'POST /api/pitch/reset retorna HTTP 200');

    const cleanPitch = await request('GET', '/api/pitch/state');
    assert(cleanPitch.data.stageName === 'Waiting', 'Estágio resetado para Waiting');
    assert(cleanPitch.data.recoveredFromCrash === false, 'Flag recoveredFromCrash limpa para false');
    assert(cleanPitch.data.durationSeconds === 0, 'Duração resetada para 0');

    const cleanChairs = await request('GET', '/api/state');
    assert(cleanChairs.data.activeCount === 0, 'Todas as cadeiras resetadas');

    // =========================================================================
    // CENÁRIO 7: Validar LastCheckpointAt
    // =========================================================================
    console.log('\n[Cenário 7] Testando rastreabilidade de LastCheckpointAt...');
    const checkpointPre = cleanPitch.data.lastCheckpointAt;
    assert(checkpointPre !== null && checkpointPre !== undefined, `LastCheckpointAt presente: ${checkpointPre}`);

    // Aciona cadeira para disparar novo snapshot
    await sleep(100);
    await request('POST', '/api/chair-press', { chairId: 2 });
    const afterPressState = await request('GET', '/api/pitch/state');
    const checkpointPost = afterPressState.data.lastCheckpointAt;
    assert(checkpointPost !== null && checkpointPost !== undefined, `Novo checkpoint registrado: ${checkpointPost}`);
    assert(new Date(checkpointPost).getTime() >= new Date(checkpointPre).getTime(), 'Timestamp de checkpoint avançou no tempo');

    // Limpeza final
    await request('POST', '/api/reset');

    console.log('\n======================================================');
    console.log(`RESULTADO DA SUÍTE DE CRASH RECOVERY:`);
    console.log(`Total de testes: ${testsPassed + testsFailed}`);
    console.log(`Sucessos: ${testsPassed}`);
    console.log(`Falhas: ${testsFailed}`);
    console.log('======================================================\n');

    if (testsFailed > 0) {
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('❌ Erro fatal durante execução dos testes:', err);
    process.exitCode = 1;
  } finally {
    killBackend();
  }
}

runRecoverySuite();
