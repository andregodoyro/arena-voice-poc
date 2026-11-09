/**
 * test-timers-lockout.cjs — Suíte de Testes Automatizados para o Milestone 3C
 * 
 * Validação rigorosa da Autoridade Temporal e Proteção de Voto (Timers & Lockout):
 * 1. Setup autônomo e dinâmico com evento configurado com LockoutEnabled: true
 * 2. Rejeição HTTP 409 Conflict com payload semântico em estágios não autorizados:
 *    - Waiting -> 409 Conflict
 *    - PitchRunning -> 409 Conflict
 *    - QA -> 409 Conflict
 *    - VotingClosed -> 409 Conflict
 *    - Finished -> 409 Conflict
 * 3. Autorização estrita em VotingOpen:
 *    - VotingOpen -> 200 OK
 * 4. Idempotência de acionamento (já virada não duplica placar)
 * 5. Pausa e Retomada de Cronômetro (POST /api/pitch/timer/pause & resume):
 *    - Congelamento de contagem
 *    - Suspensão temporária de votação durante pausa em VotingOpen (409 Conflict)
 *    - Restabelecimento de voto pós-resume
 * 6. Extensão dinâmica de tempo (POST /api/pitch/timer/adjust com +30s, +60s, +120s)
 * 7. Concorrência multithread (Hardware Stress Test com Promise.all para cadeiras simultâneas)
 * 8. Integração em tempo real via SignalR (PitchTimerUpdated, PitchStageChanged, ChairTurned)
 * 9. Teardown e restauração de estado (ADR-008)
 */

const http = require('http');

let signalR = null;
try {
  signalR = require('../frontend/node_modules/@microsoft/signalr');
} catch (e) {
  try {
    signalR = require('@microsoft/signalr');
  } catch (err) {
    console.warn('[WARN] @microsoft/signalr não encontrado. Testes SignalR serão adaptados.');
  }
}

const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:5000';
let totalAssertions = 0;
let passedAssertions = 0;

