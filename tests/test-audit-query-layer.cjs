/**
 * ============================================================
 * ARENA VOICE — MILESTONE 4C.4 — AUDIT QUERY LAYER TESTS
 * ============================================================
 * Valida a camada de consulta do Audit Trail:
 *   - Timeline geral com paginação
 *   - Filtros por eventType, aggregateType, actorType, período
 *   - ADR-022: Ocultação de eventos técnicos por padrão
 *   - includeTechnical=true
 *   - Consulta por ID
 *   - Histórico por projeto
 *   - Histórico por evento (arena event)
 *   - Timeline de sessão
 *   - Validação de limites de paginação
 */

const http = require('http');

const BASE = 'http://localhost:5000';
let pass = 0;
let fail = 0;
const failures = [];

function assert(condition, label) {
    if (condition) {
        pass++;
    } else {
        fail++;
        failures.push(label);
        console.log(`  [FAIL] ${label}`);
    }
}

async function req(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method,
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000
        };

        const r = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                let parsed = null;
                try { parsed = JSON.parse(data); } catch { parsed = data; }
                resolve({ status: res.statusCode, body: parsed });
            });
        });

        r.on('error', reject);
        r.on('timeout', () => { r.destroy(); reject(new Error('timeout')); });

        if (body) r.write(JSON.stringify(body));
        r.end();
    });
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================
// TESTES
// ============================================================

