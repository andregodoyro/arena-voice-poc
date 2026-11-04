/**
 * test-events-api.cjs — Suíte de Testes Automatizados para o Milestone 3A
 * 
 * Validação rigorosa do Ciclo de Vida e Catálogo de Eventos (Event Lifecycle & Management):
 * 1. GET /api/events (catálogo completo e filtros por status)
 * 2. GET /api/events/{id} (detalhes e 404)
 * 3. POST /api/events (criação e validações de cores/título)
 * 4. PUT /api/events/{id} (edição de metadados/branding)
 * 5. POST /api/events/{id}/duplicate (clonagem para Draft)
 * 6. POST /api/events/{id}/activate (ativação atômica: anterior vira Ready, novo vira Active)
 * 7. POST /api/events/{id}/finish (ação explícita de encerramento)
 * 8. POST /api/events/{id}/archive (rejeição 409 Conflict se ativo, 200 se inativo)
 * 9. Isolamento e restauração de estado (ADR-008)
 */

const http = require('http');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5000';
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
        } catch (e) {
          parsed = data;
        }
        resolve({ status: res.statusCode, body: parsed, headers: res.headers });
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function run() {
  console.log('\n============================================================');
  console.log('   ARENA VOICE — SUÍTE DE TESTES: EVENT LIFECYCLE (3A)      ');
  console.log('============================================================\n');

  try {
    // ── 1. Healthcheck e Estado Inicial ──────────────────────────────────
    console.log('[1/8] Verificando conectividade e catálogo inicial...');
    const health = await request('GET', '/api/status');
    assert(health.status === 200, 'GET /api/status retorna 200 OK');

    const allEventsRes = await request('GET', '/api/events');
    assert(allEventsRes.status === 200, 'GET /api/events retorna 200 OK');
    assert(Array.isArray(allEventsRes.body), 'Catálogo retorna array de eventos');
    assert(allEventsRes.body.length >= 4, 'Catálogo contém os 4 eventos seed de governança');

    // ── 2. Filtros por Status (?status=...) ──────────────────────────────
    console.log('\n[2/8] Validando filtros por status no catálogo...');
    const activeFilter = await request('GET', '/api/events?status=active');
    assert(activeFilter.status === 200, 'GET /api/events?status=active retorna 200');
    assert(activeFilter.body.every(e => e.status === 2 || e.status === 'Active'), 'Filtro active retorna apenas eventos ativos');
    assert(activeFilter.body.length === 1, 'Existe exatamente 1 evento ativo na arena');

    const readyFilter = await request('GET', '/api/events?status=ready');
    assert(readyFilter.body.every(e => e.status === 1 || e.status === 'Ready'), 'Filtro ready retorna apenas eventos prontos');

    const draftFilter = await request('GET', '/api/events?status=draft');
    assert(draftFilter.body.every(e => e.status === 0 || e.status === 'Draft'), 'Filtro draft retorna apenas rascunhos');

    const archivedFilter = await request('GET', '/api/events?status=archived');
    assert(archivedFilter.body.every(e => e.status === 4 || e.status === 'Archived'), 'Filtro archived retorna apenas arquivados');

    // ── 3. Obter Detalhes por ID e 404 ───────────────────────────────────
    console.log('\n[3/8] Testando GET /api/events/{id} e rotas de erro...');
    const defaultEvtId = allEventsRes.body[0].id;
    const getById = await request('GET', `/api/events/${defaultEvtId}`);
    assert(getById.status === 200, `GET /api/events/${defaultEvtId} retorna 200`);
    assert(getById.body?.id === defaultEvtId, 'ID do evento retornado confere');

    const notFound = await request('GET', '/api/events/id-inexistente-xyz');
    assert(notFound.status === 404, 'GET /api/events/inexistente retorna HTTP 404');

    // ── 4. Criação de Evento (POST /api/events) e Validações ─────────────
    console.log('\n[4/8] Testando criação de evento e validações estritas...');
    const shortTitle = await request('POST', '/api/events', { title: 'AB' });
    assert(shortTitle.status === 400, 'POST /api/events rejeita título com menos de 3 caracteres (HTTP 400)');

    const invalidColor = await request('POST', '/api/events', {
      title: 'AI Summit 2027',
      branding: { primaryColor: 'cor-invalida' }
    });
    assert(invalidColor.status === 400, 'POST /api/events rejeita primaryColor não-hexadecimal (HTTP 400)');

    const validNewEvent = await request('POST', '/api/events', {
      title: 'GreenTech Challenge 2027',
      description: 'Maratona de startups de descarbonização e impacto ambiental.',
      status: 0, // Draft
      branding: {
        primaryColor: '#2a9d8f',
        secondaryColor: '#e76f51',
        tagline: 'Semeando o futuro sustentável'
      }
    });
    assert(validNewEvent.status === 201, 'POST /api/events cria evento válido com HTTP 201 Created');
    assert(validNewEvent.body?.id?.startsWith('evt-'), 'Novo evento recebe ID gerado com prefixo evt-');
    assert(validNewEvent.body?.status === 0, 'Novo evento inicia em status Draft (0)');
    const createdEventId = validNewEvent.body.id;

    // ── 5. Atualização de Evento (PUT /api/events/{id}) ───────────────────
    console.log('\n[5/8] Testando PUT /api/events/{id} e bloqueio de Active direto...');
    const tryActivePut = await request('PUT', `/api/events/${createdEventId}`, {
      status: 2 // Tentando forçar Active via PUT
    });
    assert(tryActivePut.status === 400, 'PUT comum rejeita promoção direta para Active com HTTP 400');

    const updateRes = await request('PUT', `/api/events/${createdEventId}`, {
      title: 'GreenTech Global Challenge 2027',
      status: 1 // Pronto (Ready)
    });
    assert(updateRes.status === 200, 'PUT /api/events/{id} atualiza metadados com sucesso (HTTP 200)');
    assert(updateRes.body?.title === 'GreenTech Global Challenge 2027', 'Título atualizado com sucesso');
    assert(updateRes.body?.status === 1, 'Status migrado para Ready (1)');

    // ── 6. Duplicação de Evento (POST /api/events/{id}/duplicate) ─────────
    console.log('\n[6/8] Testando duplicação de evento...');
    const duplicateRes = await request('POST', `/api/events/${createdEventId}/duplicate`);
    assert(duplicateRes.status === 201, 'POST /api/events/{id}/duplicate retorna HTTP 201 Created');
    assert(duplicateRes.body?.title.includes('(Cópia)'), 'Evento duplicado recebe sufixo (Cópia)');
    assert(duplicateRes.body?.status === 0, 'Evento duplicado inicia como Draft (0)');
    assert(duplicateRes.body?.branding?.primaryColor === '#2a9d8f', 'Branding cênico é preservado na cópia');
    const duplicatedId = duplicateRes.body.id;

    // ── 7. Ativação Não-Destrutiva (POST /api/events/{id}/activate) ───────
    console.log('\n[7/8] Testando ativação atômica e regra não-destrutiva (Ajuste 1)...');
    // Descobre o evento atualmente ativo
    const stateBefore = await request('GET', '/api/state');
    const prevActiveId = stateBefore.body?.currentEvent?.id;

    // Ativa o evento criado
    const activateRes = await request('POST', `/api/events/${createdEventId}/activate`);
    assert(activateRes.status === 200, 'POST /api/events/{id}/activate retorna HTTP 200');
    assert(activateRes.body?.success === true, 'Payload de ativação indica sucesso');
    assert(activateRes.body?.activatedEvent?.status === 2, 'Novo evento torna-se Active (2)');
    assert(activateRes.body?.previousEvent?.status === 1, 'REGRA AJUSTE 1: Evento anteriormente ativo retornou para Ready (1), NÃO Finished!');

    // Valida no snapshot global
    const stateAfter = await request('GET', '/api/state');
    assert(stateAfter.body?.currentEvent?.id === createdEventId, 'GET /api/state reflete o novo evento ativo');
    assert(stateAfter.body?.currentProject === null, 'Projeto ativo no palco foi limpo para a nova fila de pitches');
    assert(stateAfter.body?.activeCount === 0, 'As cadeiras físicas foram neutralizadas para a nova sessão');

    // ── 8. Encerramento (Finish) e Arquivamento com Proteção 409 ──────────
    console.log('\n[8/8] Testando POST finish e archive com proteção 409...');
    // Tentativa de arquivar o evento ativo
    const archiveActive = await request('POST', `/api/events/${createdEventId}/archive`);
    assert(archiveActive.status === 409, 'POST /api/events/{id}/archive rejeita arquivar evento ativo com HTTP 409 Conflict');

    // Encerrar evento ativo
    const finishRes = await request('POST', `/api/events/${createdEventId}/finish`);
    assert(finishRes.status === 200, 'POST /api/events/{id}/finish encerra evento formalmente com HTTP 200');
    assert(finishRes.body?.finishedEvent?.status === 3, 'Status alterado para Finished (3)');

    // Arquivar evento inativo (o duplicado que criamos)
    const archiveInactive = await request('POST', `/api/events/${duplicatedId}/archive`);
    assert(archiveInactive.status === 200, 'POST /api/events/{id}/archive arquiva evento inativo com HTTP 200');
    assert(archiveInactive.body?.archivedEvent?.status === 4, 'Status alterado para Archived (4)');

    // ── Restauração do Estado Inicial (ADR-008) ──────────────────────────
    console.log('\n[Restauração] Reativando evento padrão e higienizando dados de teste...');
    if (prevActiveId) {
      await request('POST', `/api/events/${prevActiveId}/activate`);
      // Restaura o projeto 1 ativo
      await request('POST', '/api/projects/proj-neurosync-01/select');
    }

    console.log('\n============================================================');
    console.log(` RESULTADO: ${passedAssertions} de ${totalAssertions} asserções APROVADAS`);
    console.log('============================================================\n');

    if (passedAssertions === totalAssertions) {
      console.log('🟢 TODOS OS TESTES DO MILESTONE 3A PASSARAM COM SUCESSO!\n');
    } else {
      process.exit(1);
    }
  } catch (err) {
    console.error('ERRO FATAL NA EXECUÇÃO DA SUÍTE:', err);
    process.exit(1);
  }
}

run();
