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
        ok: response.ok,
        body
    };
}

async function postJson(path, payload) {
    return request(path, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });
}

async function reset() {
    return request('/api/reset', {
        method: 'POST'
    });
}

async function getState() {
    return request('/api/state');
}

function allChairsAre(chairs, expected) {
    return [1, 2, 3, 4, 5].every(
        id => chairs && chairs[String(id)] === expected
    );
}

async function main() {
    console.log('');
    console.log('======================================================');
    console.log('       ARENA VOICE - AUTOMATED API VALIDATION');
    console.log('======================================================');
    console.log(`Backend: ${backendUrl}`);
    console.log('');

    // --------------------------------------------------
    // 1. HEALTH CHECK
    // --------------------------------------------------

    console.log('[1] Health check');

    const status = await request('/api/status');

    assert(status.status === 200, 'GET /api/status retorna HTTP 200');
    assert(
        status.body?.status === 'ONLINE',
        'Backend informa status ONLINE',
        JSON.stringify(status.body)
    );

    // --------------------------------------------------
    // 2. BASELINE
    // --------------------------------------------------

    console.log('\n[2] Reset e estado inicial');

    const initialReset = await reset();

    assert(
        initialReset.status >= 200 && initialReset.status < 300,
        'POST /api/reset executado'
    );

    const initialState = await getState();

    assert(initialState.status === 200, 'GET /api/state retorna HTTP 200');

    assert(
        initialState.body?.activeCount === 0,
        'Estado inicial possui activeCount = 0',
        JSON.stringify(initialState.body)
    );

    assert(
        allChairsAre(initialState.body?.chairs, false),
        'Cadeiras 1-5 iniciam como false',
        JSON.stringify(initialState.body?.chairs)
    );

    // --------------------------------------------------
    // 3. HAPPY PATH 1-5
    // --------------------------------------------------

    console.log('\n[3] POST /api/chair-press para chairId 1-5');

    for (let chairId = 1; chairId <= 5; chairId++) {
        const response = await postJson('/api/chair-press', { chairId });

        assert(
            response.status === 200,
            `chairId=${chairId} retorna HTTP 200`
        );

        assert(
            response.body?.accepted === true,
            `chairId=${chairId} retorna accepted=true`,
            JSON.stringify(response.body)
        );

        assert(
            response.body?.chairId === chairId,
            `Resposta preserva chairId=${chairId}`,
            JSON.stringify(response.body)
        );
    }

    const allActiveState = await getState();

    assert(
        allActiveState.body?.activeCount === 5,
        'Após chairId 1-5, activeCount = 5',
        JSON.stringify(allActiveState.body)
    );

    assert(
        allChairsAre(allActiveState.body?.chairs, true),
        'Após acionamento, cadeiras 1-5 estão true',
        JSON.stringify(allActiveState.body?.chairs)
    );

    // --------------------------------------------------
    // 4. RESET
    // --------------------------------------------------

    console.log('\n[4] Reset após acionamento');

    const resetResponse = await reset();

    assert(
        resetResponse.status >= 200 && resetResponse.status < 300,
        'POST /api/reset retorna sucesso'
    );

    const resetState = await getState();

    assert(
        resetState.body?.activeCount === 0,
        'Após reset, activeCount = 0',
        JSON.stringify(resetState.body)
    );

    assert(
        allChairsAre(resetState.body?.chairs, false),
        'Após reset, cadeiras 1-5 estão false',
        JSON.stringify(resetState.body?.chairs)
    );

    // --------------------------------------------------
    // 5. IDs INVALIDOS
    // --------------------------------------------------

    console.log('\n[5] chairId fora da faixa');

    for (const chairId of [0, 6, -1]) {
        const response = await postJson('/api/chair-press', { chairId });

        assert(
            response.status === 400,
            `chairId=${chairId} retorna HTTP 400`,
            `HTTP recebido: ${response.status}`
        );
    }

    // --------------------------------------------------
    // 6. PAYLOADS INVALIDOS
    // --------------------------------------------------

    console.log('\n[6] Payloads invalidos');

    const invalidPayloads = [
        { name: 'payload vazio', body: '{}' },
        { name: 'campo desconhecido', body: '{"foo":1}' },
        { name: 'chairId texto', body: '{"chairId":"abc"}' },
        { name: 'JSON malformado', body: '{"chairId":' }
    ];

    for (const test of invalidPayloads) {
        const response = await request('/api/chair-press', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: test.body
        });

        assert(
            response.status === 400,
            `${test.name} retorna HTTP 400`,
            `HTTP recebido: ${response.status}`
        );
    }

    // --------------------------------------------------
    // 7. ESTADO DEVE CONTINUAR INTACTO
    // --------------------------------------------------

    console.log('\n[7] Preservacao do estado');

    const stateAfterErrors = await getState();

    assert(
        stateAfterErrors.body?.activeCount === 0,
        'Requests invalidos nao alteram activeCount',
        JSON.stringify(stateAfterErrors.body)
    );

    assert(
        allChairsAre(stateAfterErrors.body?.chairs, false),
        'Requests invalidos nao alteram cadeiras',
        JSON.stringify(stateAfterErrors.body?.chairs)
    );

    // --------------------------------------------------
    // 8. LEGACY seatNumber EM chair-press
    // --------------------------------------------------

    console.log('\n[8] Compatibilidade seatNumber');

    const legacyChairPress = await postJson(
        '/api/chair-press',
        { seatNumber: 3 }
    );

    assert(
        legacyChairPress.status === 200,
        'seatNumber em /api/chair-press retorna HTTP 200'
    );

    assert(
        legacyChairPress.body?.accepted === true,
        'seatNumber em /api/chair-press e aceito'
    );

    assert(
        legacyChairPress.body?.chairId === 3,
        'seatNumber=3 e convertido para chairId=3',
        JSON.stringify(legacyChairPress.body)
    );

    const legacyState = await getState();

    assert(
        legacyState.body?.chairs?.['3'] === true,
        'seatNumber=3 atualiza estado da cadeira 3'
    );

    assert(
        legacyState.body?.activeCount === 1,
        'seatNumber=3 resulta em activeCount=1'
    );

    // --------------------------------------------------
    // 9. LEGACY /api/support
    // --------------------------------------------------

    console.log('\n[9] Compatibilidade /api/support');

    await reset();

    const support = await postJson(
        '/api/support',
        { seatNumber: 2 }
    );

    assert(
        support.status === 200,
        '/api/support retorna HTTP 200'
    );

    assert(
        support.body?.accepted === true,
        '/api/support retorna accepted=true'
    );

    assert(
        support.body?.seatNumber === 2,
        '/api/support preserva seatNumber=2'
    );

    assert(
        support.body?.chairId === 2,
        '/api/support converte para chairId=2'
    );

    const supportState = await getState();

    assert(
        supportState.body?.chairs?.['2'] === true,
        '/api/support atualiza cadeira 2'
    );

    assert(
        supportState.body?.activeCount === 1,
        '/api/support resulta em activeCount=1'
    );

    // --------------------------------------------------
    // CLEANUP
    // --------------------------------------------------

    console.log('\n[10] Cleanup');

    await reset();

    const finalState = await getState();

    assert(
        finalState.body?.activeCount === 0,
        'Estado final restaurado para activeCount=0'
    );

    assert(
        allChairsAre(finalState.body?.chairs, false),
        'Estado final restaurado para cadeiras 1-5 false'
    );

    // --------------------------------------------------
    // RESULTADO
    // --------------------------------------------------

    console.log('');
    console.log('======================================================');
    console.log('                 RESULTADO FINAL');
    console.log('======================================================');
    console.log(`PASS: ${passed}`);
    console.log(`FAIL: ${failed}`);
    console.log('======================================================');

    if (failed > 0) {
        console.error('\n>>> [FAIL] VALIDACAO AUTOMATIZADA DA API FALHOU\n');
        process.exit(1);
    }

    console.log('\n>>> [PASS] API DO ARENA VOICE VALIDADA COM SUCESSO\n');
    process.exit(0);
}

main().catch(async (err) => {
    console.error('\n>>> [ERROR] Falha inesperada durante os testes:');
    console.error(err);

    try {
        await reset();
    } catch {
        // Backend pode estar indisponivel.
    }

    process.exit(1);
});