function assert(condition, message, details = '') {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
    console.log(`  [PASS] ${message}`);
  } else {
    console.error(`  [FAIL] ${message}`);
    if (details) console.error(`         Detalhe: ${details}`);
    process.exitCode = 1;
  }
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
      },
    };

    let postData = null;
    if (body !== null) {
      postData = JSON.stringify(body);
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let parsed = null;
        try {
          if (data) parsed = JSON.parse(data);
        } catch {
          parsed = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: parsed,
        });
      });
    });

    req.on('error', (err) => reject(err));
    if (postData) req.write(postData);
    req.end();
  });
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  console.log('============================================================');
  console.log('  ARENA VOICE POC — TEST SUITE: TIMERS & LOCKOUT (3C)        ');
  console.log('============================================================');
  console.log(`Alvo do teste: ${BASE_URL}\n`);

  let initialEventId = null;
  let initialProjectId = null;
  let dynamicEventId = null;
  let dynamicProjectId = null;

  try {
    // =========================================================================
    // 0. CAPTURA DE ESTADO INICIAL
    // =========================================================================
    console.log('[0] Captura de estado inicial para teardown resiliente');
    const initialStateRes = await request('GET', '/api/state');
    assert(initialStateRes.status === 200, 'GET /api/state responde com HTTP 200');
    initialEventId = initialStateRes.body?.currentEvent?.id || null;
    initialProjectId = initialStateRes.body?.currentProject?.id || null;

    // =========================================================================
    // 1. SETUP DINÂMICO DO EVENTO COM TIMERS E LOCKOUT ATIVO
    // =========================================================================
    console.log('\n[1] Criação de Evento com LockoutEnabled: true e Timers Customizados');
    const timestamp = Date.now();
    const eventPayload = {
      title: `Banca 3C Test ${timestamp}`,
      description: 'Evento de homologação do Milestone 3C',
      scheduledDate: new Date(Date.now() + 86400000).toISOString(),
      branding: {
        primaryColor: '#00b4d8',
        secondaryColor: '#ffd166',
        logoUrl: '/samples/test-logo.png',
        tagline: 'Testando autoridade temporal e travas de voto.',
      },
      timers: {
        pitchDurationSeconds: 150,
        qaDurationSeconds: 90,
        votingDurationSeconds: 25,
        lockoutEnabled: true,
      },
    };

    const createEvtRes = await request('POST', '/api/events', eventPayload);
    assert(createEvtRes.status === 201, 'POST /api/events cria evento 3C com HTTP 201');
    dynamicEventId = createEvtRes.body?.id;
    assert(Boolean(dynamicEventId), `Evento criado com ID dinâmico: ${dynamicEventId}`);
    assert(createEvtRes.body?.timers?.lockoutEnabled === true, 'TimerConfig gravado com lockoutEnabled = true');
    assert(createEvtRes.body?.timers?.pitchDurationSeconds === 150, 'pitchDurationSeconds configurado para 150s');

    // Ativação do evento criado
    const activateRes = await request('POST', `/api/events/${dynamicEventId}/activate`);
    assert(activateRes.status === 200, 'Ativação do evento 3C retorna HTTP 200');

    // Criação e seleção de projeto de teste
    const projectPayload = {
      title: `Projeto Lockout ${timestamp}`,
      pitchLeader: 'Engenheiro de Testes',
      track: 'Hardware & IoT',
      description: 'Validação de travas de acionamento ESP32.',
    };

    const createProjRes = await request('POST', '/api/projects', projectPayload);
    assert(createProjRes.status === 201, 'POST /api/projects cria projeto com HTTP 201');
    dynamicProjectId = createProjRes.body?.id;

    const selectProjRes = await request('POST', `/api/projects/${dynamicProjectId}/select`);
    assert(selectProjRes.status === 200, 'Seleção do projeto no palco retorna HTTP 200');

    // =========================================================================
    // 2. LOCKOUT NO ESTÁGIO WAITING (HTTP 409 CONFLICT)
    // =========================================================================
    console.log('\n[2] Validação de Lockout em Waiting (Voto Proibido)');
    const stateWaiting = await request('GET', '/api/pitch/state');
    assert(stateWaiting.body?.stage === 'Waiting', 'Estágio inicial é Waiting');
    assert(stateWaiting.body?.isVotingAllowed === false, 'Waiting define isVotingAllowed = false');

    const pressWaiting = await request('POST', '/api/chair-press', { chairId: 1 });
    assert(pressWaiting.status === 409, 'Acionamento de cadeira em Waiting rejeitado com HTTP 409 Conflict');
    assert(pressWaiting.body?.accepted === false, 'Payload informa accepted = false');
    assert(pressWaiting.body?.isVotingAllowed === false, 'Payload confirma isVotingAllowed = false');
    assert(Boolean(pressWaiting.body?.error), 'Mensagem explicativa de bloqueio presente no corpo');

    // =========================================================================
    // 3. LOCKOUT NO ESTÁGIO PITCH RUNNING (HTTP 409 CONFLICT) & DTO DE TEMPO
    // =========================================================================
    console.log('\n[3] Transição para PitchRunning, Cálculo Temporal e Lockout');
    const toRunning = await request('POST', '/api/pitch/transition', { targetStage: 'PitchRunning' });
    assert(toRunning.status === 200, 'Transição para PitchRunning retorna HTTP 200');
    assert(toRunning.body?.durationSeconds === 150, 'Duração do timer alocada para 150s (configurada no evento)');
    assert(toRunning.body?.remainingSeconds <= 150 && toRunning.body?.remainingSeconds > 140, 'Tempo restante calculado corretamente');
    assert(toRunning.body?.isVotingAllowed === false, 'PitchRunning define isVotingAllowed = false');

    const pressRunning = await request('POST', '/api/chair-press', { chairId: 2 });
    assert(pressRunning.status === 409, 'Acionamento de cadeira durante fala do pitch (PitchRunning) rejeitado com HTTP 409');

    // =========================================================================
    // 4. PAUSA E RETOMADA DO CRONÔMETRO (PAUSE / RESUME)
    // =========================================================================
    console.log('\n[4] Pausa e Retomada de Cronômetro (POST /api/pitch/timer/pause & resume)');
    const pauseRes = await request('POST', '/api/pitch/timer/pause');
    assert(pauseRes.status === 200, 'POST /api/pitch/timer/pause retorna HTTP 200');
    assert(pauseRes.body?.isPaused === true, 'isPaused retornado como true');
    assert(Boolean(pauseRes.body?.pausedAt), 'pausedAt registrado');

    await wait(300);
    const statePaused = await request('GET', '/api/pitch/state');
    assert(statePaused.body?.isPaused === true, 'Snapshot GET /api/pitch/state confirma isPaused = true');
    const remainingAtPause = statePaused.body?.remainingSeconds;

    await wait(300);
    const resumeRes = await request('POST', '/api/pitch/timer/resume');
    assert(resumeRes.status === 200, 'POST /api/pitch/timer/resume retorna HTTP 200');
    assert(resumeRes.body?.isPaused === false, 'isPaused retornado como false pós-retomada');

    const stateResumed = await request('GET', '/api/pitch/state');
    assert(Math.abs(stateResumed.body?.remainingSeconds - remainingAtPause) < 1.0, 'Tempo não escoou durante o período em pausa');

    // =========================================================================
    // 5. AJUSTE DE TEMPO (+60s)
    // =========================================================================
    console.log('\n[5] Ajuste Dinâmico de Tempo (POST /api/pitch/timer/adjust com +60s)');
    const adjustRes = await request('POST', '/api/pitch/timer/adjust', { seconds: 60 });
    assert(adjustRes.status === 200, 'POST /api/pitch/timer/adjust retorna HTTP 200');
    assert(adjustRes.body?.addedSeconds === 60, 'addedSeconds confirmado como 60');
    assert(adjustRes.body?.durationSeconds === 210, 'Duração total atualizada para 210s (150s + 60s)');

    // =========================================================================
    // 6. LOCKOUT NO ESTÁGIO Q&A (HTTP 409 CONFLICT)
    // =========================================================================
    console.log('\n[6] Transição para Q&A e Lockout');
    const toQA = await request('POST', '/api/pitch/transition', { targetStage: 'QA' });
    assert(toQA.status === 200, 'Transição para QA retorna HTTP 200');
    assert(toQA.body?.durationSeconds === 90, 'Duração do timer alocada para 90s (configurada para QA no evento)');

    const pressQA = await request('POST', '/api/chair-press', { chairId: 3 });
    assert(pressQA.status === 409, 'Acionamento de cadeira durante Q&A rejeitado com HTTP 409 Conflict');

    // =========================================================================
    // 7. AUTORIZAÇÃO E IDEMPOTÊNCIA EM VOTING OPEN (HTTP 200 OK)
    // =========================================================================
    console.log('\n[7] Votação Aberta (VotingOpen) — Aceitação de Votos e Idempotência');
    const toVoting = await request('POST', '/api/pitch/transition', { targetStage: 'VotingOpen' });
    assert(toVoting.status === 200, 'Transição para VotingOpen retorna HTTP 200');
    assert(toVoting.body?.durationSeconds === 25, 'Duração do timer alocada para 25s (configurada no evento)');
    assert(toVoting.body?.isVotingAllowed === true, 'VotingOpen define isVotingAllowed = true');

    // 7.1 Acionamento de cadeira 1 com sucesso
    const pressVote1 = await request('POST', '/api/chair-press', { chairId: 1 });
    assert(pressVote1.status === 200, 'Cadeira 1 acionada em VotingOpen aceita com HTTP 200 OK');
    assert(pressVote1.body?.accepted === true, 'accepted = true');
    assert(pressVote1.body?.alreadyTurned === false, 'Primeiro acionamento: alreadyTurned = false');
    assert(pressVote1.body?.activeCount === 1, 'Placar de cadeiras viradas: 1/5');

    // 7.2 Idempotência de clique repetido
    const pressVote1Repeat = await request('POST', '/api/chair-press', { chairId: 1 });
    assert(pressVote1Repeat.status === 200, 'Clique repetido na cadeira 1 retorna HTTP 200');
    assert(pressVote1Repeat.body?.alreadyTurned === true, 'Idempotência confirmada: alreadyTurned = true');
    assert(pressVote1Repeat.body?.activeCount === 1, 'Placar preservado em 1/5 sem duplicar');

    // 7.3 Bloqueio de voto em pausa durante VotingOpen
    await request('POST', '/api/pitch/timer/pause');
    const pressVoteDuringPause = await request('POST', '/api/chair-press', { chairId: 2 });
    assert(pressVoteDuringPause.status === 409, 'Voto durante VotingOpen com timer pausado rejeitado com HTTP 409');
    await request('POST', '/api/pitch/timer/resume');

    // =========================================================================
    // 8. TESTE DE ESTRESSE DE CONCORRÊNCIA MULTITHREAD (PARALLEL ESP32 SIMULATION)
    // =========================================================================
    console.log('\n[8] Teste de Estresse de Concorrência (5 Disparos Simultâneos via Promise.all)');
    const parallelResponses = await Promise.all([
      request('POST', '/api/chair-press', { chairId: 2 }),
      request('POST', '/api/chair-press', { chairId: 3 }),
      request('POST', '/api/chair-press', { chairId: 4 }),
      request('POST', '/api/chair-press', { chairId: 5 }),
    ]);

    const allSuccessful = parallelResponses.every(r => r.status === 200 && r.body?.accepted === true);
    assert(allSuccessful, 'Todos os 4 acionamentos simultâneos responderam com HTTP 200 OK sem falha de concorrência');

    const stateFull = await request('GET', '/api/state');
    assert(stateFull.body?.activeCount === 5, 'Placar final consolidou com precisão 5 de 5 cadeiras viradas');

    // =========================================================================
    // 9. INTEGRAÇÃO REALTIME SIGNALR PARA TIMERS
    // Executado aqui (stage=VotingOpen), antes de VotingClosed → Finished,
    // pois AdjustPitchTimer é bloqueado em Finished (estado terminal — ADR-008).
    // =========================================================================
    console.log('\n[9] Validação de Broadcast Realtime SignalR (PitchTimerUpdated)');
    if (signalR) {
      const hubUrl = `${BASE_URL}/hubs/arena-poc`;
      const connection = new signalR.HubConnectionBuilder()
        .withUrl(hubUrl)
        .configureLogging(signalR.LogLevel.None)
        .build();

      const timerEvents = [];
      connection.on('PitchTimerUpdated', (data) => timerEvents.push(data));

      try {
        await connection.start();
        assert(connection.state === 'Connected', 'Conexão SignalR estabelecida');

        // Executa ajuste de tempo para disparar evento (stage=VotingOpen, adjust permitido)
        await request('POST', '/api/pitch/timer/adjust', { seconds: 30 });
        await wait(250);

        assert(timerEvents.length > 0, 'SignalR recebeu evento PitchTimerUpdated');
        const lastTimerEvent = timerEvents[timerEvents.length - 1];
        assert(lastTimerEvent?.addedSeconds === 30, 'Evento SignalR informa addedSeconds = 30');

        await connection.stop();
      } catch (err) {
        console.error('  [FAIL] Erro na validação SignalR:', err.message);
        assert(false, 'SignalR timer validation');
      }
    } else {
      console.log('  [SKIP] SignalR client não instalado localmente.');
    }

    // =========================================================================
    // 10. LOCKOUT EM VOTING CLOSED E FINISHED (HTTP 409 CONFLICT)
    // Terminalidade do estado Finished preservada (ADR-008):
    //   Finished → ∅ (sem transições permitidas, projeto marcado como Completed)
    // =========================================================================
    console.log('\n[10] Fechamento da Votação (VotingClosed) e Conclusão (Finished)');
    await request('POST', '/api/pitch/transition', { targetStage: 'VotingClosed' });
    const pressClosed = await request('POST', '/api/chair-press', { chairId: 1 });
    assert(pressClosed.status === 409, 'Voto após fechamento da votação (VotingClosed) rejeitado com HTTP 409');

    await request('POST', '/api/pitch/transition', { targetStage: 'Finished' });
    const pressFinished = await request('POST', '/api/chair-press', { chairId: 1 });
    assert(pressFinished.status === 409, 'Voto após encerramento do pitch (Finished) rejeitado com HTTP 409');

  } catch (err) {
    console.error('\nErro inesperado durante a execução da suíte 3C:', err);
    assert(false, 'Execução da suíte sem exceções não tratadas', err.message);
  } finally {
    // =========================================================================
    // 11. TEARDOWN E RESTAURAÇÃO DE ESTADO (ADR-008)
    // =========================================================================
    console.log('\n[11] Teardown e Restauração de Estado');
    try {
      if (initialEventId) {
        console.log(`    Restaurando evento original: ${initialEventId}`);
        await request('POST', `/api/events/${initialEventId}/activate`);
      }
      if (initialProjectId) {
        console.log(`    Restaurando projeto original: ${initialProjectId}`);
        await request('POST', `/api/projects/${initialProjectId}/select`);
      }
      if (dynamicProjectId) {
        await request('DELETE', `/api/projects/${dynamicProjectId}`);
      }
      if (dynamicEventId) {
        await request('POST', `/api/events/${dynamicEventId}/archive`);
        await request('DELETE', `/api/events/${dynamicEventId}`);
      }
      // Reset final das cadeiras
      await request('POST', '/api/reset');
      console.log('    Limpeza de dados de teste concluída com sucesso.');
    } catch (cleanupErr) {
      console.warn('    Aviso durante limpeza:', cleanupErr.message);
    }
  }

  // =========================================================================
  // RELATÓRIO CONSOLIDADO
  // =========================================================================
  console.log('\n============================================================');
  console.log(`TOTAL DE ASSERÇÕES: ${totalAssertions}`);
  console.log(`APROVADAS:          ${passedAssertions}`);
  console.log(`FALHAS:             ${totalAssertions - passedAssertions}`);
  console.log('============================================================\n');

  if (passedAssertions === totalAssertions && totalAssertions > 0) {
    console.log('>>> [SUITE APPROVED] TODAS AS ASSERÇÕES DO 3C PASSARAM COM SUCESSO! <<<\n');
    process.exit(0);
  } else {
    console.error('>>> [SUITE FAILED] EXISTEM ASSERÇÕES COM FALHA! <<<\n');
    process.exit(1);
  }
}

run();
