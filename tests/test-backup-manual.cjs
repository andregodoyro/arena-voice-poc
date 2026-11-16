/**
 * ============================================================
 * ARENA VOICE — MILESTONE 4D.1 — BACKUP MANUAL & ORCHESTRATION
 * ============================================================
 * Valida a fundação de backup operacional da plataforma:
 *   - Health check do backend
 *   - Consulta inicial de backups via Filesystem (GET /api/admin/backups)
 *   - Disparo de backup manual assíncrono (POST /api/admin/backup -> 202 Accepted)
 *   - Verificação de latência imediata (não-bloqueante no hot path)
 *   - Conclusão assíncrona do pg_dump via BackupWorker
 *   - Presença do arquivo físico .pgdump no diretório backups/
 *   - Listagem atualizada com metadados corretos (tamanho, trigger, timestamp, status)
 *   - Validação de integridade do arquivo gerado via pg_restore
 *   - Rastreabilidade completa no Audit Trail (BackupTriggered e BackupSucceeded)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { getPgRestoreExe } = require('./tool-locator.cjs');

const BASE = 'http://localhost:5000';
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

async function run() {
    console.log('\n============================================================');
    console.log('ARENA VOICE — TESTES DE BACKUP MANUAL & ORCHESTRATION (4D.1)');
    console.log('============================================================\n');

    // 1. Health check
    console.log('[1] Health check da API...');
    const health = await req('GET', '/api/status');
    assert(health.status === 200, 'GET /api/status retorna 200');
    assert(health.body && health.body.status === 'ONLINE', 'Backend online');

    // 2. Consulta inicial de backups
    console.log('\n[2] Consulta inicial de backups (Filesystem como Fonte da Verdade)...');
    const initialBackups = await req('GET', '/api/admin/backups');
    assert(initialBackups.status === 200, 'GET /api/admin/backups retorna 200');
    assert(Array.isArray(initialBackups.body), 'Resposta é um array de backups');
    const countBefore = initialBackups.body.length;
    console.log(`    Backups pré-existentes encontrados: ${countBefore}`);

    // 3. Disparo do backup manual
    console.log('\n[3] Disparo de backup manual via POST /api/admin/backup...');
    const triggerRes = await req('POST', '/api/admin/backup');
    assert(triggerRes.status === 202, 'POST /api/admin/backup retorna 202 Accepted');
    assert(triggerRes.durationMs < 200, `Resposta ultrarrápida no hot path (${triggerRes.durationMs}ms < 200ms)`);
    assert(triggerRes.body && triggerRes.body.jobId, 'Retorna jobId único');
    assert(triggerRes.body && triggerRes.body.status === 'queued', 'Status inicial é queued');
    assert(triggerRes.body && triggerRes.body.trigger === 'Manual', 'Trigger identificado como Manual');

    const jobId = triggerRes.body.jobId;
    console.log(`    JobId do backup: ${jobId}`);

    // 4. Aguardo da conclusão assíncrona do pg_dump pelo BackupWorker
    console.log('\n[4] Aguardando conclusão assíncrona do pg_dump pelo BackupWorker...');
    let createdBackup = null;
    let attempts = 0;
    const maxAttempts = 15;

    while (attempts < maxAttempts) {
        await sleep(500);
        attempts++;
        const poll = await req('GET', '/api/admin/backups');
        if (poll.status === 200 && Array.isArray(poll.body) && poll.body.length > countBefore) {
            const candidate = poll.body[0];
            if (candidate.status === 'Completed' && candidate.sizeBytes > 1000) {
                createdBackup = candidate;
                break;
            }
        }
    }

    assert(createdBackup !== null, `Backup gerado e detectado no filesystem em ${attempts * 500}ms`);
    if (createdBackup) {
        assert(createdBackup.fileName.startsWith('manual_'), 'Nome do arquivo inicia com prefixo manual_');
        assert(createdBackup.fileName.endsWith('.pgdump'), 'Nome do arquivo termina com extensão .pgdump');
        assert(createdBackup.sizeBytes > 1000, `Tamanho do arquivo válido (${createdBackup.sizeBytes} bytes > 1KB)`);
        assert(typeof createdBackup.sizeFormatted === 'string', `Tamanho formatado legível: ${createdBackup.sizeFormatted}`);
        assert(createdBackup.trigger === 'Manual', 'Trigger registrado como Manual');
        assert(createdBackup.status === 'Completed', 'Status registrado como Completed');
        assert(typeof createdBackup.createdAt === 'string', `Timestamp de criação presente: ${createdBackup.createdAt}`);
    }

    // 5. Validação física do arquivo no filesystem
    console.log('\n[5] Validação física do arquivo gerado no diretório backups/...');
    const backupsDir = path.join(__dirname, '..', 'backups');
    assert(fs.existsSync(backupsDir), 'Diretório backups/ existe fisicamente');

    if (createdBackup) {
        const physicalFile = path.join(backupsDir, createdBackup.fileName);
        assert(fs.existsSync(physicalFile), `Arquivo físico existe: ${createdBackup.fileName}`);

        const stat = fs.statSync(physicalFile);
        assert(stat.size === createdBackup.sizeBytes, `Tamanho em disco coincide com metadado retornado (${stat.size} bytes)`);

        // 6. Validação de integridade via pg_restore
        console.log('\n[6] Validação de integridade do arquivo de dump via pg_restore...');
        const pgRestoreExe = getPgRestoreExe();
        try {
            const stdout = execSync(`"${pgRestoreExe}" -l "${physicalFile}"`, { encoding: 'utf-8', timeout: 5000 });
            assert(stdout.includes('Format: CUSTOM') || stdout.includes('TOC Entries') || stdout.includes('Compression:'), 
                   'pg_restore -l confirmou cabeçalho TOC e formato CUSTOM válidos');
        } catch (err) {
            assert(false, `Falha ao validar arquivo com pg_restore: ${err.message}`);
        }
    }

    // 7. Rastreabilidade no Audit Trail
    console.log('\n[7] Verificação de rastreabilidade no Audit Trail (ADR-022)...');
    // Aguarda o flush periódico (200ms) do AuditEventWriter
    await sleep(400);
    const auditRes = await req('GET', '/api/audit?includeTechnical=true&pageSize=30');
    assert(auditRes.status === 200, 'GET /api/audit?includeTechnical=true retorna 200');

    const items = auditRes.body && auditRes.body.items ? auditRes.body.items : [];
    const triggerEvent = items.find(e => e.eventType === 'BackupTriggered' && e.aggregateId === jobId);
    assert(triggerEvent !== undefined, `Evento BackupTriggered encontrado no audit trail para o jobId ${jobId}`);
    if (triggerEvent) {
        assert(triggerEvent.actorType === 'Operator', 'BackupTriggered associado ao Actor Operator');
    }

    const successEvent = items.find(e => e.eventType === 'BackupSucceeded' && e.aggregateId === jobId);
    assert(successEvent !== undefined, `Evento BackupSucceeded encontrado no audit trail para o jobId ${jobId}`);
    if (successEvent) {
        assert(successEvent.actorType === 'System', 'BackupSucceeded associado ao Actor System');
        assert(successEvent.success === true, 'BackupSucceeded reporta success = true');
    }

    // 8. Ordenação decrescente de backups
    console.log('\n[8] Validação de ordenação decrescente do GET /api/admin/backups...');
    const finalBackups = await req('GET', '/api/admin/backups');
    if (finalBackups.body.length >= 2) {
        const d1 = new Date(finalBackups.body[0].createdAt).getTime();
        const d2 = new Date(finalBackups.body[1].createdAt).getTime();
        assert(d1 >= d2, 'Lista ordenada decrescente por data de criação');
    } else {
        assert(true, 'Ordenação válida (único ou nenhum registro prévio adicional)');
    }

    console.log('\n============================================================');
    console.log(`TOTAL: ${pass + fail} | APROVADOS: ${pass} | FALHAS: ${fail}`);
    console.log('============================================================\n');

    if (fail > 0) {
        console.log('FALHAS DETECTADAS:');
        failures.forEach(f => console.log(`  - ${f}`));
        process.exit(1);
    } else {
        console.log('✅ SUÍTE DE BACKUP MANUAL 4D.1 HOMOLOGADA COM SUCESSO!\n');
    }
}

run().catch(err => {
    console.error('Erro fatal na execução dos testes:', err);
    process.exit(1);
});
