const signalR = require('../frontend/node_modules/@microsoft/signalr');

const backendUrl = (
    process.env.VITE_BACKEND_URL || 'http://127.0.0.1:5000'
).replace(/\/+$/, '');

const signalrUrl =
    process.env.VITE_SIGNALR_URL ||
    `${backendUrl}/hubs/arena-poc`;

const EXPECTED_CHAIRS = [1, 2, 3, 4, 5];
const EVENT_TIMEOUT_MS = 3000;

let passed = 0;
let failed = 0;

function pass(message) {
    passed++;
    console.log(`  [PASS] ${message}`);
}

function fail(message, details = '') {
    failed++;
    console.error(
        `  [FAIL] ${message}${details ? ` - ${details}` : ''}`
    );
}

function assert(condition, message, details = '') {
    if (condition) {
        pass(message);
    } else {
        fail(message, details);
    }
}

async function request(path, options = {}) {
    const response = await fetch(`${backendUrl}${path}`, options);

    const text = await response.text();

    let body = null;

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

async function resetArena() {
    return request('/api/reset', {
        method: 'POST'
    });
}

async function getState() {
    return request('/api/state');
}

function waitForCondition(check, timeoutMs = EVENT_TIMEOUT_MS) {
    return new Promise((resolve, reject) => {
        const startedAt = Date.now();

        const timer = setInterval(() => {
            if (check()) {
                clearInterval(timer);
                resolve();
                return;
            }

            if (Date.now() - startedAt >= timeoutMs) {
                clearInterval(timer);
                reject(new Error(`Timeout apos ${timeoutMs} ms`));
            }
        }, 25);
    });
}

async function main() {
    console.log('');
    console.log('======================================================');
    console.log('     ARENA VOICE - SIGNALR E2E VALIDATION');
    console.log('======================================================');
    console.log(`Backend: ${backendUrl}`);
    console.log(`SignalR: ${signalrUrl}`);
    console.log('');

    let connection = null;

    const receivedChairIds = [];
    const receivedEvents = [];

    let resetReceived = false;

    try {
        // --------------------------------------------------
        // 1. BASELINE
        // --------------------------------------------------

        console.log('[1] Preparando estado inicial');

        const initialReset = await resetArena();

        assert(
            initialReset.ok,
            'Reset inicial executado',
            `HTTP ${initialReset.status}`
        );

        const initialState = await getState();

        assert(
            initialState.status === 200,
            'GET /api/state retorna HTTP 200'
        );

        assert(
            initialState.body?.activeCount === 0,
            'Estado inicial possui activeCount=0',
            JSON.stringify(initialState.body)
        );

        // --------------------------------------------------
        // 2. SIGNALR
        // --------------------------------------------------

        console.log('\n[2] Conectando ao SignalR');

        connection = new signalR.HubConnectionBuilder()
            .withUrl(signalrUrl)
            .build();

        connection.on('ChairTurned', (data) => {
            const chairId = Number(data.chairId);

            console.log(
                `[SignalR] ChairTurned recebido: chairId=${chairId}`
            );

            receivedChairIds.push(chairId);
            receivedEvents.push(data);
        });

        connection.on('ChairsReset', () => {
            console.log('[SignalR] ChairsReset recebido');
            resetReceived = true;
        });

        await connection.start();

        assert(
            connection.state === signalR.HubConnectionState.Connected,
            'Conexao SignalR estabelecida'
        );

        // --------------------------------------------------
        // 3. CHAIRS 1-5
        // --------------------------------------------------

        console.log('\n[3] Acionando cadeiras 1-5');

        for (const chairId of EXPECTED_CHAIRS) {
            const response = await postJson(
                '/api/chair-press',
                { chairId }
            );

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
                `Resposta confirma chairId=${chairId}`,
                JSON.stringify(response.body)
            );

            try {
                await waitForCondition(
                    () => receivedChairIds.includes(chairId)
                );

                pass(
                    `SignalR recebeu ChairTurned para chairId=${chairId}`
                );
            } catch (err) {
                fail(
                    `SignalR recebeu ChairTurned para chairId=${chairId}`,
                    err.message
                );
            }
        }

        // --------------------------------------------------
        // 4. VERIFICAR EVENTOS
        // --------------------------------------------------

        console.log('\n[4] Validando eventos recebidos');

        for (const chairId of EXPECTED_CHAIRS) {
            assert(
                receivedChairIds.includes(chairId),
                `Evento da cadeira ${chairId} foi recebido`
            );
        }

        assert(
            receivedEvents.length === 5,
            'Foram recebidos exatamente 5 eventos ChairTurned',
            `Recebidos: ${receivedEvents.length}`
        );

        const uniqueChairIds = [...new Set(receivedChairIds)].sort(
            (a, b) => a - b
        );

        assert(
            JSON.stringify(uniqueChairIds) ===
                JSON.stringify(EXPECTED_CHAIRS),
            'Eventos representam exatamente as cadeiras 1-5',
            JSON.stringify(uniqueChairIds)
        );

        // --------------------------------------------------
        // 5. STATE = 5
        // --------------------------------------------------

        console.log('\n[5] Validando Arena State');

        const activeState = await getState();

        assert(
            activeState.status === 200,
            'GET /api/state apos acionamentos retorna HTTP 200'
        );

        assert(
            activeState.body?.activeCount === 5,
            'Arena State possui activeCount=5',
            JSON.stringify(activeState.body)
        );

        for (const chairId of EXPECTED_CHAIRS) {
            assert(
                activeState.body?.chairs?.[String(chairId)] === true,
                `Arena State confirma cadeira ${chairId}=true`
            );
        }

        // --------------------------------------------------
        // 6. RESET VIA SIGNALR
        // --------------------------------------------------

        console.log('\n[6] Testando reset realtime');

        resetReceived = false;

        const resetResponse = await resetArena();

        assert(
            resetResponse.ok,
            'POST /api/reset retorna sucesso',
            `HTTP ${resetResponse.status}`
        );

        try {
            await waitForCondition(() => resetReceived);

            pass('SignalR recebeu evento ChairsReset');
        } catch (err) {
            fail(
                'SignalR recebeu evento ChairsReset',
                err.message
            );
        }

        // --------------------------------------------------
        // 7. STATE FINAL
        // --------------------------------------------------

        console.log('\n[7] Validando estado final');

        const finalState = await getState();

        assert(
            finalState.body?.activeCount === 0,
            'Apos reset, activeCount=0',
            JSON.stringify(finalState.body)
        );

        for (const chairId of EXPECTED_CHAIRS) {
            assert(
                finalState.body?.chairs?.[String(chairId)] === false,
                `Apos reset, cadeira ${chairId}=false`
            );
        }

    } catch (err) {
        fail(
            'Execucao E2E concluida sem excecao inesperada',
            err.stack || err.message
        );

    } finally {
        // --------------------------------------------------
        // CLEANUP
        // --------------------------------------------------

        try {
            await resetArena();
        } catch (err) {
            console.error(
                '[Cleanup] Nao foi possivel resetar o Arena:',
                err.message
            );
        }

        if (connection) {
            try {
                await connection.stop();
            } catch (err) {
                console.error(
                    '[Cleanup] Erro ao encerrar SignalR:',
                    err.message
                );
            }
        }
    }

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
        console.error(
            '\n>>> [FAIL] TESTE E2E SIGNALR FALHOU\n'
        );

        process.exit(1);
    }

    console.log(
        '\n>>> [PASS] SIGNALR E2E VALIDADO PARA CADEIRAS 1-5 E RESET\n'
    );

    process.exit(0);
}

main();