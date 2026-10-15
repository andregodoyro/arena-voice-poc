const signalR = require('../frontend/node_modules/@microsoft/signalr');

const backendUrl = (process.env.VITE_BACKEND_URL || 'http://127.0.0.1:5000').replace(/\/+$/, '');
const signalrUrl = process.env.VITE_SIGNALR_URL || `${backendUrl}/hubs/arena-poc`;

async function testSignalR() {
    console.log(`[Test] Conectando ao Hub SignalR em ${signalrUrl}...`);
    const connection = new signalR.HubConnectionBuilder()
        .withUrl(signalrUrl)
        .build();

    let eventReceived = null;

    connection.on('ChairTurned', (data) => {
        console.log('[Test SignalR] Evento ChairTurned RECEBIDO com sucesso:', JSON.stringify(data));
        eventReceived = data;
    });

    await connection.start();
    console.log('[Test SignalR] Conexao estabelecida com sucesso!');

    // Dispara POST HTTP para simular acionamento da Cadeira 1
    const endpoint = `${backendUrl}/api/chair-press`;
    console.log(`[Test HTTP] Enviando POST ${endpoint} para Cadeira #1...`);
    const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chairId: 1 })
    });
    const json = await res.json();
    console.log('[Test HTTP] Resposta recebida:', JSON.stringify(json));

    // Aguarda propagacao
    await new Promise(r => setTimeout(r, 1000));

    if (eventReceived && eventReceived.chairId === 1) {
        console.log('\n======================================================');
        console.log('>>> [PASS] TESTE E2E SIGNALR FUNCIONANDO PERFEITAMENTE!');
        console.log('>>> Cadeira #1 acionada via HTTP e recebida via SignalR');
        console.log('======================================================\n');
        await connection.stop();
        process.exit(0);
    } else {
        console.error('>>> [FAIL] Evento SignalR nao foi recebido a tempo.');
        await connection.stop();
        process.exit(1);
    }
}

testSignalR().catch(err => {
    console.error('Erro no teste:', err);
    process.exit(1);
});
