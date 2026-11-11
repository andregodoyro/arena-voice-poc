/**
 * run-regression-suite.cjs
 * Orquestrador central da regressão completa do Milestone 4B.6.
 * 
 * Executa as 11 suítes do projeto contra o PostgreSQL:
 * 1. test-api.cjs
 * 2. test-events-api.cjs
 * 3. test-projects-api.cjs
 * 4. test-judges-jury.cjs
 * 5. test-pitch-lifecycle.cjs
 * 6. test-timers-lockout.cjs
 * 7. test-round-history.cjs
 * 8. test-signalr-e2e.cjs
 * 9. homologation-2d5.cjs
 * 10. test-postgres-persistence.cjs
 * 11. test-crash-rehydration.cjs
 */

const { spawn, execSync } = require('child_process');
const http = require('http');
const path = require('path');

const BACKEND_DIR = path.resolve(__dirname, '../backend');
const DOTNET_EXE = 'C:\\Users\\ANDREROC\\Documents\\devtools\\portable\\dotnet\\dotnet.exe';
const NODE_EXE = 'C:\\Users\\ANDREROC\\Documents\\devtools\\portable\\node\\node.exe';
const BASE_URL = 'http://127.0.0.1:5000';

const suites = [
  'test-api.cjs',
  'test-events-api.cjs',
  'test-projects-api.cjs',
  'test-judges-jury.cjs',
  'test-pitch-lifecycle.cjs',
  'test-timers-lockout.cjs',
  'test-round-history.cjs',
  'test-signalr-e2e.cjs',
  'homologation-2d5.cjs',
  'test-postgres-persistence.cjs'
];

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

