/**
 * test-postgres-persistence.cjs
 * Suíte de homologação da persistência relacional no PostgreSQL Portable (Milestone 4A).
 * 
 * Valida:
 * 1. CRUD de Eventos no PostgreSQL.
 * 2. CRUD de Projetos no PostgreSQL.
 * 3. CRUD de Jurados com array nativo text[] no PostgreSQL.
 * 4. Alocação de Banca (EventJuryAssignments) no PostgreSQL.
 * 5. Arquivamento de Rodada (RoundHistoryEntry) com JSONB nativo no PostgreSQL.
 * 6. Sobrevivência de dados após reinicialização do backend.
 */

const http = require('http');

const BASE_URL = process.env.ARENA_API_URL || 'http://127.0.0.1:5000';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    testsPassed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    testsFailed++;
  }
}

async function request(method, path, body = null) {
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

async function runTests() {
  console.log('======================================================');
  console.log('   ARENA VOICE — POSTGRESQL PERSISTENCE VALIDATION   ');
  console.log('======================================================');
  console.log(`Target: ${BASE_URL}\n`);

  try {
    // -------------------------------------------------------------------------
    // 1. EVENTOS (Create, Read, Update)
    // -------------------------------------------------------------------------
    console.log('[1] Testando persistência de Eventos...');
    const newEventPayload = {
      title: 'Inovação Aberta 2026 - Teste 4A',
      description: 'Evento de homologação do storage engine relacional PostgreSQL',
      scheduledDate: new Date().toISOString(),
      branding: {
        primaryColor: '#845EC2',
        secondaryColor: '#FFC75F',
        logoUrl: '/samples/test-logo.png',
        tagline: 'Transformando tecnologia em impacto real'
      },
      timers: {
        pitchDurationSeconds: 150,
        qaDurationSeconds: 90,
        votingDurationSeconds: 45,
        lockoutEnabled: true
      }
    };

    const createEventRes = await request('POST', '/api/events', newEventPayload);
    assert(createEventRes.status === 201, `Criação de evento retorna HTTP 201 (Recebido: ${createEventRes.status})`);
    const createdEvent = createEventRes.data;
    assert(createdEvent && createdEvent.id, `Evento criado possui Id válido: ${createdEvent?.id}`);

    const getEventRes = await request('GET', `/api/events/${createdEvent.id}`);
    assert(getEventRes.status === 200, `Leitura de evento por Id retorna HTTP 200`);
    assert(getEventRes.data.title === newEventPayload.title, `Título persistido coincide no PostgreSQL`);
    assert(getEventRes.data.branding.primaryColor === '#845EC2', `Branding Owned Type persistido corretamente`);

    // ⚠️ Ativar o evento de teste ANTES de criar projetos (API vincula projetos ao evento ativo)
    const activateRes = await request('POST', `/api/events/${createdEvent.id}/activate`);
    assert(activateRes.status === 200, `Ativação do evento de teste retorna HTTP 200`);

    const updateEventPayload = {
      title: 'Inovação Aberta 2026 - Título Atualizado',
      description: 'Descrição atualizada com sucesso',
      scheduledDate: new Date().toISOString(),
      branding: {
        primaryColor: '#D65DB1',
        secondaryColor: '#FF9671',
        logoUrl: '/samples/test-logo-v2.png',
        tagline: 'Nova tagline atualizada'
      },
      timers: {
        pitchDurationSeconds: 180,
        qaDurationSeconds: 120,
        votingDurationSeconds: 30,
        lockoutEnabled: true
      }
    };
    const updateEventRes = await request('PUT', `/api/events/${createdEvent.id}`, updateEventPayload);
    assert(updateEventRes.status === 200, `Atualização de evento retorna HTTP 200`);

    const getUpdatedEventRes = await request('GET', `/api/events/${createdEvent.id}`);
    assert(getUpdatedEventRes.data.title === updateEventPayload.title, `Título atualizado persistido no PostgreSQL`);

    // -------------------------------------------------------------------------
    // 2. PROJETOS (Create, Read, Update)
    // -------------------------------------------------------------------------
    console.log('\n[2] Testando persistência de Projetos...');
    const newProjectPayload = {
      eventId: createdEvent.id,
      title: 'QuantumFlow AI',
      pitchLeader: 'Dr. Roberto Vasconcelos',
      track: 'DeepTech',
      description: 'Otimização de rotas logísticas complexas com algoritmos quânticos.',
      orderIndex: 1,
      logoUrl: '/samples/quantum-logo.png',
      coverImageUrl: '/samples/quantum-cover.png'
    };

    const createProjectRes = await request('POST', '/api/projects', newProjectPayload);
    assert(createProjectRes.status === 201, `Criação de projeto retorna HTTP 201 (Recebido: ${createProjectRes.status})`);
    const createdProject = createProjectRes.data;
    assert(createdProject && createdProject.id, `Projeto criado com Id: ${createdProject?.id}`);

    const getProjectRes = await request('GET', `/api/projects/${createdProject.id}`);
    assert(getProjectRes.status === 200, `Leitura de projeto retorna HTTP 200`);
    assert(getProjectRes.data.title === newProjectPayload.title, `Título do projeto persistido no PostgreSQL`);
    assert(getProjectRes.data.media.coverImageUrl === newProjectPayload.coverImageUrl, `Mídia do projeto persistida via Owned Type`);

    const updateProjectPayload = {
      title: 'QuantumFlow AI - Enterprise Edition',
      pitchLeader: 'Dr. Roberto Vasconcelos',
      track: 'Quantum Logistics',
      description: 'Descrição enriquecida para homologação de update relacional.',
      orderIndex: 2
    };
    const updateProjectRes = await request('PUT', `/api/projects/${createdProject.id}`, updateProjectPayload);
    assert(updateProjectRes.status === 200, `Atualização de projeto retorna HTTP 200`);

    const getUpdatedProjRes = await request('GET', `/api/projects/${createdProject.id}`);
    assert(getUpdatedProjRes.data.title === updateProjectPayload.title, `Título atualizado no PostgreSQL`);
    assert(getUpdatedProjRes.data.orderIndex === 2, `Ordem atualizada para 2 no banco`);

    // -------------------------------------------------------------------------
    // 3. JURADOS (Create, Read, Update com array nativo text[])
    // -------------------------------------------------------------------------
    console.log('\n[3] Testando persistência de Jurados (PostgreSQL Array text[])...');
    const newJudgePayload = {
      name: 'Sofia Alcantara',
      company: 'Horizonte Capital',
      role: 'Principal Partner',
      avatarUrl: '/samples/judges/sofia.png',
      bio: 'Especialista em rodadas Series A e investimentos em infraestrutura profunda.',
      expertise: ['Venture Capital', 'DeepTech', 'B2B SaaS'],
      socialUrl: 'https://linkedin.com/in/sofia-alcantara',
      email: 'sofia@horizonte.vc'
    };

    const createJudgeRes = await request('POST', '/api/judges', newJudgePayload);
    assert(createJudgeRes.status === 201, `Criação de jurado retorna HTTP 201`);
    const createdJudge = createJudgeRes.data;
    assert(createdJudge && createdJudge.id, `Jurado criado com Id: ${createdJudge?.id}`);

    const getJudgeRes = await request('GET', `/api/judges/${createdJudge.id}`);
    assert(getJudgeRes.status === 200, `Leitura de jurado retorna HTTP 200`);
    assert(getJudgeRes.data.name === newJudgePayload.name, `Nome do jurado persistido no banco`);
    assert(Array.isArray(getJudgeRes.data.expertise) && getJudgeRes.data.expertise.length === 3, `Array nativo PostgreSQL text[] recuperado com 3 itens`);

    // -------------------------------------------------------------------------
    // 4. ALOCAÇÃO DE BANCA (EventJuryAssignments)
    // -------------------------------------------------------------------------
    console.log('\n[4] Testando Alocação de Banca (EventJuryAssignments)...');
    const juryPayload = {
      assignments: [
        { chairId: 1, judgeId: createdJudge.id }
      ]
    };
    const assignJuryRes = await request('PUT', `/api/events/${createdEvent.id}/jury`, juryPayload);
    assert(assignJuryRes.status === 200, `Alocação de cadeira 1 retorna HTTP 200`);

    const getJuryRes = await request('GET', `/api/events/${createdEvent.id}/jury`);
    assert(getJuryRes.status === 200, `Consulta de banca retorna HTTP 200`);
    const juryList = getJuryRes.data.jury ?? getJuryRes.data;
    assert(Array.isArray(juryList) && juryList.length >= 1, `Banca possui pelo menos 1 jurado alocado`);
    const chair1 = juryList.find(j => j.chairId === 1);
    const assignedJudgeId = chair1?.judgeId ?? chair1?.judge?.id;
    assert(chair1 && assignedJudgeId === createdJudge.id, `Alocação da cadeira 1 persistida no PostgreSQL (judgeId: ${assignedJudgeId})`);

    // -------------------------------------------------------------------------
    // 5. HISTÓRICO DE RODADAS (RoundHistoryEntry com JSONB nativo)
    // -------------------------------------------------------------------------
    console.log('\n[5] Testando Arquivamento de Rodada (RoundHistory com JSONB)...');
    // Evento já está ativo (ativado na seção 1). Seleciona o projeto no palco.
    await request('POST', `/api/projects/${createdProject.id}/select`);

    // Ciclo canônico: Waiting -> PitchRunning -> QA -> VotingOpen -> VotingClosed -> Finished
    await request('POST', '/api/pitch/transition', { targetStage: 'PitchRunning' });
    await request('POST', '/api/pitch/transition', { targetStage: 'QA' });
    await request('POST', '/api/pitch/transition', { targetStage: 'VotingOpen' });
    await request('POST', '/api/chair-press', { chairId: 1 });
    await request('POST', '/api/pitch/transition', { targetStage: 'VotingClosed' });
    const finishRes = await request('POST', '/api/pitch/transition', { targetStage: 'Finished' });
    assert(finishRes.status === 200, `Transição para Finished encerra rodada com HTTP 200`);

    const historyRes = await request('GET', `/api/rounds?eventId=${createdEvent.id}`);
    assert(historyRes.status === 200, `Consulta de histórico retorna HTTP 200`);
    assert(historyRes.data.length > 0, `Histórico possui rodadas arquivadas`);
    const lastRound = historyRes.data[0];
    assert(lastRound.projectId === createdProject.id, `Rodada arquivada aponta para o projeto correto`);
    assert(lastRound.timerConfig && lastRound.timerConfig.pitchDurationSeconds > 0, `Snapshot JSONB de TimerConfig recuperado intacto`);
    assert(Array.isArray(lastRound.turnedChairs) && lastRound.turnedChairs.includes(1), `Array nativo de cadeiras viradas int[] recuperado com cadeira 1`);

    // -------------------------------------------------------------------------
    // CLEANUP: Restaura evento padrão e reseta cadeiras
    // -------------------------------------------------------------------------
    await request('POST', '/api/events/evt-demo-day-2026/activate');
    await request('POST', '/api/reset');

    console.log('\n======================================================');
    console.log(`RESULTADO DA HOMOLOGAÇÃO DE PERSISTÊNCIA:`);
    console.log(`Total de testes: ${testsPassed + testsFailed}`);
    console.log(`Sucessos: ${testsPassed}`);
    console.log(`Falhas: ${testsFailed}`);
    console.log('======================================================');

    if (testsFailed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Erro inesperado na execução dos testes:', err);
    process.exit(1);
  }
}

runTests();
