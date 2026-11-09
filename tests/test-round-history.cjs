/**
 * test-round-history.cjs — Suíte de Testes Automatizados para o Milestone 3D
 * 
 * Validação rigorosa do Round History & Result Engine:
 * 1. Arquivamento automático ao finalizar pitch (Finished)
 * 2. Arquivamento automático ao trocar de projeto (ProjectSwitch)
 * 3. Proteção explícita contra Double-Fire (mesma rodada nunca arquivada duas vezes)
 * 4. Result Engine:
 *    - 5/5 cadeiras → Approved + Unanimous
 *    - 3-4/5 cadeiras → Approved + Majority
 *    - 1-2/5 cadeiras → Rejected + Minority
 *    - 0/5 cadeiras (com votação) → Rejected + None
 *    - Sem votação válida (interrompido antes de VotingOpen) → Inconclusive + None
 * 5. Integridade do snapshot (TimerConfig, TurnedChairs, durations, flags)
 * 6. Consulta de histórico: GET /api/rounds (filtro por eventId), /api/rounds/last, /api/rounds/{id}
 * 7. Broadcast SignalR em tempo real: RoundArchived
 * 8. Teardown e restauração de estado (ADR-008)
 */

const http = require('http');

let signalR = null;
try {
  signalR = require('../frontend/node_modules/@microsoft/signalr');
} catch (e) {
  try {
    signalR = require('@microsoft/signalr');
  } catch (err) {
    console.warn('[WARN] @microsoft/signalr não encontrado.');
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

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const postData = body ? JSON.stringify(body) : null;
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        Accept: 'application/json',
        ...(postData ? {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        } : {}),
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let parsed = null;
        try {
          if (data) parsed = JSON.parse(data);
        } catch (e) {
          parsed = data;
        }
        resolve({ status: res.statusCode, body: parsed });
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function run() {
  console.log('\n============================================================');
  console.log('  ARENA VOICE POC — TEST SUITE: ROUND HISTORY & RESULT ENGINE (3D)');
  console.log('============================================================');
  console.log(`Alvo do teste: ${BASE_URL}\n`);

  let initialEventId = null;
  let initialProjectId = null;
  let dynamicEventId = null;
  const dynamicProjectIds = [];

  try {
    // =========================================================================
    // 0. CAPTURA DE ESTADO INICIAL (ADR-008)
    // =========================================================================
    console.log('[0] Captura de estado inicial para teardown resiliente');
    const initState = await request('GET', '/api/state');
    assert(initState.status === 200, 'GET /api/state responde com HTTP 200');
    initialEventId = initState.body?.currentEvent?.id;
    initialProjectId = initState.body?.currentProject?.id;

    // =========================================================================
    // 1. SETUP DO EVENTO E PROJETOS DE TESTE
    // =========================================================================
    console.log('\n[1] Criação de Evento e Projetos com LockoutEnabled: true');
    const createEvt = await request('POST', '/api/events', {
      title: 'Demo Day 3D — Round Engine',
      description: 'Validação da autoridade de histórico e motor de resultado.',
      timers: {
        pitchDurationSeconds: 120,
        qaDurationSeconds: 60,
        votingDurationSeconds: 30,
        lockoutEnabled: true,
      },
    });
    assert(createEvt.status === 201, 'POST /api/events cria evento 3D com HTTP 201');
    dynamicEventId = createEvt.body?.id;

    await request('POST', `/api/events/${dynamicEventId}/activate`);

    // Cria 5 projetos para cobrir todos os cenários do Result Engine
    const projectTitles = [
      'Projeto Unanimous (5/5)',
      'Projeto Majority (3/5)',
      'Projeto Minority (2/5)',
      'Projeto Rejected (0/5)',
      'Projeto Inconclusive (Interrompido)',
    ];

    for (let i = 0; i < projectTitles.length; i++) {
      const pRes = await request('POST', '/api/projects', {
        title: projectTitles[i],
        pitchLeader: `Líder #${i + 1}`,
        track: 'Inovação',
      });
      assert(pRes.status === 201, `Projeto #${i + 1} criado com HTTP 201`);
      dynamicProjectIds.push(pRes.body?.id);
    }

    // =========================================================================
    // 2. CENÁRIO 1: RESULTADO UNANIMOUS (5/5 CADEIRAS) & ARQUIVAMENTO EM FINISHED
    // =========================================================================
    console.log('\n[2] Cenário 1: Resultado Unanimous (5/5) & Arquivamento em Finished');
    await request('POST', `/api/projects/${dynamicProjectIds[0]}/select`);
    await request('POST', '/api/pitch/transition', { targetStage: 'PitchRunning' });
    await request('POST', '/api/pitch/transition', { targetStage: 'QA' });
    await request('POST', '/api/pitch/transition', { targetStage: 'VotingOpen' });

    // Votação unânime: vira todas as 5 cadeiras
    for (let chairId = 1; chairId <= 5; chairId++) {
      await request('POST', '/api/chair-press', { chairId });
    }

    await request('POST', '/api/pitch/transition', { targetStage: 'VotingClosed' });
    const finishRes = await request('POST', '/api/pitch/transition', { targetStage: 'Finished' });
    assert(finishRes.status === 200, 'Transição para Finished concluída com HTTP 200');
    assert(Boolean(finishRes.body?.archivedRound), 'Payload de Finished inclui archivedRound');

    const lastRound1 = await request('GET', '/api/rounds/last');
    assert(lastRound1.status === 200, 'GET /api/rounds/last retorna HTTP 200');
    assert(lastRound1.body?.projectId === dynamicProjectIds[0], 'Round arquivado pertence ao Projeto 1');
    assert(lastRound1.body?.result === 'Approved', 'Result Engine calculou Result = Approved');
    assert(lastRound1.body?.resultCode === 1, 'ResultCode = 1');
    assert(lastRound1.body?.approvalMode === 'Unanimous', 'ApprovalMode = Unanimous');
    assert(lastRound1.body?.approvalModeCode === 1, 'ApprovalModeCode = 1');
    assert(lastRound1.body?.turnedChairCount === 5, 'TurnedChairCount = 5');
    assert(Array.isArray(lastRound1.body?.turnedChairs) && lastRound1.body?.turnedChairs.length === 5, 'TurnedChairs contém 5 IDs');
    assert(lastRound1.body?.totalChairs === 5, 'TotalChairs = 5');
    assert(lastRound1.body?.lastStageReached === 'Finished', 'LastStageReached = Finished');
    assert(lastRound1.body?.durationSeconds >= 0, 'DurationSeconds registrado');
    assert(Boolean(lastRound1.body?.archivedAt), 'ArchivedAt gravado com timestamp');
    assert(lastRound1.body?.timerConfig?.lockoutEnabled === true, 'TimerConfig snapshot preservado imutável');

    // =========================================================================
    // 3. CENÁRIO 2: PROTEÇÃO EXPLÍCITA CONTRA DOUBLE-FIRE
    // =========================================================================
    console.log('\n[3] Cenário 2: Proteção Explícita Contra Double-Fire');
    const roundsBeforeSwitch = await request('GET', `/api/rounds?eventId=${dynamicEventId}`);
    const countBefore = roundsBeforeSwitch.body?.length || 0;
    assert(countBefore === 1, 'Histórico contém exatamente 1 rodada antes da troca de projeto');

    // Seleciona o Projeto 2 — a rodada do Projeto 1 já foi arquivada em Finished,
    // portanto NÃO deve ser arquivada novamente ao trocar de projeto!
    await request('POST', `/api/projects/${dynamicProjectIds[1]}/select`);
    const roundsAfterSwitch = await request('GET', `/api/rounds?eventId=${dynamicEventId}`);
    assert(roundsAfterSwitch.body?.length === countBefore, 'Proteção Double-Fire: troca de projeto após Finished NÃO duplica rodada');

    // =========================================================================
    // 4. CENÁRIO 3: RESULTADO MAJORITY (3 OU 4 CADEIRAS)
    // =========================================================================
    console.log('\n[4] Cenário 3: Resultado Majority (3/5 cadeiras)');
    await request('POST', '/api/pitch/transition', { targetStage: 'PitchRunning' });
    await request('POST', '/api/pitch/transition', { targetStage: 'VotingOpen' });

    // Vira 3 cadeiras (1, 3, 5)
    await request('POST', '/api/chair-press', { chairId: 1 });
    await request('POST', '/api/chair-press', { chairId: 3 });
    await request('POST', '/api/chair-press', { chairId: 5 });

    await request('POST', '/api/pitch/transition', { targetStage: 'VotingClosed' });
    await request('POST', '/api/pitch/transition', { targetStage: 'Finished' });

    const lastRound2 = await request('GET', '/api/rounds/last');
    assert(lastRound2.body?.projectId === dynamicProjectIds[1], 'Round pertence ao Projeto 2');
    assert(lastRound2.body?.result === 'Approved', 'Result Engine calculou Result = Approved');
    assert(lastRound2.body?.approvalMode === 'Majority', 'ApprovalMode = Majority (3/5)');
    assert(lastRound2.body?.approvalModeCode === 2, 'ApprovalModeCode = 2');
    assert(lastRound2.body?.turnedChairCount === 3, 'TurnedChairCount = 3');

    // =========================================================================
    // 5. CENÁRIO 4: RESULTADO MINORITY (1 OU 2 CADEIRAS)
    // =========================================================================
    console.log('\n[5] Cenário 4: Resultado Minority (2/5 cadeiras)');
    await request('POST', `/api/projects/${dynamicProjectIds[2]}/select`);
    await request('POST', '/api/pitch/transition', { targetStage: 'PitchRunning' });
    await request('POST', '/api/pitch/transition', { targetStage: 'VotingOpen' });

    // Vira 2 cadeiras (2, 4)
    await request('POST', '/api/chair-press', { chairId: 2 });
    await request('POST', '/api/chair-press', { chairId: 4 });

    await request('POST', '/api/pitch/transition', { targetStage: 'VotingClosed' });
    await request('POST', '/api/pitch/transition', { targetStage: 'Finished' });

    const lastRound3 = await request('GET', '/api/rounds/last');
    assert(lastRound3.body?.projectId === dynamicProjectIds[2], 'Round pertence ao Projeto 3');
    assert(lastRound3.body?.result === 'Rejected', 'Result Engine calculou Result = Rejected para minoria');
    assert(lastRound3.body?.resultCode === 2, 'ResultCode = 2 (Rejected)');
    assert(lastRound3.body?.approvalMode === 'Minority', 'ApprovalMode = Minority (2/5)');
    assert(lastRound3.body?.approvalModeCode === 3, 'ApprovalModeCode = 3');
    assert(lastRound3.body?.turnedChairCount === 2, 'TurnedChairCount = 2');

    // =========================================================================
    // 6. CENÁRIO 5: RESULTADO REJECTED (0 CADEIRAS COM VOTAÇÃO ABERTA)
    // =========================================================================
    console.log('\n[6] Cenário 5: Resultado Rejected (0/5 cadeiras com votação aberta)');
    await request('POST', `/api/projects/${dynamicProjectIds[3]}/select`);
    await request('POST', '/api/pitch/transition', { targetStage: 'PitchRunning' });
    await request('POST', '/api/pitch/transition', { targetStage: 'VotingOpen' });
    // Zero cadeiras viradas
    await request('POST', '/api/pitch/transition', { targetStage: 'VotingClosed' });
    await request('POST', '/api/pitch/transition', { targetStage: 'Finished' });

    const lastRound4 = await request('GET', '/api/rounds/last');
    assert(lastRound4.body?.projectId === dynamicProjectIds[3], 'Round pertence ao Projeto 4');
    assert(lastRound4.body?.result === 'Rejected', 'Result = Rejected para 0 cadeiras');
    assert(lastRound4.body?.approvalMode === 'None', 'ApprovalMode = None para 0 cadeiras');
    assert(lastRound4.body?.approvalModeCode === 0, 'ApprovalModeCode = 0');
    assert(lastRound4.body?.turnedChairCount === 0, 'TurnedChairCount = 0');

    // =========================================================================
    // 7. CENÁRIO 6: RESULTADO INCONCLUSIVE & ARQUIVAMENTO AUTOMÁTICO NA TROCA
    // =========================================================================
    console.log('\n[7] Cenário 6: Resultado Inconclusive & Arquivamento na Troca de Projeto');
    await request('POST', `/api/projects/${dynamicProjectIds[4]}/select`);
    await request('POST', '/api/pitch/transition', { targetStage: 'PitchRunning' });
    // Interrompe apresentação durante fala (sem abrir votação) trocando para Projeto 1
    const switchRes = await request('POST', `/api/projects/${dynamicProjectIds[0]}/select`);
    assert(switchRes.status === 200, 'Troca de projeto realizada durante pitch ativo');

    const lastRound5 = await request('GET', '/api/rounds/last');
    assert(lastRound5.body?.projectId === dynamicProjectIds[4], 'Rodada anterior arquivada automaticamente na troca');
    assert(lastRound5.body?.result === 'Inconclusive', 'Result = Inconclusive (sem votação válida)');
    assert(lastRound5.body?.resultCode === 3, 'ResultCode = 3 (Inconclusive)');
    assert(lastRound5.body?.approvalMode === 'None', 'ApprovalMode = None');
    assert(lastRound5.body?.lastStageReached === 'PitchRunning', 'LastStageReached reflete estágio em que foi interrompido');

    // =========================================================================
    // 8. CONSULTA DE HISTÓRICO: FILTROS E BUSCA POR ID
    // =========================================================================
    console.log('\n[8] Consulta de Histórico: Filtros e Busca por ID');
    const allRounds = await request('GET', '/api/rounds');
    assert(allRounds.status === 200, 'GET /api/rounds retorna HTTP 200');
    assert(Array.isArray(allRounds.body), 'Retorno é array de rodadas');
    assert(allRounds.body?.length >= 5, 'Histórico global contém pelo menos 5 rodadas registradas');

    const eventRounds = await request('GET', `/api/rounds?eventId=${dynamicEventId}`);
    assert(eventRounds.status === 200, 'GET /api/rounds?eventId retorna HTTP 200');
    assert(eventRounds.body?.length === 5, 'Filtro por eventId retorna exatamente as 5 rodadas do evento de teste');
    assert(eventRounds.body.every(r => r.eventId === dynamicEventId), 'Todas as rodadas retornadas pertencem ao evento');

    const firstRoundId = eventRounds.body[0]?.id;
    const singleRound = await request('GET', `/api/rounds/${firstRoundId}`);
    assert(singleRound.status === 200, `GET /api/rounds/${firstRoundId} retorna HTTP 200`);
    assert(singleRound.body?.id === firstRoundId, 'ID da rodada consultada coincide');

    const notFoundRound = await request('GET', '/api/rounds/id-inexistente-xyz');
    assert(notFoundRound.status === 404, 'GET /api/rounds/{id-inexistente} retorna HTTP 404 Not Found');

    // =========================================================================
    // 9. VALIDAÇÃO DE BROADCAST REALTIME SIGNALR (RoundArchived)
    // =========================================================================
    console.log('\n[9] Validação de Broadcast Realtime SignalR (RoundArchived)');
    if (signalR) {
      const hubUrl = `${BASE_URL}/hubs/arena-poc`;
      const connection = new signalR.HubConnectionBuilder()
        .withUrl(hubUrl)
        .configureLogging(signalR.LogLevel.None)
        .build();

      const archivedEvents = [];
      connection.on('RoundArchived', (data) => archivedEvents.push(data));

      try {
        await connection.start();
        assert(connection.state === 'Connected', 'Conexão SignalR estabelecida');

        // Cria e seleciona um novo projeto para disparo SignalR
        const pSignalR = await request('POST', '/api/projects', {
          title: 'Projeto SignalR Realtime',
          pitchLeader: 'Tester SignalR',
          track: 'Tech',
        });
        const pSignalRId = pSignalR.body?.id;
        dynamicProjectIds.push(pSignalRId);

        await request('POST', `/api/projects/${pSignalRId}/select`);
        await request('POST', '/api/pitch/transition', { targetStage: 'PitchRunning' });
        await request('POST', '/api/pitch/transition', { targetStage: 'VotingOpen' });
        await request('POST', '/api/chair-press', { chairId: 1 });
        await request('POST', '/api/chair-press', { chairId: 2 });
        await request('POST', '/api/chair-press', { chairId: 3 });
        await request('POST', '/api/chair-press', { chairId: 4 });
        await request('POST', '/api/pitch/transition', { targetStage: 'VotingClosed' });

        // Dispara Finished que deve arquivar e emitir RoundArchived
        await request('POST', '/api/pitch/transition', { targetStage: 'Finished' });
        await wait(250);

        assert(archivedEvents.length > 0, 'SignalR recebeu evento RoundArchived');
        const lastSignalREvent = archivedEvents[archivedEvents.length - 1];
        assert(lastSignalREvent?.round?.projectId === pSignalRId, 'Evento SignalR informa round.projectId correto');
        assert(lastSignalREvent?.round?.result === 'Approved', 'Evento SignalR informa round.result = Approved');
        assert(lastSignalREvent?.round?.approvalMode === 'Majority', 'Evento SignalR informa round.approvalMode = Majority');
        assert(lastSignalREvent?.round?.turnedChairCount === 4, 'Evento SignalR informa turnedChairCount = 4');

        await connection.stop();
      } catch (err) {
        console.error('  [FAIL] Erro na validação SignalR:', err.message);
        assert(false, 'SignalR RoundArchived validation');
      }
    } else {
      console.log('  [SKIP] SignalR client não instalado localmente.');
    }

  } catch (err) {
    console.error('\nErro inesperado durante a execução da suíte 3D:', err);
    assert(false, 'Execução da suíte sem exceções não tratadas', err.message);
  } finally {
    // =========================================================================
    // 10. TEARDOWN E RESTAURAÇÃO DE ESTADO (ADR-008)
    // =========================================================================
    console.log('\n[10] Teardown e Restauração de Estado');
    try {
      if (initialEventId) {
        console.log(`    Restaurando evento original: ${initialEventId}`);
        await request('POST', `/api/events/${initialEventId}/activate`);
      }
      if (initialProjectId) {
        console.log(`    Restaurando projeto original: ${initialProjectId}`);
        await request('POST', `/api/projects/${initialProjectId}/select`);
      }
      for (const pId of dynamicProjectIds) {
        if (pId) await request('DELETE', `/api/projects/${pId}`);
      }
      if (dynamicEventId) {
        await request('POST', `/api/events/${dynamicEventId}/archive`);
      }
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
    console.log('>>> [SUITE APPROVED] TODAS AS ASSERÇÕES DO 3D PASSARAM COM SUCESSO! <<<\n');
    process.exit(0);
  } else {
    console.error('>>> [SUITE FAILED] EXISTEM ASSERÇÕES COM FALHA! <<<\n');
    process.exit(1);
  }
}

run();