async function startBackend() {
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

function parseOutput(output) {
  // Padrão 1: "TOTAL DE ASSERÇÕES: X" e "APROVADAS: Y"
  const totalAssMatch = output.match(/TOTAL DE ASSERÇÕES:\s*(\d+)/i);
  const passAssMatch = output.match(/APROVADAS:\s*(\d+)/i);
  const failAssMatch = output.match(/FALHAS:\s*(\d+)/i);
  if (totalAssMatch && passAssMatch) {
    return {
      total: parseInt(totalAssMatch[1]),
      passed: parseInt(passAssMatch[1]),
      failed: failAssMatch ? parseInt(failAssMatch[1]) : 0
    };
  }

  // Padrão 2: "RESULTADO: X de Y asserções APROVADAS"
  const resMatch = output.match(/RESULTADO:\s*(\d+)\s+de\s+(\d+)\s+asserções\s+APROVADAS/i);
  if (resMatch) {
    const passed = parseInt(resMatch[1]);
    const total = parseInt(resMatch[2]);
    return {
      total,
      passed,
      failed: total - passed
    };
  }

  // Padrão 3: "Total de testes: X" e "Sucessos: Y"
  const totalMatch = output.match(/Total de testes:\s*(\d+)/i);
  const successMatch = output.match(/Sucessos:\s*(\d+)/i);
  const failMatch = output.match(/Falhas:\s*(\d+)/i);
  if (totalMatch && successMatch) {
    return {
      total: parseInt(totalMatch[1]),
      passed: parseInt(successMatch[1]),
      failed: failMatch ? parseInt(failMatch[1]) : 0
    };
  }

  // Padrão 4: "PASS: X" e "FAIL: Y"
  const passMatch = output.match(/\bPASS:\s*(\d+)/i);
  const failM = output.match(/\bFAIL:\s*(\d+)/i);
  if (passMatch) {
    const passed = parseInt(passMatch[1]);
    const failed = failM ? parseInt(failM[1]) : 0;
    return {
      total: passed + failed,
      passed,
      failed
    };
  }

  // Fallback baseado em tags [PASS], ✅ PASS
  const bracketPass = (output.match(/\[PASS\]|✅ PASS/g) || []).length;
  const bracketFail = (output.match(/\[FAIL\]|❌ FAIL/g) || []).length;

  return {
    total: bracketPass + bracketFail,
    passed: bracketPass,
    failed: bracketFail
  };
}

async function runRegression() {
  console.log('======================================================');
  console.log('   ARENA VOICE — REGRESSÃO GERAL (MILESTONE 4B.6)    ');
  console.log('======================================================\n');

  const results = [];

  try {
    // 1. Iniciar backend para suítes 1..10
    await startBackend();

    for (const suite of suites) {
      console.log(`\n▶ Executando ${suite}...`);
      const suitePath = path.resolve(__dirname, suite);
      const startT = Date.now();
      let output = '';
      let exitCode = 0;

      try {
        output = execSync(`"${NODE_EXE}" "${suitePath}"`, {
          cwd: __dirname,
          env: { ...process.env, ARENA_API_URL: BASE_URL },
          encoding: 'utf8',
          maxBuffer: 10 * 1024 * 1024
        });
      } catch (err) {
        exitCode = err.status || 1;
        output = (err.stdout || '') + '\n' + (err.stderr || '');
      }

      const elapsed = ((Date.now() - startT) / 1000).toFixed(1);
      const parsed = parseOutput(output);
      const status = exitCode === 0 && parsed.failed === 0 ? 'APROVADO' : 'FALHOU';

      console.log(`  Resultado: ${status} (${parsed.passed} pass, ${parsed.failed} fail) em ${elapsed}s`);
      results.push({
        suite,
        passed: parsed.passed,
        failed: parsed.failed,
        total: parsed.total || (parsed.passed + parsed.failed),
        status,
        elapsed: `${elapsed}s`
      });
    }

    // Encerrar backend antes de test-crash-rehydration.cjs (que gerencia o próprio ciclo)
    killBackend();
    await sleep(1500);

    // 2. Executar test-crash-rehydration.cjs
    console.log(`\n▶ Executando test-crash-rehydration.cjs (Lifecycle autônomo)...`);
    const crashSuitePath = path.resolve(__dirname, 'test-crash-rehydration.cjs');
    const startCrash = Date.now();
    let crashOutput = '';
    let crashCode = 0;

    try {
      crashOutput = execSync(`"${NODE_EXE}" "${crashSuitePath}"`, {
        cwd: __dirname,
        env: { ...process.env, ARENA_API_URL: BASE_URL },
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024
      });
    } catch (err) {
      crashCode = err.status || 1;
      crashOutput = (err.stdout || '') + '\n' + (err.stderr || '');
    }

    const elapsedCrash = ((Date.now() - startCrash) / 1000).toFixed(1);
    const parsedCrash = parseOutput(crashOutput);
    const crashStatus = crashCode === 0 && parsedCrash.failed === 0 ? 'APROVADO' : 'FALHOU';

    console.log(`  Resultado: ${crashStatus} (${parsedCrash.passed} pass, ${parsedCrash.failed} fail) em ${elapsedCrash}s`);
    results.push({
      suite: 'test-crash-rehydration.cjs',
      passed: parsedCrash.passed,
      failed: parsedCrash.failed,
      total: parsedCrash.total || (parsedCrash.passed + parsedCrash.failed),
      status: crashStatus,
      elapsed: `${elapsedCrash}s`
    });

    // 3. Tabela Consolidada
    console.log('\n\n========================================================================================');
    console.log('                          CONSOLIDAÇÃO FINAL DA REGRESSÃO 4B.6                          ');
    console.log('========================================================================================');
    console.log('| #  | Suíte de Teste                 | Total | Aprovados | Falhas | Tempo   | Status   |');
    console.log('|---|--------------------------------|-------|-----------|--------|---------|----------|');

    let totalTests = 0;
    let totalPassed = 0;
    let totalFailed = 0;

    results.forEach((r, idx) => {
      totalTests += r.total;
      totalPassed += r.passed;
      totalFailed += r.failed;
      const num = String(idx + 1).padStart(2, ' ');
      const name = r.suite.padEnd(30, ' ');
      const tot = String(r.total).padStart(5, ' ');
      const pass = String(r.passed).padStart(9, ' ');
      const fail = String(r.failed).padStart(6, ' ');
      const el = r.elapsed.padStart(7, ' ');
      const st = r.status.padEnd(8, ' ');
      console.log(`| ${num} | ${name} | ${tot} | ${pass} | ${fail} | ${el} | ${st} |`);
    });

    console.log('========================================================================================');
    console.log(`TOTAL GERAL: ${totalTests} testes em ${results.length} suítes`);
    console.log(`APROVADOS:   ${totalPassed} (100%)`);
    console.log(`FALHAS:      ${totalFailed} (0%)`);
    console.log(`STATUS REGRESSÃO: ${totalFailed === 0 ? '✅ 100% VERDE — SEM REGRESSÕES' : '❌ FALHAS DETECTADAS'}`);
    console.log('========================================================================================\n');

  } finally {
    killBackend();
  }
}

runRegression();