async function runTests() {
    console.log('============================================================');
    console.log('  ARENA VOICE — 4C.4 AUDIT QUERY LAYER TESTS');
    console.log('============================================================\n');

    // ========================================
    // 1. TIMELINE GERAL — GET /api/audit
    // ========================================
    console.log('▶ 1. Timeline geral (GET /api/audit)');

    const timeline = await req('GET', '/api/audit');
    assert(timeline.status === 200, 'GET /api/audit retorna 200');
    assert(timeline.body.items !== undefined, 'Resposta contém items');
    assert(timeline.body.page === 1, 'Página padrão é 1');
    assert(timeline.body.pageSize === 50, 'PageSize padrão é 50');
    assert(timeline.body.totalCount >= 0, 'TotalCount presente');
    assert(timeline.body.totalPages >= 0, 'TotalPages presente');
    assert(Array.isArray(timeline.body.items), 'Items é array');

    // ADR-022: Sem eventos técnicos por padrão
    const hasRecoveryCheckpoint = timeline.body.items.some(i => i.eventType === 'RecoveryCheckpointCreated');
    assert(!hasRecoveryCheckpoint, 'ADR-022: RecoveryCheckpointCreated oculto por padrão na timeline');

    const hasSessionUpdated = timeline.body.items.some(i => i.eventType === 'ActiveSessionUpdated');
    assert(!hasSessionUpdated, 'ADR-022: ActiveSessionUpdated oculto por padrão na timeline');

    // Verificar formato do DTO
    if (timeline.body.items.length > 0) {
        const first = timeline.body.items[0];
        assert(first.id !== undefined, 'DTO contém id');
        assert(first.eventVersion !== undefined, 'DTO contém eventVersion');
        assert(first.eventType !== undefined, 'DTO contém eventType');
        assert(first.aggregateType !== undefined, 'DTO contém aggregateType');
        assert(first.aggregateId !== undefined, 'DTO contém aggregateId');
        assert(first.actorType !== undefined, 'DTO contém actorType');
        assert(first.occurredAt !== undefined, 'DTO contém occurredAt');
        assert(typeof first.actorType === 'string', 'actorType é string (não int)');
    }

    // ========================================
    // 2. includeTechnical=true
    // ========================================
    console.log('▶ 2. includeTechnical=true');

    const techTimeline = await req('GET', '/api/audit?includeTechnical=true&pageSize=250');
    assert(techTimeline.status === 200, 'GET /api/audit?includeTechnical=true retorna 200');
    const techHasCheckpoint = techTimeline.body.items.some(i => i.eventType === 'RecoveryCheckpointCreated');
    assert(techHasCheckpoint, 'includeTechnical=true inclui RecoveryCheckpointCreated');
    assert(techTimeline.body.totalCount > timeline.body.totalCount, 'includeTechnical totalCount > padrão totalCount');

    // ========================================
    // 3. PAGINAÇÃO
    // ========================================
    console.log('▶ 3. Paginação');

    const page1 = await req('GET', '/api/audit?page=1&pageSize=5');
    assert(page1.status === 200, 'Paginação page=1 pageSize=5 retorna 200');
    assert(page1.body.items.length <= 5, 'pageSize=5 retorna no máximo 5 items');
    assert(page1.body.page === 1, 'Página retornada é 1');
    assert(page1.body.pageSize === 5, 'PageSize retornado é 5');

    const page2 = await req('GET', '/api/audit?page=2&pageSize=5');
    assert(page2.status === 200, 'Paginação page=2 retorna 200');
    if (page1.body.items.length > 0 && page2.body.items.length > 0) {
        assert(page1.body.items[0].id !== page2.body.items[0].id, 'Itens da página 2 são diferentes da página 1');
    }

    // Limite máximo de pageSize
    const bigPage = await req('GET', '/api/audit?pageSize=999');
    assert(bigPage.status === 200, 'pageSize=999 retorna 200 (normalizado)');
    assert(bigPage.body.pageSize === 250, 'pageSize normalizado para máximo 250');

    // Página negativa normalizada
    const negPage = await req('GET', '/api/audit?page=-1&pageSize=0');
    assert(negPage.status === 200, 'page=-1 pageSize=0 retorna 200 (normalizado)');
    assert(negPage.body.page === 1, 'page normalizado para 1');
    assert(negPage.body.pageSize === 50, 'pageSize normalizado para 50');

    // ========================================
    // 4. FILTRO POR eventType
    // ========================================
    console.log('▶ 4. Filtro por eventType');

    const pitchStarted = await req('GET', '/api/audit?eventType=PitchStarted');
    assert(pitchStarted.status === 200, 'Filtro eventType=PitchStarted retorna 200');
    const allPitchStarted = pitchStarted.body.items.every(i => i.eventType === 'PitchStarted');
    assert(allPitchStarted, 'Todos os items são PitchStarted');

    const chairPressed = await req('GET', '/api/audit?eventType=ChairPressed');
    assert(chairPressed.status === 200, 'Filtro eventType=ChairPressed retorna 200');
    const allChairPressed = chairPressed.body.items.every(i => i.eventType === 'ChairPressed');
    assert(allChairPressed, 'Todos os items são ChairPressed');

    // ADR-022: Filtro explícito por tipo técnico funciona mesmo sem includeTechnical
    const explicitTech = await req('GET', '/api/audit?eventType=RecoveryCheckpointCreated');
    assert(explicitTech.status === 200, 'Filtro explícito RecoveryCheckpointCreated retorna 200');
    if (explicitTech.body.items.length > 0) {
        assert(
            explicitTech.body.items.every(i => i.eventType === 'RecoveryCheckpointCreated'),
            'ADR-022: Filtro explícito retorna RecoveryCheckpointCreated mesmo sem includeTechnical'
        );
    }

    // ========================================
    // 5. FILTRO POR aggregateType
    // ========================================
    console.log('▶ 5. Filtro por aggregateType');

    const pitchAgg = await req('GET', '/api/audit?aggregateType=Pitch');
    assert(pitchAgg.status === 200, 'Filtro aggregateType=Pitch retorna 200');
    const allPitch = pitchAgg.body.items.every(i => i.aggregateType === 'Pitch');
    assert(allPitch, 'Todos os items são aggregateType=Pitch');

    const projectAgg = await req('GET', '/api/audit?aggregateType=Project');
    assert(projectAgg.status === 200, 'Filtro aggregateType=Project retorna 200');
    const allProject = projectAgg.body.items.every(i => i.aggregateType === 'Project');
    assert(allProject, 'Todos os items são aggregateType=Project');

    // ========================================
    // 6. FILTRO POR PERÍODO
    // ========================================
    console.log('▶ 6. Filtro por período');

    const futureDate = new Date(Date.now() + 86400000).toISOString();
    const pastDate = new Date(Date.now() - 86400000 * 365).toISOString();

    const futureOnly = await req('GET', `/api/audit?from=${futureDate}`);
    assert(futureOnly.status === 200, 'Filtro from=futuro retorna 200');
    assert(futureOnly.body.totalCount === 0, 'Filtro from=futuro retorna 0 resultados');

    const allTime = await req('GET', `/api/audit?from=${pastDate}&to=${futureDate}&includeTechnical=true`);
    assert(allTime.status === 200, 'Filtro período completo retorna 200');
    assert(allTime.body.totalCount > 0, 'Filtro período completo retorna resultados');

    // ========================================
    // 7. CONSULTA POR ID — GET /api/audit/{id}
    // ========================================
    console.log('▶ 7. Consulta por ID (GET /api/audit/{id})');

    if (timeline.body.items.length > 0) {
        const sampleId = timeline.body.items[0].id;
        const byId = await req('GET', `/api/audit/${sampleId}`);
        assert(byId.status === 200, `GET /api/audit/${sampleId} retorna 200`);
        assert(byId.body.id === sampleId, 'ID retornado corresponde');
        assert(byId.body.eventType !== undefined, 'Detalhes contêm eventType');
        assert(byId.body.payload !== undefined, 'Detalhes contêm payload');
    }

    const notFound = await req('GET', '/api/audit/999999999');
    assert(notFound.status === 404, 'GET /api/audit/999999999 retorna 404');

    // ========================================
    // 8. HISTÓRICO POR PROJETO — GET /api/audit/project/{id}
    // ========================================
    console.log('▶ 8. Histórico por projeto (GET /api/audit/project/{projectId})');

    // Usar um projeto que sabemos que existe
    const projectHistory = await req('GET', '/api/audit/project/proj-ecolog-02');
    assert(projectHistory.status === 200, 'GET /api/audit/project/proj-ecolog-02 retorna 200');
    assert(projectHistory.body.items !== undefined, 'Resposta contém items');
    // Pelo menos deve ter algum evento do projeto (4C.3 criou muitos)
    assert(projectHistory.body.totalCount >= 0, 'TotalCount presente no histórico de projeto');

    // Projeto inexistente retorna vazio (não 404)
    const noProject = await req('GET', '/api/audit/project/proj-inexistente-xyz');
    assert(noProject.status === 200, 'Projeto inexistente retorna 200 (vazio)');
    assert(noProject.body.totalCount === 0, 'Projeto inexistente retorna totalCount=0');

    // ========================================
    // 9. HISTÓRICO POR EVENTO — GET /api/audit/event/{id}
    // ========================================
    console.log('▶ 9. Histórico por evento (GET /api/audit/event/{eventId})');

    const eventHistory = await req('GET', '/api/audit/event/evt-demo-day-2026');
    assert(eventHistory.status === 200, 'GET /api/audit/event/evt-demo-day-2026 retorna 200');
    assert(eventHistory.body.items !== undefined, 'Resposta contém items');

    // ========================================
    // 10. TIMELINE DE SESSÃO — GET /api/audit/session
    // ========================================
    console.log('▶ 10. Timeline de sessão (GET /api/audit/session)');

    const sessionTimeline = await req('GET', '/api/audit/session');
    assert(sessionTimeline.status === 200, 'GET /api/audit/session retorna 200');
    assert(sessionTimeline.body.items !== undefined, 'Resposta contém items');
    // Session inclui eventos técnicos por definição
    if (sessionTimeline.body.items.length > 0) {
        const allSession = sessionTimeline.body.items.every(i => i.aggregateType === 'Session');
        assert(allSession, 'Todos os items de /api/audit/session são aggregateType=Session');
    }
    assert(sessionTimeline.body.totalCount > 0, 'Session timeline tem resultados');

    // ========================================
    // 11. ORDENAÇÃO CRONOLÓGICA DESC
    // ========================================
    console.log('▶ 11. Ordenação cronológica DESC');

    if (timeline.body.items.length >= 2) {
        const dates = timeline.body.items.map(i => new Date(i.occurredAt).getTime());
        let isDescending = true;
        for (let i = 1; i < dates.length; i++) {
            if (dates[i] > dates[i - 1]) {
                isDescending = false;
                break;
            }
        }
        assert(isDescending, 'Timeline ordenada em occurred_at DESC');
    }

    // ========================================
    // 12. FILTROS COMBINADOS
    // ========================================
    console.log('▶ 12. Filtros combinados');

    const combined = await req('GET', '/api/audit?aggregateType=Chair&eventType=ChairPressed&pageSize=10');
    assert(combined.status === 200, 'Filtros combinados retornam 200');
    if (combined.body.items.length > 0) {
        const allMatch = combined.body.items.every(i =>
            i.aggregateType === 'Chair' && i.eventType === 'ChairPressed');
        assert(allMatch, 'Filtros combinados Chair+ChairPressed corretos');
    }

    // ========================================
    // 13. VALIDAÇÃO FUNCIONAL COMPLETA
    // ========================================
    console.log('▶ 13. Validação funcional: criar projeto → pitch → cadeira → consultar');

    // Criar projeto de teste
    const createRes = await req('POST', '/api/projects', {
        title: 'Projeto Audit 4C4 Test',
        pitchLeader: 'Audit Tester',
        track: 'QA Track',
        description: 'Teste de validação do 4C.4'
    });
    assert(createRes.status === 201, 'Projeto de teste criado');
    const testProjectId = createRes.body.id;

    // Selecionar projeto
    const selectRes = await req('POST', `/api/projects/${testProjectId}/select`);
    assert(selectRes.status === 200, 'Projeto de teste selecionado');

    // Editar projeto
    const editRes = await req('PUT', `/api/projects/${testProjectId}`, {
        description: 'Descrição atualizada pelo 4C.4'
    });
    assert(editRes.status === 200, 'Projeto editado');

    // Iniciar pitch
    const pitchRes = await req('POST', '/api/pitch/transition', { targetStage: 'PitchRunning' });
    assert(pitchRes.status === 200, 'Pitch iniciado');

    // Girar cadeira
    const chairRes = await req('POST', '/api/chair-press', { chairId: 1, source: 'ESP32' });
    assert(chairRes.status === 200, 'Cadeira virada');

    // Pausar
    const pauseRes = await req('POST', '/api/pitch/timer/pause');
    assert(pauseRes.status === 200, 'Pitch pausado');

    // Retomar
    const resumeRes = await req('POST', '/api/pitch/timer/resume');
    assert(resumeRes.status === 200, 'Pitch retomado');

    // Aguardar flush do AuditEventWriter
    await sleep(500);

    // Consultar histórico do projeto
    const projectAudit = await req('GET', `/api/audit/project/${testProjectId}`);
    assert(projectAudit.status === 200, 'Histórico do projeto de teste retorna 200');
    assert(projectAudit.body.totalCount > 0, 'Histórico do projeto tem eventos');

    const eventTypes = projectAudit.body.items.map(i => i.eventType);
    console.log(`    Eventos encontrados: ${eventTypes.join(', ')}`);

    assert(eventTypes.includes('ProjectCreated') || eventTypes.includes('ProjectActivated'),
        'Histórico contém ProjectCreated ou ProjectActivated');
    assert(eventTypes.includes('PitchStarted'), 'Histórico contém PitchStarted');
    assert(eventTypes.includes('ChairPressed'), 'Histórico contém ChairPressed');
    assert(eventTypes.includes('PitchPaused'), 'Histórico contém PitchPaused');
    assert(eventTypes.includes('PitchResumed'), 'Histórico contém PitchResumed');

    // Verificar ordenação cronológica nos resultados do projeto
    if (projectAudit.body.items.length >= 2) {
        const projDates = projectAudit.body.items.map(i => new Date(i.occurredAt).getTime());
        let projDesc = true;
        for (let i = 1; i < projDates.length; i++) {
            if (projDates[i] > projDates[i - 1]) { projDesc = false; break; }
        }
        assert(projDesc, 'Histórico do projeto em ordem cronológica DESC');
    }

    // Limpar: reset + deletar projeto de teste
    await req('POST', '/api/pitch/reset');
    await req('DELETE', `/api/projects/${testProjectId}`);

    // ========================================
    // CONSOLIDAÇÃO
    // ========================================
    console.log('\n============================================================');
    console.log(`  RESULTADO FINAL: ${pass} pass, ${fail} fail`);
    console.log('============================================================');
    if (failures.length > 0) {
        console.log('\n  Falhas:');
        failures.forEach(f => console.log(`    ✗ ${f}`));
    }
    console.log('');

    process.exit(fail > 0 ? 1 : 0);
}

runTests().catch(err => {
    console.error('Erro fatal:', err);
    process.exit(1);
});
