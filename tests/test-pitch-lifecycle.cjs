/**
 * test-pitch-lifecycle.cjs — Suíte de Testes Automatizados para o Milestone 3B
 * 
 * Validação rigorosa da Máquina de Estados Operacional do Pitch (Pitch Lifecycle Engine):
 * 1. Setup autônomo e dinâmico (zero IDs fixos / seed independence)
 * 2. Estado inicial pós-seleção: PitchStage.Waiting (código 0)
 * 3. Fluxo canônico completo: Waiting -> PitchRunning -> Q&A -> VotingOpen -> VotingClosed -> Finished
 * 4. Promoção do projeto ativo para Completed (status 2) ao atingir Finished
 * 5. Finished estritamente TERMINAL (rejeição 422 para qualquer transição a partir de Finished)
 * 6. Rejeições 422 Unprocessable Entity para transições inválidas
 * 7. Transições de retorno permitidas (Waiting <-> PitchRunning <-> QA <-> VotingOpen <-> VotingClosed)
 * 8. POST /api/pitch/reset (reseta cadeiras para 0°, retorna a Waiting e preserva projeto no palco)
 * 9. Enriquecimento de snapshot GET /api/state com pitchState
 * 10. Despacho e recepção de eventos SignalR PitchStageChanged e ChairsReset
 * 11. Teardown e restauração de estado (ADR-008)
 */

const http = require('http');

