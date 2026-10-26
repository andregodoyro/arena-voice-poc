const backendUrl = (
    process.env.VITE_BACKEND_URL || 'http://127.0.0.1:5000'
).replace(/\/+$/, '');

let passed = 0;
let failed = 0;

function pass(name) {
    passed++;
    console.log(`  [PASS] ${name}`);
}

function fail(name, details = '') {
    failed++;
    console.error(`  [FAIL] ${name}${details ? ` - ${details}` : ''}`);
}

function assert(condition, name, details = '') {
    if (condition) {
        pass(name);
    } else {
        fail(name, details);
    }
}

async function request(path, options = {}) {
    const response = await fetch(`${backendUrl}${path}`, options);
    let body = null;
    const text = await response.text();

    if (text) {
        try {
            body = JSON.parse(text);
        } catch {
            body = text;
        }
    }

    return {
        status: response.status,
        headers: response.headers,
        body
    };
}

async function run() {
    console.log('\n======================================================');
    console.log('    ARENA VOICE - EVENT & PROJECT API VALIDATION     ');
    console.log('======================================================');
    console.log(`Backend: ${backendUrl}\n`);

    // =========================================================================
    // 1. EVENT MANAGEMENT (/api/events/current)
    // =========================================================================
    console.log('[1] Event Management (GET /api/events/current)');
    const eventRes = await request('/api/events/current');
    assert(eventRes.status === 200, 'GET /api/events/current retorna HTTP 200', `Recebido ${eventRes.status}`);
    assert(eventRes.body?.id === 'evt-demo-day-2026', 'Evento padrão id correto', `Recebido ${eventRes.body?.id}`);
    assert(eventRes.body?.title === 'Demo Day Inovação 2026', 'Evento padrão title correto', `Recebido ${eventRes.body?.title}`);
    assert(eventRes.body?.branding?.primaryColor === '#d90429', 'Evento padrão primaryColor correto', `Recebido ${eventRes.body?.branding?.primaryColor}`);

    console.log('\n[2] Event Update & Validation (PUT /api/events/current)');
    // 2.1 Atualização válida
    const updateEventRes = await request('/api/events/current', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            title: 'Demo Day Inovação 2026 - Edição Especial',
            description: 'Finalíssima da aceleração de startups.',
            branding: {
                primaryColor: '#b7094c',
                secondaryColor: '#ffb703',
                logoUrl: '/branding/event-logo-v2.png',
                tagline: 'Inovação radical em tempo real.'
            }
        })
    });
    assert(updateEventRes.status === 200, 'PUT /api/events/current com dados válidos retorna HTTP 200', `Recebido ${updateEventRes.status}`);
    assert(updateEventRes.body?.title === 'Demo Day Inovação 2026 - Edição Especial', 'Título do evento atualizado com sucesso');
    assert(updateEventRes.body?.branding?.primaryColor === '#b7094c', 'Cor primária atualizada');

    // 2.2 Rejeição de cor hexadecimal inválida
    const invalidColorRes = await request('/api/events/current', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            branding: { primaryColor: 'cor-invalida' }
        })
    });
    assert(invalidColorRes.status === 400, 'PUT /api/events/current rejeita cor inválida com HTTP 400', `Recebido ${invalidColorRes.status}`);

    // 2.3 Rejeição de título muito curto
    const invalidTitleRes = await request('/api/events/current', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'AB' })
    });
    assert(invalidTitleRes.status === 400, 'PUT /api/events/current rejeita título curto com HTTP 400', `Recebido ${invalidTitleRes.status}`);

    // =========================================================================
    // 3. PROJECT LISTING & RETRIEVAL (/api/projects)
    // =========================================================================
    console.log('\n[3] Project Listing & Retrieval (GET /api/projects)');
    const projectsRes = await request('/api/projects');
    assert(projectsRes.status === 200, 'GET /api/projects retorna HTTP 200', `Recebido ${projectsRes.status}`);
    assert(Array.isArray(projectsRes.body), 'GET /api/projects retorna array');
    assert(projectsRes.body.length === 5, 'GET /api/projects inicial retorna os 5 projetos do seed', `Total: ${projectsRes.body.length}`);

    const firstProj = projectsRes.body[0];
    assert(firstProj.id === 'proj-neurosync-01', 'Primeiro projeto é NeuroSync AI', `Recebido ${firstProj.id}`);
    assert(firstProj.title === 'NeuroSync AI', 'Título do projeto presente e padronizado');
    assert(firstProj.status === 1, 'Primeiro projeto inicia com status Current (1)');
    assert(Boolean(firstProj.media), 'Projeto possui propriedade media');

    console.log('\n[4] Project Details (GET /api/projects/{id})');
    const getByIdRes = await request('/api/projects/proj-neurosync-01');
    assert(getByIdRes.status === 200, 'GET /api/projects/proj-neurosync-01 retorna HTTP 200', `Recebido ${getByIdRes.status}`);
    assert(getByIdRes.body?.id === 'proj-neurosync-01', 'Retorna o projeto correto');

    const notFoundRes = await request('/api/projects/proj-inexistente-999');
    assert(notFoundRes.status === 404, 'GET /api/projects/id-inexistente retorna HTTP 404', `Recebido ${notFoundRes.status}`);

    // =========================================================================
    // 5. PROJECT CREATION (POST /api/projects)
    // =========================================================================
    console.log('\n[5] Project Creation (POST /api/projects)');
    const createRes = await request('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            title: 'QuantumVault',
            pitchLeader: 'Carlos Drummond',
            track: 'Deep Tech',
            description: 'Criptografia pós-quântica para proteção financeira.',
            orderIndex: 6,
            logoUrl: '/samples/quantum-logo.png',
            coverImageUrl: '/samples/quantum-cover.png'
        })
    });
    assert(createRes.status === 201, 'POST /api/projects válido retorna HTTP 201', `Recebido ${createRes.status}`);
    const createdProject = createRes.body;
    assert(Boolean(createdProject?.id), 'Novo projeto possui ID gerado');
    assert(createdProject?.title === 'QuantumVault', 'Título salvo corretamente');
    assert(createdProject?.status === 0, 'Novo projeto inicia com status Pending (0)');
    assert(createRes.headers.get('location')?.includes('/api/projects/'), 'Cabeçalho Location presente');

    // Validação de campos obrigatórios
    const missingTitleRes = await request('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            pitchLeader: 'Carlos Drummond',
            track: 'Deep Tech'
        })
    });
    assert(missingTitleRes.status === 400, 'POST /api/projects sem título retorna HTTP 400', `Recebido ${missingTitleRes.status}`);

    const missingTrackRes = await request('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            title: 'QuantumVault',
            pitchLeader: 'Carlos Drummond'
        })
    });
    assert(missingTrackRes.status === 400, 'POST /api/projects sem track retorna HTTP 400', `Recebido ${missingTrackRes.status}`);

    // =========================================================================
    // 6. PROJECT UPDATE (PUT /api/projects/{id})
    // =========================================================================
    console.log('\n[6] Project Update (PUT /api/projects/{id})');
    const updateProjRes = await request(`/api/projects/${createdProject.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            title: 'QuantumVault Core',
            pitchLeader: 'Carlos Drummond & Equipe'
        })
    });
    assert(updateProjRes.status === 200, 'PUT /api/projects/{id} retorna HTTP 200', `Recebido ${updateProjRes.status}`);
    assert(updateProjRes.body?.title === 'QuantumVault Core', 'Título atualizado');
    assert(updateProjRes.body?.pitchLeader === 'Carlos Drummond & Equipe', 'Líder atualizado');

    // =========================================================================
    // 7. ACTIVE PROJECT SELECTION (POST /api/projects/{id}/select)
    // =========================================================================
    console.log('\n[7] Active Project Selection (POST /api/projects/{id}/select)');
    const selectRes = await request('/api/projects/proj-ecolog-02/select', {
        method: 'POST'
    });
    assert(selectRes.status === 200, 'POST /api/projects/proj-ecolog-02/select retorna HTTP 200', `Recebido ${selectRes.status}`);
    assert(selectRes.body?.success === true, 'Seleção informa success = true');
    assert(selectRes.body?.currentProject?.id === 'proj-ecolog-02', 'currentProject atualizado para EcoLog');
    assert(selectRes.body?.currentProject?.status === 1, 'Novo projeto promovido para Current (1)');
    assert(Boolean(selectRes.body?.currentProject?.presentationStartedAt), 'presentationStartedAt foi preenchido');
    assert(selectRes.body?.previousProject?.id === 'proj-neurosync-01', 'previousProject identificado como NeuroSync AI');
    assert(selectRes.body?.previousProject?.status === 2, 'Projeto anterior migrado para Completed (2)');
    assert(Boolean(selectRes.body?.previousProject?.presentationEndedAt), 'presentationEndedAt do projeto anterior preenchido');
    assert(selectRes.body?.activeContext?.currentProjectId === 'proj-ecolog-02', 'ActiveContext sincronizado com proj-ecolog-02');

    // 7.2 Idempotência: selecionar novamente o mesmo projeto
    const reselectRes = await request('/api/projects/proj-ecolog-02/select', {
        method: 'POST'
    });
    assert(reselectRes.status === 200, 'Re-seleção do mesmo projeto retorna HTTP 200 (idempotente)', `Recebido ${reselectRes.status}`);
    assert(reselectRes.body?.currentProject?.id === 'proj-ecolog-02', 'Permanece como EcoLog');

    // 7.3 Projeto inexistente
    const selectInvalidRes = await request('/api/projects/proj-fantasma/select', {
        method: 'POST'
    });
    assert(selectInvalidRes.status === 404, 'Seleção de projeto inexistente retorna HTTP 404', `Recebido ${selectInvalidRes.status}`);

    // =========================================================================
    // 8. INCLUDE COMPLETED FILTER (GET /api/projects?includeCompleted=true)
    // =========================================================================
    console.log('\n[8] Filter: includeCompleted');
    const defaultListRes = await request('/api/projects');
    const completedIncludedRes = await request('/api/projects?includeCompleted=true');

    const defaultIds = defaultListRes.body.map(p => p.id);
    const allIds = completedIncludedRes.body.map(p => p.id);

    assert(!defaultIds.includes('proj-neurosync-01'), 'Lista padrão exclui projeto Completed (NeuroSync AI)');
    assert(allIds.includes('proj-neurosync-01'), 'Lista com includeCompleted=true inclui NeuroSync AI');
    assert(completedIncludedRes.body.length > defaultListRes.body.length, 'includeCompleted=true retorna mais itens que a lista padrão');

    // =========================================================================
    // 9. PROJECT DELETION & 409 CONFLICT (DELETE /api/projects/{id})
    // =========================================================================
    console.log('\n[9] Project Deletion & Conflict Protection (DELETE /api/projects/{id})');
    // 9.1 Tentativa de excluir o projeto ativo atual (EcoLog) -> 409 Conflict
    const deleteActiveRes = await request('/api/projects/proj-ecolog-02', {
        method: 'DELETE'
    });
    assert(deleteActiveRes.status === 409, 'Tentativa de excluir projeto ativo retorna HTTP 409 Conflict', `Recebido ${deleteActiveRes.status}`);
    assert(deleteActiveRes.body?.error?.includes('Cannot delete the currently active project'), 'Mensagem de erro protege projeto ativo');

    // 9.2 Exclusão de projeto inativo (o recém criado QuantumVault) -> 200 OK
    const deleteInactiveRes = await request(`/api/projects/${createdProject.id}`, {
        method: 'DELETE'
    });
    assert(deleteInactiveRes.status === 200, 'Exclusão de projeto inativo retorna HTTP 200', `Recebido ${deleteInactiveRes.status}`);

    // 9.3 Confirmar que foi removido
    const checkDeletedRes = await request(`/api/projects/${createdProject.id}`);
    assert(checkDeletedRes.status === 404, 'Projeto excluído não é mais encontrado (HTTP 404)');

    // =========================================================================
    // 10. COMPATIBILITY: GET /api/state PRESERVATION
    // =========================================================================
    console.log('\n[10] Compatibility: GET /api/state Preservation');
    const stateRes = await request('/api/state');
    assert(stateRes.status === 200, 'GET /api/state retorna HTTP 200', `Recebido ${stateRes.status}`);
    assert(typeof stateRes.body?.chairs === 'object', 'chairs preservado no snapshot');
    assert(typeof stateRes.body?.activeCount === 'number', 'activeCount preservado no snapshot');
    assert(stateRes.body?.currentProject?.id === 'proj-ecolog-02', 'Snapshot reflete o projeto atualmente ativo (EcoLog)');
    assert(stateRes.body?.currentEvent?.id === 'evt-demo-day-2026', 'Snapshot reflete o evento atual');

    console.log('\n======================================================');
    console.log('                 RESULTADO FINAL');
    console.log('======================================================');
    console.log(`PASS: ${passed}`);
    console.log(`FAIL: ${failed}`);
    console.log('======================================================\n');

    if (failed > 0) {
        console.error(`>>> [FAIL] ${failed} TESTE(S) FALHARAM`);
        process.exit(1);
    } else {
        console.log('>>> [PASS] TODAS AS APIS DO MILESTONE 2B FORAM VALIDADAS COM SUCESSO!\n');
        process.exit(0);
    }
}

run().catch(err => {
    console.error('Erro na execução dos testes:', err);
    process.exit(1);
});
