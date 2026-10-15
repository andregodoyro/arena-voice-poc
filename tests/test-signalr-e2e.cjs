const signalR = require('../frontend/node_modules/@microsoft/signalr');

async function testSignalR() {
    console.log('[Test] Conectando ao Hub SignalR em http://127.0.0.1:5000/hubs/arena-poc...');
    const connection = new signalR.HubConnectionBuilder()
        .withUrl('http://127.0.0.1:5000/hubs/arena-poc')
        .build();

    let eventReceived = null;

    connection.on('ChairTurned', (data) => {
        console.log('[Test SignalR] Evento ChairTurned RECEBIDO com sucesso:', JSON.stringify(data));
        eventReceived = data;
    });

    await connection.start();
    console.log('[Test SignalR] Conexao estabelecida com sucesso!');

    // Dispara POST HTTP para simular acionamento da Cadeira 1
    console.log('[Test HTTP] Enviando POST /api/chair-press para Cadeira #1...');
    const res = await fetch('http://127.0.0.1:5000/api/chair-press', {
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