let signalR = null;
try {
  signalR = require('../frontend/node_modules/@microsoft/signalr');
} catch (e) {
  try {
    signalR = require('@microsoft/signalr');
  } catch (err) {
    console.warn('[WARN] @microsoft/signalr não encontrado localmente. Testes SignalR serão adaptados.');
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
  console.log('  ARENA VOICE POC — TEST SUITE: PITCH LIFECYCLE ENGINE (3B) ');
  console.log('============================================================');
  console.log(`Alvo do teste: ${BASE_URL}\n`);

  let initialEventId = null;
  let initialProjectId = null;
  let dynamicEventId = null;
  let dynamicProjectId1 = null;
  let dynamicProjectId2 = null;

  try {
    // =========================================================================
    // 0. CAPTURA DE ESTADO INICIAL PARA RESTAURAÇÃO
    // =========================================================================
    console.log('[0] Captura de estado inicial para teardown resiliente');
    const initialStateRes = await request('GET', '/api/state');
    assert(initialStateRes.status === 200, 'GET /api/state retorna HTTP 200');
    initialEventId = initialStateRes.body?.currentEvent?.id || null;
    initialProjectId = initialStateRes.body?.currentProject?.id || null;
    console.log(`    Contexto Inicial: Evento=${initialEventId || 'Nenhum'}, Projeto=${initialProjectId || 'Nenhum'}`);

    // =========================================================================
    // 1. SETUP DINÂMICO E AUTÔNOMO (Zero IDs hardcoded)
    // =========================================================================
    console.log('\n[1] Setup Dinâmico e Autônomo');
    const timestamp = Date.now();
    const eventPayload = {
      title: `Evento Teste Pitch Lifecycle ${timestamp}`,
      description: 'Evento criado dinamicamente para validação da máquina de estados do pitch',
      scheduledDate: new Date().toISOString(),
      branding: {
        primaryColor: '#00a86b',
        secondaryColor: '#ffffff',
        tagline: 'Lifecycle Validation Arena',
      },
    };

    const createEvtRes = await request('POST', '/api/events', eventPayload);
    assert(createEvtRes.status === 201, 'POST /api/events cria novo evento dinâmico (HTTP 201)');
    dynamicEventId = createEvtRes.body?.id;
    assert(Boolean(dynamicEventId), `Evento dinâmico criado com ID: ${dynamicEventId}`);

    // Ativa o evento
    const activateEvtRes = await request('POST', `/api/events/${dynamicEventId}/activate`);
    assert(activateEvtRes.status === 200, 'POST /api/events/{id}/activate ativa o evento dinâmico');

    // Cria projeto 1 dinâmico
    const proj1Payload = {
      title: `Startup Alfa ${timestamp}`,
      pitchLeader: 'Dra. Helena Vasconcelos',
      track: 'HealthTech',
      description: 'Diagnóstico precoce por IA e biossensores.',
      orderIndex: 1,
    };
    const createProj1Res = await request('POST', '/api/projects', proj1Payload);
    assert(createProj1Res.status === 201, 'POST /api/projects cria Projeto 1 dinâmico (HTTP 201)');
    dynamicProjectId1 = createProj1Res.body?.id;
    assert(Boolean(dynamicProjectId1), `Projeto 1 criado com ID: ${dynamicProjectId1}`);

    // Cria projeto 2 dinâmico
    const proj2Payload = {
      title: `Startup Beta ${timestamp}`,
      pitchLeader: 'Carlos Drummond',
      track: 'AgriTech',
      description: 'Drones para monitoramento de lavouras.',
      orderIndex: 2,
    };
    const createProj2Res = await request('POST', '/api/projects', proj2Payload);
    assert(createProj2Res.status === 201, 'POST /api/projects cria Projeto 2 dinâmico (HTTP 201)');
    dynamicProjectId2 = createProj2Res.body?.id;
    assert(Boolean(dynamicProjectId2), `Projeto 2 criado com ID: ${dynamicProjectId2}`);

    // =========================================================================
    // 2. INICIALIZAÇÃO DO PITCH NA SELEÇÃO DO PROJETO (Waiting = 0)
    // =========================================================================
    console.log('\n[2] Inicialização do Pitch na Seleção do Projeto (Waiting = 0)');
    const selectProj1Res = await request('POST', `/api/projects/${dynamicProjectId1}/select`);
    assert(selectProj1Res.status === 200, 'POST /api/projects/{id}/select seleciona Projeto 1');

    // Consulta GET /api/pitch/state
    const pitchStateRes = await request('GET', '/api/pitch/state');
    assert(pitchStateRes.status === 200, 'GET /api/pitch/state retorna HTTP 200');
    assert(pitchStateRes.body?.stage === 'Waiting' || pitchStateRes.body?.stageName === 'Waiting', 'Estágio inicial é Waiting');
    assert(pitchStateRes.body?.stageCode === 0, 'stageCode inicial é 0');
    assert(pitchStateRes.body?.projectId === dynamicProjectId1, 'projectId aponta para Projeto 1');
    assert(Array.isArray(pitchStateRes.body?.allowedTransitions), 'allowedTransitions é uma lista');
    assert(pitchStateRes.body?.allowedTransitions?.includes('PitchRunning'), 'allowedTransitions contém PitchRunning');

    // Valida snapshot GET /api/state enriquecido
    const stateRes = await request('GET', '/api/state');
    assert(stateRes.status === 200, 'GET /api/state retorna HTTP 200');
    assert(stateRes.body?.pitchState?.stage === 'Waiting' || stateRes.body?.pitchState?.stageName === 'Waiting', 'Snapshot GET /api/state enriquecido com pitchState Waiting');
    assert(stateRes.body?.pitchState?.stageCode === 0, 'Snapshot informa stageCode = 0');

    // =========================================================================
    // 3. FLUXO CANÔNICO COMPLETO (HAPPY PATH)
    // =========================================================================
    console.log('\n[3] Fluxo Canônico Completo (Happy Path)');

    // 3.1 Waiting -> PitchRunning
    console.log('  3.1 Transição: Waiting -> PitchRunning');
    const t1 = await request('POST', '/api/pitch/transition', { targetStage: 'PitchRunning' });
    assert(t1.status === 200, 'Waiting -> PitchRunning retorna HTTP 200');
    assert(t1.body?.currentStage === 'PitchRunning', 'currentStage atualizado para PitchRunning');
    assert(t1.body?.stageCode === 1, 'stageCode atualizado para 1');
    assert(t1.body?.allowedTransitions?.includes('QA'), 'allowedTransitions de PitchRunning contém QA');

    // 3.2 PitchRunning -> QA (testando tolerância a "Q&A")
    console.log('  3.2 Transição: PitchRunning -> Q&A');
    const t2 = await request('POST', '/api/pitch/transition', { targetStage: 'Q&A' });
    assert(t2.status === 200, 'PitchRunning -> Q&A aceito e mapeado para QA (HTTP 200)');
    assert(t2.body?.currentStage === 'QA', 'currentStage é QA');
    assert(t2.body?.stageCode === 2, 'stageCode é 2');
    assert(t2.body?.allowedTransitions?.includes('VotingOpen'), 'allowedTransitions de QA contém VotingOpen');

    // 3.3 QA -> VotingOpen
    console.log('  3.3 Transição: QA -> VotingOpen');
    const t3 = await request('POST', '/api/pitch/transition', { targetStage: 'VotingOpen' });
    assert(t3.status === 200, 'QA -> VotingOpen retorna HTTP 200');
    assert(t3.body?.currentStage === 'VotingOpen', 'currentStage atualizado para VotingOpen');
    assert(t3.body?.stageCode === 3, 'stageCode é 3');
    assert(t3.body?.allowedTransitions?.includes('VotingClosed'), 'allowedTransitions de VotingOpen contém VotingClosed');

    // 3.4 VotingOpen -> VotingClosed
    console.log('  3.4 Transição: VotingOpen -> VotingClosed');
    const t4 = await request('POST', '/api/pitch/transition', { targetStage: 'VotingClosed' });
    assert(t4.status === 200, 'VotingOpen -> VotingClosed retorna HTTP 200');
    assert(t4.body?.currentStage === 'VotingClosed', 'currentStage atualizado para VotingClosed');
    assert(t4.body?.stageCode === 4, 'stageCode é 4');
    assert(t4.body?.allowedTransitions?.includes('Finished'), 'allowedTransitions de VotingClosed contém Finished');

    // 3.5 VotingClosed -> Finished
    console.log('  3.5 Transição: VotingClosed -> Finished');
    const t5 = await request('POST', '/api/pitch/transition', { targetStage: 'Finished' });
    assert(t5.status === 200, 'VotingClosed -> Finished retorna HTTP 200');
    assert(t5.body?.currentStage === 'Finished', 'currentStage atualizado para Finished');
    assert(t5.body?.stageCode === 5, 'stageCode é 5');
    assert(t5.body?.allowedTransitions?.length === 0, 'Finished é terminal: allowedTransitions é vazio');

    // =========================================================================
    // 4. PROMOÇÃO DO PROJETO PARA COMPLETED AO ATINGIR FINISHED
    // =========================================================================
    console.log('\n[4] Promoção do Projeto para Completed ao atingir Finished');
    const getProj1After = await request('GET', `/api/projects/${dynamicProjectId1}`);
    assert(getProj1After.status === 200, 'GET /api/projects/{id} retorna HTTP 200');
    assert(getProj1After.body?.status === 2, 'Status do Projeto 1 promovido para Completed (2)');
    assert(Boolean(getProj1After.body?.presentationEndedAt), 'presentationEndedAt do Projeto 1 foi preenchido');

    // =========================================================================
    // 5. ESTADO TERMINAL FINISHED E REJEIÇÕES HTTP 422
    // =========================================================================
    console.log('\n[5] Estado Terminal Finished e Rejeições HTTP 422');

    // 5.1 Tentativa de transição Finished -> Waiting via API
    const failWaiting = await request('POST', '/api/pitch/transition', { targetStage: 'Waiting' });
    assert(failWaiting.status === 422, 'Finished -> Waiting rejeitado com HTTP 422 (Finished é estritamente terminal)', `Recebido: ${failWaiting.status}`);
    assert(Boolean(failWaiting.body?.error), 'Resposta de erro contém mensagem explicativa');

    // 5.2 Tentativa de transição Finished -> PitchRunning
    const failRunning = await request('POST', '/api/pitch/transition', { targetStage: 'PitchRunning' });
    assert(failRunning.status === 422, 'Finished -> PitchRunning rejeitado com HTTP 422');

    // 5.3 Estágio inexistente / desconhecido
    const failUnknown = await request('POST', '/api/pitch/transition', { targetStage: 'InvalidStageName' });
    assert(failUnknown.status === 422, 'Estágio desconhecido rejeitado com HTTP 422');

    // =========================================================================
    // 6. RETORNO PARA WAITING ATRAVÉS DA SELEÇÃO DE NOVO PROJETO
    // =========================================================================
    console.log('\n[6] Retorno para Waiting através da Seleção de Novo Projeto');
    const selectProj2Res = await request('POST', `/api/projects/${dynamicProjectId2}/select`);
    assert(selectProj2Res.status === 200, 'Seleção de Projeto 2 retorna HTTP 200');

    const stateAfterProj2 = await request('GET', '/api/pitch/state');
    assert(stateAfterProj2.status === 200, 'GET /api/pitch/state retorna HTTP 200');
    assert(stateAfterProj2.body?.stage === 'Waiting' || stateAfterProj2.body?.stageName === 'Waiting', 'Seleção de novo projeto reabre rodada em Waiting');
    assert(stateAfterProj2.body?.stageCode === 0, 'stageCode redefinido para 0');
    assert(stateAfterProj2.body?.projectId === dynamicProjectId2, 'projectId aponta para Projeto 2');

    // =========================================================================
    // 7. TRANSIÇÕES INVÁLIDAS A PARTIR DE WAITING (HTTP 422)
    // =========================================================================
    console.log('\n[7] Transições Inválidas a partir de Waiting (HTTP 422)');
    const skipToQA = await request('POST', '/api/pitch/transition', { targetStage: 'QA' });
    assert(skipToQA.status === 422, 'Waiting -> QA rejeitado com HTTP 422 (pulo de etapa)');

    const skipToVoting = await request('POST', '/api/pitch/transition', { targetStage: 'VotingOpen' });
    assert(skipToVoting.status === 422, 'Waiting -> VotingOpen rejeitado com HTTP 422');

    const skipToClosed = await request('POST', '/api/pitch/transition', { targetStage: 'VotingClosed' });
    assert(skipToClosed.status === 422, 'Waiting -> VotingClosed rejeitado com HTTP 422');

    // =========================================================================
    // 8. TRANSIÇÕES DE RETORNO / REVERSÃO PERMITIDAS PELA MÁQUINA DE ESTADOS
    // =========================================================================
    console.log('\n[8] Transições de Retorno / Reversão Permitidas');

    // 8.1 Waiting -> PitchRunning -> Waiting (cancelar / abortar pitch)
    await request('POST', '/api/pitch/transition', { targetStage: 'PitchRunning' });
    const revertWaiting = await request('POST', '/api/pitch/transition', { targetStage: 'Waiting' });
    assert(revertWaiting.status === 200, 'PitchRunning -> Waiting permitido (HTTP 200)');
    assert(revertWaiting.body?.currentStage === 'Waiting', 'Retornou com sucesso para Waiting');

    // 8.2 Waiting -> PitchRunning -> QA -> PitchRunning (voltar apresentação durante QA)
    await request('POST', '/api/pitch/transition', { targetStage: 'PitchRunning' });
    await request('POST', '/api/pitch/transition', { targetStage: 'QA' });
    const revertRunning = await request('POST', '/api/pitch/transition', { targetStage: 'PitchRunning' });
    assert(revertRunning.status === 200, 'QA -> PitchRunning permitido (HTTP 200)');
    assert(revertRunning.body?.currentStage === 'PitchRunning', 'Retornou com sucesso para PitchRunning');

    // 8.3 PitchRunning -> QA -> VotingOpen -> QA (reabrir perguntas durante votação)
    await request('POST', '/api/pitch/transition', { targetStage: 'QA' });
    await request('POST', '/api/pitch/transition', { targetStage: 'VotingOpen' });
    const revertQA = await request('POST', '/api/pitch/transition', { targetStage: 'QA' });
    assert(revertQA.status === 200, 'VotingOpen -> QA permitido (HTTP 200)');
    assert(revertQA.body?.currentStage === 'QA', 'Retornou com sucesso para QA');

    // 8.4 QA -> VotingOpen -> VotingClosed -> VotingOpen (reabrir votação após fechamento)
    await request('POST', '/api/pitch/transition', { targetStage: 'VotingOpen' });
    await request('POST', '/api/pitch/transition', { targetStage: 'VotingClosed' });
    const revertVoting = await request('POST', '/api/pitch/transition', { targetStage: 'VotingOpen' });
    assert(revertVoting.status === 200, 'VotingClosed -> VotingOpen permitido (HTTP 200)');
    assert(revertVoting.body?.currentStage === 'VotingOpen', 'Retornou com sucesso para VotingOpen');

    // =========================================================================
    // 9. POST /api/pitch/reset (RESET DE CADEIRAS E RETORNO A WAITING)
    // =========================================================================
    console.log('\n[9] Testando POST /api/pitch/reset');
    // Simula cadeira acionada
    await request('POST', '/api/chair-press', { seatNumber: 1, chairId: 1 });
    await request('POST', '/api/chair-press', { seatNumber: 3, chairId: 3 });

    const stateBeforeReset = await request('GET', '/api/state');
    assert(stateBeforeReset.body?.activeCount >= 2, 'Cadeiras acionadas na arena antes do reset');

    const resetRes = await request('POST', '/api/pitch/reset');
    assert(resetRes.status === 200, 'POST /api/pitch/reset retorna HTTP 200');
    assert(resetRes.body?.stage === 'Waiting', 'Estágio resetado para Waiting');
    assert(resetRes.body?.stageCode === 0, 'stageCode resetado para 0');
    assert(resetRes.body?.projectId === dynamicProjectId2, 'Projeto 2 permanece selecionado no palco');

    // Valida cadeiras resetadas no snapshot
    const stateAfterReset = await request('GET', '/api/state');
    assert(stateAfterReset.body?.activeCount === 0, 'Todas as cadeiras retornaram para false (0°)');
    assert(stateAfterReset.body?.pitchState?.stage === 'Waiting' || stateAfterReset.body?.pitchState?.stageName === 'Waiting', 'pitchState em /api/state confirma Waiting pós-reset');

    // =========================================================================
    // 10. INTEGRAÇÃO REALTIME SIGNALR (PitchStageChanged e ChairsReset)
    // =========================================================================
    console.log('\n[10] Integração Realtime SignalR');
    if (signalR) {
      const hubUrl = `${BASE_URL}/hubs/arena-poc`;
      const connection = new signalR.HubConnectionBuilder()
        .withUrl(hubUrl)
        .configureLogging(signalR.LogLevel.None)
        .build();

      const receivedPitchEvents = [];
      const receivedChairsReset = [];

      connection.on('PitchStageChanged', (data) => {
        receivedPitchEvents.push(data);
      });

      connection.on('ChairsReset', () => {
        receivedChairsReset.push(true);
      });

      try {
        await connection.start();
        assert(connection.state === 'Connected', 'Conexão SignalR estabelecida com sucesso');

        // Dispara transição via HTTP e aguarda broadcast SignalR
        await request('POST', '/api/pitch/transition', { targetStage: 'PitchRunning' });
        await wait(250);

        assert(receivedPitchEvents.length > 0, 'SignalR recebeu evento PitchStageChanged');
        const lastEvent = receivedPitchEvents[receivedPitchEvents.length - 1];
        assert(lastEvent?.currentStage === 'PitchRunning' || lastEvent?.stage === 'PitchRunning', 'SignalR PitchStageChanged informa stage PitchRunning');
        assert(lastEvent?.stageCode === 1, 'SignalR PitchStageChanged informa stageCode = 1');
        assert(lastEvent?.projectId === dynamicProjectId2, 'SignalR PitchStageChanged informa projectId correto');
        assert(Boolean(lastEvent?.timestamp), 'SignalR PitchStageChanged possui timestamp');

        // Dispara reset de pitch via HTTP e aguarda broadcast SignalR
        await request('POST', '/api/pitch/reset');
        await wait(250);

        assert(receivedChairsReset.length > 0, 'SignalR recebeu evento ChairsReset após reset de pitch');
        const lastResetPitchEvent = receivedPitchEvents[receivedPitchEvents.length - 1];
        assert(lastResetPitchEvent?.stage === 'Waiting', 'SignalR PitchStageChanged informa Waiting pós-reset');

        await connection.stop();
      } catch (err) {
        console.error('  [FAIL] Erro na verificação SignalR:', err.message);
        assert(false, 'SignalR realtime validation');
      }
    } else {
      console.log('  [SKIP] Teste SignalR ignorado (módulo não disponível no runner).');
    }

  } catch (err) {
    console.error('\nErro inesperado durante a execução da suíte:', err);
    assert(false, 'Execução da suíte sem exceções não tratadas', err.message);
  } finally {
    // =========================================================================
    // 11. TEARDOWN E RESTAURAÇÃO DE ESTADO
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
      if (dynamicProjectId1) {
        await request('DELETE', `/api/projects/${dynamicProjectId1}`);
      }
      if (dynamicProjectId2) {
        await request('DELETE', `/api/projects/${dynamicProjectId2}`);
      }
      console.log('    Limpeza de dados dinâmicos de teste concluída com sucesso.');
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
    console.log('>>> [SUITE APPROVED] TODAS AS ASSERCOES PASSARAM COM SUCESSO! <<<\n');
    process.exit(0);
  } else {
    console.error('>>> [SUITE FAILED] EXISTEM ASSERCOES COM FALHA! <<<\n');
    process.exit(1);
  }
}

run();
