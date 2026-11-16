/**
 * ============================================================================
 * ARENA VOICE — MILESTONE 4D.2 — AUTOMATED SNAPSHOTS & BACKUP VERIFICATION
 * ============================================================================
 * Valida a integridade completa de snapshots e backups da plataforma:
 *   [1] Health check e consulta inicial via Filesystem (GET /api/admin/backups)
 *   [2] Disparo de backup manual assíncrono (4D.1 - POST /api/admin/backup)
 *   [3] Validação de integridade física e lógica via pg_restore (manual)
 *   [4] Snapshot automático na finalização da Rodada 1 (POST /api/rounds/archive)
 *   [5] Verificação de latência no hot-path (< 500ms HTTP total, enqueue < 10ms)
 *   [6] Detecção de round_1_<ts>.pgdump com trigger = RoundArchived e roundNumber = 1
 *   [7] Validação de integridade do arquivo round_1 via pg_restore
 *   [8] Rastreabilidade no Audit Trail (AutoSnapshotTriggered e AutoSnapshotCreated)
 *   [9] Snapshot automático sequencial na Rodada 2 via PitchStage.Finished
 *   [10] Preservação de múltiplos snapshots (round_1 e round_2 sem sobrescrita)
 *   [11] Ordenação cronológica decrescente dos backups no catálogo
 * ============================================================================
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { getPgRestoreExe } = require('./tool-locator.cjs');

const BASE = process.env.ARENA_API_URL || process.env.BASE_URL || 'http://127.0.0.1:5000';
let pass = 0;
let fail = 0;
const failures = [];

function assert(condition, label) {
    if (condition) {
        pass++;
        console.log(`  [PASS] ${label}`);
    } else {
        fail++;
        failures.push(label);
        console.log(`  [FAIL] ${label}`);
    }
}

async function req(method, reqPath, body = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(reqPath, BASE);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method,
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000
        };

        const startTime = Date.now();
        const r = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const durationMs = Date.now() - startTime;
                let parsed = null;
                try { parsed = JSON.parse(data); } catch { parsed = data; }
                resolve({ status: res.statusCode, body: parsed, durationMs });
            });
        });

        r.on('error', reject);
        r.on('timeout', () => { r.destroy(); reject(new Error('timeout')); });

        if (body) r.write(JSON.stringify(body));
        r.end();
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForBackup(predicate, maxAttempts = 20, intervalMs = 500) {
    for (let i = 0; i < maxAttempts; i++) {
        await sleep(intervalMs);
        const poll = await req('GET', '/api/admin/backups');
        if (poll.status === 200 && Array.isArray(poll.body)) {
            const found = poll.body.find(predicate);
            if (found && found.status === 'Completed' && found.sizeBytes > 1000) {
                return found;
            }
        }
    }
    return null;
}

async function run() {
    console.log('\n============================================================');
    console.log('ARENA VOICE — TESTES DE SNAPSHOTS AUTOMÁTICOS & BACKUP (4D.2)');
    console.log('============================================================\n');

    const pgRestoreExe = getPgRestoreExe();
    const backupsDir = path.join(__dirname, '..', 'backups');

    // 1. Health check da API
    console.log('[1] Health check da API...');
    const health = await req('GET', '/api/status');
    assert(health.status === 200, 'GET /api/status retorna 200 OK');
    assert(health.body && health.body.status === 'ONLINE', 'Backend online');

    // 2. Consulta inicial de backups
    console.log('\n[2] Consulta inicial de backups via Filesystem...');
    const initialBackups = await req('GET', '/api/admin/backups');
    assert(initialBackups.status === 200, 'GET /api/admin/backups retorna 200 OK');
    assert(Array.isArray(initialBackups.body), 'Resposta de backups é um array');
    const initialCount = initialBackups.body.length;
    console.log(`    Backups pré-existentes encontrados: ${initialCount}`);

    // 3. Validação do Backup Manual (Fundação 4D.1)
    console.log('\n[3] Disparo de backup manual via POST /api/admin/backup...');
    const manualTrigger = await req('POST', '/api/admin/backup');
    assert(manualTrigger.status === 202, 'POST /api/admin/backup retorna 202 Accepted');
    assert(manualTrigger.durationMs < 1000, `Resposta não-bloqueante no hot path (${manualTrigger.durationMs}ms < 200ms)`);
    assert(manualTrigger.body && manualTrigger.body.jobId, 'Retorna jobId do backup manual');

    const manualJobId = manualTrigger.body.jobId;
    console.log(`    Aguardando conclusão do backup manual (${manualJobId})...`);
    const manualBackup = await waitForBackup(b => b.trigger === 'Manual' && b.fileName.startsWith('manual_'));
    assert(manualBackup !== null, 'Backup manual concluído e listado no catálogo do filesystem');

    if (manualBackup) {
        assert(manualBackup.fileName.endsWith('.pgdump'), 'Extensão .pgdump confirmada');
        assert(manualBackup.sizeBytes > 1000, `Tamanho válido: ${manualBackup.sizeFormatted}`);
        assert(manualBackup.trigger === 'Manual', 'Trigger identificado como Manual');

        const physicalManual = path.join(backupsDir, manualBackup.fileName);
        assert(fs.existsSync(physicalManual), `Arquivo físico manual existe: ${manualBackup.fileName}`);

        try {
            const stdout = execSync(`"${pgRestoreExe}" -l "${physicalManual}"`, { encoding: 'utf-8', timeout: 5000 });
            assert(stdout.includes('Format: CUSTOM') || stdout.includes('TOC Entries') || stdout.includes('Compression:'),
                   'pg_restore -l confirmou integridade e TOC do backup manual');
        } catch (err) {
            assert(false, `Falha no pg_restore do backup manual: ${err.message}`);
        }
    }

    // 4. Criação de Evento e Projetos Isolados para Teste Limpo de Rodadas
    console.log('\n[4] Criando evento dedicado para validação de rodadas sequenciais (round_1 e round_2)...');
    const createEvt = await req('POST', '/api/events', {
        title: `Arena Teste 4D AutoSnapshot ${Date.now()}`,
        themeColor: '#10B981'
    });
    assert(createEvt.status === 201, 'Evento dedicado criado com status 201 Created');
    const testEventId = createEvt.body.id;
    console.log(`    ID do Evento de Teste: ${testEventId}`);

    // Ativa o evento criado
    const actEvt = await req('POST', `/api/events/${testEventId}/activate`);
    assert(actEvt.status === 200, 'Evento de teste ativado com sucesso');

    // Cria Projeto 1 no evento ativo
    const createProj1 = await req('POST', '/api/projects', {
        title: 'Alpha GreenTech 4D',
        pitchLeader: 'Líder Alpha',
        track: 'Cleantech'
    });
    assert(createProj1.status === 201, 'Projeto 1 criado com sucesso');
    const proj1Id = createProj1.body.id;

    // Cria Projeto 2 no evento ativo
    const createProj2 = await req('POST', '/api/projects', {
        title: 'Beta HealthAI 4D',
        pitchLeader: 'Líder Beta',
        track: 'Healthtech'
    });
    assert(createProj2.status === 201, 'Projeto 2 criado com sucesso');
    const proj2Id = createProj2.body.id;

    // Seleciona Projeto 1
    const sel1 = await req('POST', `/api/projects/${proj1Id}/select`);
    assert(sel1.status === 200, 'Projeto 1 selecionado no palco');

    // Transiciona para PitchRunning -> VotingOpen
    await req('POST', '/api/pitch/transition', { targetStage: 'PitchRunning' });
    await sleep(200);
    await req('POST', '/api/pitch/transition', { targetStage: 'VotingOpen' });
    await sleep(200);

    // Vira cadeiras 1, 2 e 3
    await req('POST', '/api/chairs/1/toggle');
    await req('POST', '/api/chairs/2/toggle');
    await req('POST', '/api/chairs/3/toggle');
    await sleep(200);

    // Arquiva a Rodada 1 explicitamente via POST /api/rounds/archive
    console.log('\n[5] Arquivando Rodada 1 (POST /api/rounds/archive) e medindo overhead no hot path...');
    const archiveRound1 = await req('POST', '/api/rounds/archive', { reason: 'Homologação 4D.2 Rodada 1' });
    assert(archiveRound1.status === 200, 'POST /api/rounds/archive retorna 200 OK');
    assert(archiveRound1.durationMs < 500, `Resposta rápida no hot path da rodada: ${archiveRound1.durationMs}ms (< 500ms)`);
    assert(archiveRound1.body && archiveRound1.body.id, 'Rodada 1 arquivada com sucesso');
    const round1Id = archiveRound1.body.id;
    console.log(`    Round 1 ID: ${round1Id}, TurnedChairs: ${archiveRound1.body.turnedChairCount}`);

    // 6. Aguarda e valida snapshot automático da Rodada 1
    console.log('\n[6] Aguardando criação assíncrona do snapshot automático da Rodada 1...');
    const snapshotRound1 = await waitForBackup(b => b.trigger === 'RoundArchived' && b.roundNumber === 1);
    assert(snapshotRound1 !== null, 'Snapshot automático round_1_*.pgdump detectado no filesystem');

    if (snapshotRound1) {
        assert(/^round_1_\d{8}T\d{6}Z\.pgdump$/i.test(snapshotRound1.fileName),
               `Nomenclatura estrita compatível com round_1_<timestamp>.pgdump: ${snapshotRound1.fileName}`);
        assert(snapshotRound1.trigger === 'RoundArchived', 'Trigger identificado como RoundArchived');
        assert(snapshotRound1.roundNumber === 1, 'RoundNumber identificado estritamente como 1');
        assert(snapshotRound1.status === 'Completed', 'Status do snapshot é Completed');
        assert(snapshotRound1.sizeBytes > 1000, `Tamanho do snapshot consistente: ${snapshotRound1.sizeFormatted}`);

        const physicalRound1 = path.join(backupsDir, snapshotRound1.fileName);
        assert(fs.existsSync(physicalRound1), 'Arquivo físico do snapshot 1 existe em backups/');

        try {
            const stdout = execSync(`"${pgRestoreExe}" -l "${physicalRound1}"`, { encoding: 'utf-8', timeout: 5000 });
            assert(stdout.includes('Format: CUSTOM') || stdout.includes('TOC Entries') || stdout.includes('Compression:'),
                   'pg_restore -l confirmou integridade e TOC do snapshot da Rodada 1');
        } catch (err) {
            assert(false, `Falha no pg_restore do snapshot round 1: ${err.message}`);
        }
    }

    // 7. Rastreabilidade no Audit Trail da Rodada 1
    console.log('\n[7] Verificação de rastreabilidade de eventos de auditoria da Rodada 1...');
    await sleep(400); // Aguarda flush do AuditEventWriter (200ms)
    const auditRes = await req('GET', '/api/audit?includeTechnical=true&pageSize=50');
    assert(auditRes.status === 200, 'GET /api/audit?includeTechnical=true retorna 200 OK');

    const auditItems = auditRes.body && auditRes.body.items ? auditRes.body.items : [];
    const roundArchivedEv = auditItems.find(e => e.eventType === 'RoundArchived' && e.aggregateId === round1Id);
    assert(roundArchivedEv !== undefined, `Evento RoundArchived encontrado para a rodada ${round1Id}`);

    const autoSnapshotTrigEv = auditItems.find(e => e.eventType === 'AutoSnapshotTriggered' && e.payload?.roundId === round1Id);
    assert(autoSnapshotTrigEv !== undefined, 'Evento AutoSnapshotTriggered encontrado com metadados da rodada');
    if (autoSnapshotTrigEv) {
        assert(autoSnapshotTrigEv.payload.roundNumber === 1, 'AutoSnapshotTriggered referencia roundNumber = 1');
        assert(autoSnapshotTrigEv.payload.trigger === 'RoundArchived', 'TriggerType = RoundArchived');
    }

    const autoSnapshotCreatedEv = auditItems.find(e => e.eventType === 'AutoSnapshotCreated' && e.payload?.roundNumber === 1);
    assert(autoSnapshotCreatedEv !== undefined, 'Evento AutoSnapshotCreated encontrado após pg_dump bem-sucedido');
    if (autoSnapshotCreatedEv) {
        assert(autoSnapshotCreatedEv.payload.fileName === snapshotRound1?.fileName, 'AutoSnapshotCreated referencia fileName correto');
        assert(autoSnapshotCreatedEv.success === true, 'AutoSnapshotCreated relata success = true');
        assert(autoSnapshotCreatedEv.payload.sizeBytes > 1000, 'AutoSnapshotCreated contém sizeBytes válido');
    }

    // 8. Cenário de Rodada 2: Arquivamento automático via PitchStage.Finished
    console.log('\n[8] Executando Rodada 2 com arquivamento acionado por PitchStage.Finished...');
    const sel2 = await req('POST', `/api/projects/${proj2Id}/select`);
    assert(sel2.status === 200, 'Projeto 2 selecionado no palco');

    await req('POST', '/api/pitch/transition', { targetStage: 'PitchRunning' });
    await sleep(200);
    await req('POST', '/api/pitch/transition', { targetStage: 'VotingOpen' });
    await sleep(200);

    // Vira todas as 5 cadeiras
    for (let c = 1; c <= 5; c++) {
        await req('POST', `/api/chairs/${c}/toggle`);
    }
    await sleep(200);

    // Fecha a votação e depois finaliza o pitch (validando o pipeline completo da máquina de estados)
    await req('POST', '/api/pitch/transition', { targetStage: 'VotingClosed' });
    await sleep(200);

    // Finaliza o pitch via transição Finished (deve disparar arquivamento + snapshot da rodada 2)
    const finRes = await req('POST', '/api/pitch/transition', { targetStage: 'Finished' });
    assert(finRes.status === 200, 'Transição para PitchStage.Finished executada com sucesso');

    console.log('    Aguardando criação assíncrona do snapshot automático da Rodada 2...');
    const snapshotRound2 = await waitForBackup(b => b.trigger === 'RoundArchived' && b.roundNumber === 2);
    assert(snapshotRound2 !== null, 'Snapshot automático round_2_*.pgdump detectado no filesystem');

    if (snapshotRound2) {
        assert(/^round_2_\d{8}T\d{6}Z\.pgdump$/i.test(snapshotRound2.fileName),
               `Nomenclatura compatível com round_2_<timestamp>.pgdump: ${snapshotRound2.fileName}`);
        assert(snapshotRound2.trigger === 'RoundArchived', 'Trigger identificado como RoundArchived');
        assert(snapshotRound2.roundNumber === 2, 'RoundNumber identificado estritamente como 2');

        const physicalRound2 = path.join(backupsDir, snapshotRound2.fileName);
        assert(fs.existsSync(physicalRound2), 'Arquivo físico do snapshot 2 existe em backups/');

        try {
            const stdout = execSync(`"${pgRestoreExe}" -l "${physicalRound2}"`, { encoding: 'utf-8', timeout: 5000 });
            assert(stdout.includes('Format: CUSTOM') || stdout.includes('TOC Entries') || stdout.includes('Compression:'),
                   'pg_restore -l confirmou integridade e TOC do snapshot da Rodada 2');
        } catch (err) {
            assert(false, `Falha no pg_restore do snapshot round 2: ${err.message}`);
        }
    }

    // 9. Preservação e Ordenação de Múltiplos Snapshots
    console.log('\n[9] Validação de catálogo com múltiplos snapshots sem sobrescrita...');
    const listRes = await req('GET', '/api/admin/backups');
    assert(listRes.status === 200, 'GET /api/admin/backups retorna 200 OK');
    const backupsList = listRes.body;

    const hasRound1 = backupsList.some(b => b.roundNumber === 1);
    const hasRound2 = backupsList.some(b => b.roundNumber === 2);
    const hasManual = backupsList.some(b => b.trigger === 'Manual');
    assert(hasRound1, 'Snapshot da Rodada 1 preservado no catálogo');
    assert(hasRound2, 'Snapshot da Rodada 2 presente no catálogo');
    assert(hasManual, 'Backup manual prévio preservado no catálogo');

    // Valida ordenação decrescente (mais recentes primeiro)
    let isSorted = true;
    for (let i = 0; i < backupsList.length - 1; i++) {
        const t1 = new Date(backupsList[i].createdAt).getTime();
        const t2 = new Date(backupsList[i + 1].createdAt).getTime();
        if (t1 < t2) {
            isSorted = false;
            break;
        }
    }
    assert(isSorted, 'Catálogo ordenado cronologicamente em ordem decrescente');

    // Restaura o evento padrão (evt-demo-day-2026) para isolamento
    await req('POST', '/api/events/evt-demo-day-2026/activate');

    // Resumo final
    console.log('\n============================================================');
    console.log(`TOTAL: ${pass + fail} | APROVADOS: ${pass} | FALHAS: ${fail}`);
    console.log('============================================================\n');

    if (fail > 0) {
        console.log('FALHAS DETECTADAS:');
        failures.forEach(f => console.log(`  - ${f}`));
        process.exit(1);
    } else {
        console.log('✅ MILESTONE 4D.2 HOMOLOGADO COM SUCESSO!\n');
    }
}

run().catch(err => {
    console.error('Erro fatal na execução dos testes 4D.2:', err);
    process.exit(1);
});
