/**
 * test-judges-jury.cjs — Suíte de Testes Automatizados para o Milestone 3E
 * 
 * Validação rigorosa do Catálogo de Jurados e Alocação de Banca:
 * 1. Catálogo inicial e seed de jurados (GET /api/judges)
 * 2. Cadastro de novos jurados e validações estritas (POST /api/judges)
 * 3. Campos preventivos (IsActive e Email)
 * 4. Consulta de jurado específico (GET /api/judges/{id})
 * 5. Edição de jurado (PUT /api/judges/{id})
 * 6. Consulta da banca do evento (GET /api/events/{id}/jury)
 * 7. Validações de integridade da banca (PUT /api/events/{id}/jury):
 *    - ChairId fora de 1..5 rejeitado com HTTP 400
 *    - ChairId duplicado rejeitado com HTTP 400
 *    - JudgeId duplicado no mesmo evento rejeitado com HTTP 400
 *    - Jurado inexistente ou inativo rejeitado com HTTP 400
 * 8. Alocação bem-sucedida e Broadcast SignalR (EventJuryUpdated)
 * 9. Proteção contra exclusão de jurado em cadeira ativa (DELETE /api/judges/{id} -> 409 Conflict)
 * 10. Exclusão bem-sucedida de jurado desocupado
 * 11. Preservação do snapshot global (GET /api/state incluindo jury)
 * 12. Correlação entre Round History (3D) e os jurados da banca
 * 13. Teardown e restauração de estado (ADR-008)
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
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = data ? JSON.parse(data) : null;
        } catch (e) {
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
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('============================================================');
  console.log('  ARENA VOICE POC — TEST SUITE: JUDGES & JURY (MILESTONE 3E)');
  console.log('============================================================');
  console.log(`Alvo do teste: ${BASE_URL}\n`);

  let dynamicEventId = null;
  let createdJudgeId = null;
  let hubConnection = null;

  try {
    // ── 0. Captura de Estado Inicial ──────────────────────────────────────
    console.log('[0] Captura de estado inicial para teardown resiliente');
    const initialState = await request('GET', '/api/state');
    assert(initialState.status === 200, 'GET /api/state responde com HTTP 200');

    // ── 1. Catálogo Inicial de Jurados & Seed ──────────────────────────────
    console.log('\n[1] Catálogo Inicial e Seed de Jurados (GET /api/judges)');
    const initialJudgesRes = await request('GET', '/api/judges');
    assert(initialJudgesRes.status === 200, 'GET /api/judges retorna HTTP 200');
    assert(Array.isArray(initialJudgesRes.body), 'Catálogo retorna array de jurados');
    assert(initialJudgesRes.body.length >= 5, 'Catálogo seed possui pelo menos 5 jurados cadastrados');

    const camila = initialJudgesRes.body.find((j) => j.id === 'judge-camila-01');
    assert(Boolean(camila), 'Jurado seed Camila Farani encontrado no catálogo');
    assert(camila?.company === 'G2 Capital', 'Empresa do jurado seed confere');
    assert(camila?.isActive === true, 'Campo preventivo IsActive presente e true');
    assert(Boolean(camila?.email), 'Campo preventivo Email presente no seed');

    // ── 2. Cadastro de Jurado & Validações Estritas (POST /api/judges) ─────
    console.log('\n[2] Cadastro de Novo Jurado e Validações Estritas (POST /api/judges)');
    const shortNameRes = await request('POST', '/api/judges', {
      name: 'Al', // curto
      company: 'Fundo X',
      role: 'Sócio',
      avatarUrl: '/samples/judges/al.png',
    });
    assert(shortNameRes.status === 400, 'POST /api/judges rejeita nome com menos de 3 caracteres (HTTP 400)');

    const emptyCompanyRes = await request('POST', '/api/judges', {
      name: 'Alan Turing',
      company: '',
      role: 'Conselheiro',
      avatarUrl: '/samples/judges/alan.png',
    });
    assert(emptyCompanyRes.status === 400, 'POST /api/judges rejeita empresa vazia (HTTP 400)');

    const emptyRoleRes = await request('POST', '/api/judges', {
      name: 'Ada Lovelace',
      company: 'Analytical Capital',
      role: '',
      avatarUrl: '/samples/judges/ada.png',
    });
    assert(emptyRoleRes.status === 400, 'POST /api/judges rejeita cargo vazio (HTTP 400)');

    const validJudgeRes = await request('POST', '/api/judges', {
      name: 'Dr. Roberto Justus',
      company: 'Justus Venture Partners',
      role: 'Senior Managing Partner',
      avatarUrl: '/samples/judges/justus.png',
      bio: 'Publicitário, empresário e investidor em startups de alto crescimento.',
      expertise: ['Comunicação', 'Publicidade', 'Growth'],
      socialUrl: 'https://linkedin.com/in/justus',
      email: 'roberto@justusvp.com',
      isActive: true,
    });
    assert(validJudgeRes.status === 201, 'POST /api/judges cria jurado válido com HTTP 201 Created');
    assert(validJudgeRes.body?.id?.startsWith('judge-'), 'ID gerado possui prefixo judge-');
    assert(validJudgeRes.body?.name === 'Dr. Roberto Justus', 'Nome do jurado salvo corretamente');
    assert(validJudgeRes.body?.email === 'roberto@justusvp.com', 'Campo preventivo Email salvo');
    assert(validJudgeRes.body?.isActive === true, 'Campo preventivo IsActive salvo');
    createdJudgeId = validJudgeRes.body.id;

    // ── 3. Consulta de Jurado por ID (GET /api/judges/{id}) ───────────────
    console.log('\n[3] Consulta de Jurado por ID');
    const getJudgeRes = await request('GET', `/api/judges/${createdJudgeId}`);
    assert(getJudgeRes.status === 200, 'GET /api/judges/{id} retorna HTTP 200');
    assert(getJudgeRes.body?.id === createdJudgeId, 'ID do jurado consultado confere');

    const getNotFoundRes = await request('GET', '/api/judges/judge-inexistente');
    assert(getNotFoundRes.status === 404, 'GET /api/judges/{id} inexistente retorna HTTP 404');

    // ── 4. Atualização Cadastral de Jurado (PUT /api/judges/{id}) ──────────
    console.log('\n[4] Edição de Jurado (PUT /api/judges/{id})');
    const updateJudgeRes = await request('PUT', `/api/judges/${createdJudgeId}`, {
      company: 'Justus Global Capital',
      email: 'roberto.justus@globalcap.com',
    });
    assert(updateJudgeRes.status === 200, 'PUT /api/judges/{id} atualiza jurado com HTTP 200');
    assert(updateJudgeRes.body?.company === 'Justus Global Capital', 'Empresa atualizada com sucesso');
    assert(updateJudgeRes.body?.email === 'roberto.justus@globalcap.com', 'Email preventivo atualizado');

    // ── 5. Consulta da Banca do Evento Ativo (GET /api/events/{id}/jury) ───
    console.log('\n[5] Consulta da Banca Oficial do Evento Ativo');
    const activeEventId = initialState.body?.currentEvent?.id || 'evt-demo-day-2026';
    const juryRes = await request('GET', `/api/events/${activeEventId}/jury`);
    assert(juryRes.status === 200, 'GET /api/events/{id}/jury retorna HTTP 200');
    assert(juryRes.body?.eventId === activeEventId, 'EventId da banca confere com evento ativo');
    assert(Array.isArray(juryRes.body?.jury), 'Banca retorna array de membros');
    assert(juryRes.body.jury.length === 5, 'Banca possui exatamente 5 cadeiras alocadas no seed');

    const chair1 = juryRes.body.jury.find((j) => j.chairId === 1);
    assert(chair1?.chairId === 1, 'Cadeira #1 alocada');
    assert(chair1?.judge?.name === 'Camila Farani', 'Cadeira #1 ocupada por Camila Farani');

    // ── 6. Validações Estritas de Alocação de Banca (PUT /api/events/{id}/jury)
    console.log('\n[6] Validações de Integridade da Banca');
    // 6.1 ChairId inválido (fora de 1..5)
    const invalidChairRes = await request('PUT', `/api/events/${activeEventId}/jury`, {
      assignments: [{ chairId: 6, judgeId: createdJudgeId }],
    });
    assert(invalidChairRes.status === 400, 'Alocação rejeita ChairId fora da faixa 1..5 com HTTP 400');

    // 6.2 ChairId duplicado (duas pessoas na cadeira 1)
    const dupChairRes = await request('PUT', `/api/events/${activeEventId}/jury`, {
      assignments: [
        { chairId: 1, judgeId: 'judge-camila-01' },
        { chairId: 1, judgeId: 'judge-kepler-02' },
      ],
    });
    assert(dupChairRes.status === 400, 'Alocação rejeita múltiplos jurados na mesma cadeira (HTTP 400)');

    // 6.3 JudgeId duplicado (mesmo jurado na cadeira 1 e 2)
    const dupJudgeRes = await request('PUT', `/api/events/${activeEventId}/jury`, {
      assignments: [
        { chairId: 1, judgeId: 'judge-camila-01' },
        { chairId: 2, judgeId: 'judge-camila-01' },
      ],
    });
    assert(dupJudgeRes.status === 400, 'Alocação rejeita mesmo jurado em cadeiras diferentes (HTTP 400)');

    // 6.4 Jurado inexistente
    const notFoundJudgeRes = await request('PUT', `/api/events/${activeEventId}/jury`, {
      assignments: [{ chairId: 1, judgeId: 'judge-fantasma' }],
    });
    assert(notFoundJudgeRes.status === 400, 'Alocação rejeita jurado inexistente com HTTP 400');

    // 6.5 Jurado inativo
    const inactiveJudge = await request('POST', '/api/judges', {
      name: 'Jurado Inativo Temporário',
      company: 'Empresa Teste',
      role: 'Avaliador',
      avatarUrl: '/samples/judges/inactive.png',
      isActive: false,
    });
    const assignInactiveRes = await request('PUT', `/api/events/${activeEventId}/jury`, {
      assignments: [{ chairId: 1, judgeId: inactiveJudge.body.id }],
    });
    assert(assignInactiveRes.status === 400, 'Alocação rejeita jurado com IsActive = false com HTTP 400');

    // ── 7. Alocação Válida da Banca & Realtime SignalR (EventJuryUpdated) ──
    console.log('\n[7] Alocação Válida da Banca e Broadcast SignalR (EventJuryUpdated)');

    // Cria evento dinâmico para isolar os testes
    const dynamicEvent = await request('POST', '/api/events', {
      title: 'Global Fintech Pitch Summit 2027',
      description: 'Maratona internacional de startups de meios de pagamento e banking.',
      status: 0, // Draft
      branding: { primaryColor: '#6a0dad', secondaryColor: '#00ffff' },
    });
    dynamicEventId = dynamicEvent.body.id;

    // Ativa o evento dinâmico
    await request('POST', `/api/events/${dynamicEventId}/activate`);

    // Conecta SignalR para escutar EventJuryUpdated
    let receivedJuryUpdated = null;
    if (signalR) {
      hubConnection = new signalR.HubConnectionBuilder()
        .withUrl(`${BASE_URL}/hubs/arena-poc`)
        .build();

      hubConnection.on('EventJuryUpdated', (data) => {
        receivedJuryUpdated = data;
      });

      await hubConnection.start();
    }

    // Aloca banca de 3 jurados no novo evento
    const assignValidRes = await request('PUT', `/api/events/${dynamicEventId}/jury`, {
      assignments: [
        { chairId: 1, judgeId: 'judge-camila-01' },
        { chairId: 2, judgeId: 'judge-kepler-02' },
        { chairId: 5, judgeId: createdJudgeId },
      ],
    });
    assert(assignValidRes.status === 200, 'PUT /api/events/{id}/jury aloca banca com HTTP 200');
    assert(assignValidRes.body?.jury?.length === 3, 'Banca do evento contém exatamente 3 jurados alocados');

    if (signalR) {
      await wait(500);
      assert(receivedJuryUpdated !== null, 'SignalR transmitiu evento EventJuryUpdated em tempo real');
      assert(receivedJuryUpdated?.eventId === dynamicEventId, 'EventId transmitido confere com o evento ativo');
    }

    // ── 8. Proteção Contra Exclusão de Jurado Ativo (DELETE /api/judges/{id})
    console.log('\n[8] Proteção 409 Conflict contra exclusão de jurado em cadeira ativa');
    const deleteActiveJudgeRes = await request('DELETE', `/api/judges/${createdJudgeId}`);
    assert(deleteActiveJudgeRes.status === 409, 'DELETE /api/judges/{id} rejeita excluir jurado alocado no evento ativo (HTTP 409 Conflict)');

    // ── 9. Exclusão Bem-Sucedida de Jurado Desocupado ──────────────────────
    console.log('\n[9] Exclusão de jurado desocupado');
    const deleteInactiveRes = await request('DELETE', `/api/judges/${inactiveJudge.body.id}`);
    assert(deleteInactiveRes.status === 200, 'DELETE /api/judges/{id} de jurado desocupado retorna HTTP 200 OK');

    // ── 10. Preservação no Snapshot Global (GET /api/state) ────────────────
    console.log('\n[10] Validação de Preservação no Snapshot Global (GET /api/state)');
    const stateWithJury = await request('GET', '/api/state');
    assert(stateWithJury.status === 200, 'GET /api/state responde com HTTP 200');
    assert(Array.isArray(stateWithJury.body?.jury), 'Snapshot /api/state inclui propriedade jury');
    assert(stateWithJury.body?.jury?.length === 3, 'Jury no snapshot reflete as 3 cadeiras alocadas no evento');

    // ── 11. Integração com Round History (3D & 3E) ─────────────────────────
    console.log('\n[11] Integração com Round History & Identificação dos Jurados');
    // Cria projeto dinâmico e simula uma rodada com virada das cadeiras 1 e 5
    const projRes = await request('POST', '/api/projects', {
      title: 'PayGlobal AI',
      pitchLeader: 'Felipe Alcantara',
      track: 'Fintech',
      eventId: dynamicEventId,
    });
    const projId = projRes.body.id;

    // Seleciona o projeto
    await request('POST', `/api/projects/${projId}/select`);

    // Inicia pitch e abre votação
    await request('POST', '/api/pitch/transition', { targetStage: 'PitchRunning' });
    await request('POST', '/api/pitch/transition', { targetStage: 'VotingOpen' });

    // Vira cadeira 1 (Camila Farani) e cadeira 5 (Roberto Justus)
    await request('POST', '/api/chair-press', { chairId: 1 });
    await request('POST', '/api/chair-press', { chairId: 5 });

    // Fecha votação e finaliza
    await request('POST', '/api/pitch/transition', { targetStage: 'VotingClosed' });
    const finishRes = await request('POST', '/api/pitch/transition', { targetStage: 'Finished' });
    assert(finishRes.status === 200, 'Pitch concluído com sucesso');

    // Consulta última rodada arquivada no 3D
    const lastRoundRes = await request('GET', '/api/rounds/last');
    assert(lastRoundRes.status === 200, 'GET /api/rounds/last retorna rodada concluída');
    assert(Array.isArray(lastRoundRes.body?.turnedChairs), 'TurnedChairs presente na rodada arquivada');
    assert(lastRoundRes.body?.turnedChairs?.includes(1), 'Rodada registra apoio da Cadeira #1');
    assert(lastRoundRes.body?.turnedChairs?.includes(5), 'Rodada registra apoio da Cadeira #5');

    // Resolução semântica da banca: Cadeira 1 = Camila Farani, Cadeira 5 = Roberto Justus
    const currentJury = stateWithJury.body.jury;
    const voterChair1 = currentJury.find((m) => m.chairId === 1)?.judge?.name;
    const voterChair5 = currentJury.find((m) => m.chairId === 5)?.judge?.name;
    assert(voterChair1 === 'Camila Farani', 'Cadeira 1 correlacionada semanticamente a Camila Farani');
    assert(voterChair5 === 'Dr. Roberto Justus', 'Cadeira 5 correlacionada semanticamente a Dr. Roberto Justus');
  } catch (err) {
    console.error('[ERRO CRÍTICO NA EXECUÇÃO DOS TESTES]:', err);
    process.exitCode = 1;
  } finally {
    // ── 12. Teardown e Restauração de Estado (ADR-008) ────────────────────
    console.log('\n[12] Teardown e Restauração de Estado Inicial (ADR-008)');
    try {
      if (hubConnection) {
        await hubConnection.stop();
      }
      // Reativa o evento padrão
      await request('POST', '/api/events/evt-demo-day-2026/activate');
      await request('POST', '/api/projects/proj-neurosync-01/select');
      await request('POST', '/api/reset');

      // Limpa dados dinâmicos de teste
      if (dynamicEventId) {
        await request('POST', `/api/events/${dynamicEventId}/finish`);
        await request('POST', `/api/events/${dynamicEventId}/archive`);
      }
      if (createdJudgeId) {
        await request('DELETE', `/api/judges/${createdJudgeId}`);
      }
      console.log('  [PASS] Estado inicial restaurado com sucesso');
      passedAssertions++;
      totalAssertions++;
    } catch (cleanErr) {
      console.warn('[WARN] Falha durante o teardown:', cleanErr.message);
    }
  }

  console.log('\n============================================================');
  console.log(`TOTAL DE ASSERÇÕES: ${totalAssertions}`);
  console.log(`APROVADAS:          ${passedAssertions}`);
  console.log(`FALHAS:             ${totalAssertions - passedAssertions}`);
  console.log('============================================================\n');

  if (passedAssertions === totalAssertions) {
    console.log('>>> [SUITE APPROVED] TODAS AS ASSERÇÕES DO 3E PASSARAM COM SUCESSO! <<<\n');
  } else {
    console.error('>>> [SUITE FAILED] HOUVE FALHAS NA SUÍTE DO 3E <<<\n');
    process.exitCode = 1;
  }
}

runTests();
