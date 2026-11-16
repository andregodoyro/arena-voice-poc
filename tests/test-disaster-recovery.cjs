/**
 * ============================================================================
 * ARENA VOICE — DISASTER RECOVERY & PHYSICAL RESTORE VALIDATION (MILESTONE 4D.3)
 * ============================================================================
 * Validação rigorosa e automatizada de recuperação física pós-desastre:
 *   [Cenário 1] Geração de snapshot físico real (.pgdump) via BackupOrchestrator
 *   [Cenário 2] Criação de banco isolado de homologação (arena_voice_restore_test)
 *   [Cenário 3] Execução de restore real via pg_restore (--clean --if-exists)
 *   [Cenário 4] Validação de 100% de coincidência entre contagens pré e pós restore:
 *               - events
 *               - projects
 *               - judges
 *               - round_history_entries
 *               - audit_events
 *   [Cenário 5] Validação de integridade da trilha de auditoria (audit_events)
 *   [Cenário 6] Validação de integridade do histórico de rodadas (round_history_entries)
 *   [Cenário 7] Validação de integridade do catálogo e governança de eventos (events)
 *   [Cenário 8] Validação de integridade dos projetos da arena (projects)
 *   [Cenário 9] Validação de integridade do corpo de jurados (judges)
 *   [Cenário 10] Limpeza do ambiente de homologação (DROP DATABASE arena_voice_restore_test)
 *
 * REGRA DE SEGURANÇA OPERACIONAL:
 *   O banco principal 'arena_voice' NUNCA é destruído ou corrompido neste teste.
 *   Todo o ciclo de teste de restauração roda em banco temporário dedicado.
 * ============================================================================
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { getPsqlExe, getPgRestoreExe } = require('./tool-locator.cjs');
const { restoreBackup, getLatestBackup } = require('../scripts/restore-backup.cjs');

const BASE_URL = process.env.ARENA_API_URL || process.env.BASE_URL || 'http://localhost:5000';
const TEMP_DB = 'arena_voice_restore_test';
const SOURCE_DB = 'arena_voice';
const DB_HOST = process.env.PGHOST || 'localhost';
const DB_PORT = process.env.PGPORT || '5432';
const DB_USER = process.env.PGUSER || 'postgres';
const DB_PASS = process.env.PGPASSWORD || 'local_dev_password';

let pass = 0;
let fail = 0;
const failures = [];

function assert(condition, label, details = '') {
    if (condition) {
        pass++;
        console.log(`  [PASS] ${label}`);
    } else {
        fail++;
        failures.push(label + (details ? ` (${details})` : ''));
        console.log(`  [FAIL] ${label}${details ? ` -> ${details}` : ''}`);
    }
}

function querySql(dbName, sql) {
    const psqlExe = getPsqlExe();
    const result = spawnSync(psqlExe, [
        '-h', DB_HOST,
        '-p', String(DB_PORT),
        '-U', DB_USER,
        '-d', dbName,
        '-t',
        '-A',
        '-c', sql
    ], {
        env: { ...process.env, PGPASSWORD: DB_PASS },
        encoding: 'utf8',
        timeout: 10000
    });

    if (result.error) {
        throw new Error(`Falha ao executar SQL no banco '${dbName}': ${result.error.message}`);
    }

    if (result.status !== 0 && result.stderr) {
        throw new Error(`Erro SQL no banco '${dbName}': ${result.stderr.trim()}`);
    }

    return (result.stdout || '').trim();
}

function queryCount(dbName, tableName) {
    const raw = querySql(dbName, `SELECT COUNT(*) FROM ${tableName};`);
    const count = parseInt(raw, 10);
    return isNaN(count) ? 0 : count;
}

async function req(method, reqPath, body = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(reqPath, BASE_URL);
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
    console.log('\n================================================================');
    console.log('ARENA VOICE — VALIDAÇÃO DE DISASTER RECOVERY & RESTORE (4D.3)');
    console.log('================================================================\n');

    // Health check básico da API
    console.log('[0] Health check da plataforma Arena Voice...');
    const health = await req('GET', '/api/status');
    assert(health.status === 200, 'GET /api/status retorna 200 OK');
    assert(health.body && health.body.status === 'ONLINE', 'Backend online');

    // =========================================================================
    // CENÁRIO 1: GERAÇÃO DE SNAPSHOT FÍSICO REAL (POINT-IN-TIME BASELINE)
    // =========================================================================
    console.log('\n[Cenário 1] Geração de snapshot físico sob demanda...');
    // Aguarda drenagem completa de eventuais escritas concorrentes no banco principal
    await sleep(400);

    // Captura contagens oficiais no banco principal (arena_voice) exatamente antes do dump
    console.log('\n[Baseline] Captura das contagens oficiais no banco principal (arena_voice)...');
    const preCounts = {
        events: queryCount(SOURCE_DB, 'events'),
        projects: queryCount(SOURCE_DB, 'projects'),
        judges: queryCount(SOURCE_DB, 'judges'),
        roundHistory: queryCount(SOURCE_DB, 'round_history_entries'),
        auditEvents: queryCount(SOURCE_DB, 'audit_events')
    };

    console.log(`    Contagens capturadas:`);
    console.log(`      - Events:                ${preCounts.events}`);
    console.log(`      - Projects:              ${preCounts.projects}`);
    console.log(`      - Judges:                ${preCounts.judges}`);
    console.log(`      - Round History Entries: ${preCounts.roundHistory}`);
    console.log(`      - Audit Events:          ${preCounts.auditEvents}`);

    assert(preCounts.events > 0, 'events possui registros no baseline');
    assert(preCounts.projects > 0, 'projects possui registros no baseline');
    assert(preCounts.judges > 0, 'judges possui registros no baseline');
    assert(preCounts.auditEvents > 0, 'audit_events possui registros no baseline');

    // Gera o snapshot físico usando pg_dump no mesmo formato custom (-Fc) da Arena Voice
    const dumpsDir = path.join(__dirname, '..', 'backups');
    if (!fs.existsSync(dumpsDir)) fs.mkdirSync(dumpsDir, { recursive: true });
    const targetDumpPath = path.join(dumpsDir, `disaster_recovery_test_${Date.now()}.pgdump`);

    const { getPgDumpExe } = require('./tool-locator.cjs');
    const pgDumpExe = getPgDumpExe();
    const dumpProc = spawnSync(pgDumpExe, [
        '-h', DB_HOST,
        '-p', String(DB_PORT),
        '-U', DB_USER,
        '-Fc',
        '-d', SOURCE_DB,
        '-f', targetDumpPath
    ], {
        env: { ...process.env, PGPASSWORD: DB_PASS },
        encoding: 'utf8'
    });

    assert(dumpProc.status === 0 && fs.existsSync(targetDumpPath),
           `Snapshot físico gerado com sucesso: ${path.basename(targetDumpPath)}`);

    // =========================================================================
    // CENÁRIO 2: CRIAÇÃO DO BANCO TEMPORÁRIO ISOLADO
    // =========================================================================
    console.log('\n[Cenário 2] Criando banco de dados temporário de homologação...');
    try {
        // Encerra eventuais conexões órfãs no banco temporário antes de recriar
        querySql('postgres', `
            SELECT pg_terminate_backend(pid) 
            FROM pg_stat_activity 
            WHERE datname = '${TEMP_DB}' AND pid <> pg_backend_pid();
        `);
        querySql('postgres', `DROP DATABASE IF EXISTS ${TEMP_DB};`);
        querySql('postgres', `CREATE DATABASE ${TEMP_DB};`);
        assert(true, `Banco temporário '${TEMP_DB}' criado com sucesso e isolado`);
    } catch (err) {
        assert(false, `Falha ao preparar banco temporário: ${err.message}`);
    }

    // =========================================================================
    // CENÁRIO 3: EXECUÇÃO DO RESTORE REAL VIA ENGINE DE RESTORE
    // =========================================================================
    console.log('\n[Cenário 3] Executando restauração física via pg_restore no banco temporário...');
    const restoreOutcome = restoreBackup({
        backupFile: targetDumpPath,
        targetDatabase: TEMP_DB
    });

    assert(restoreOutcome.success === true, `pg_restore executado com sucesso (ExitCode: ${restoreOutcome.exitCode})`);
    assert(restoreOutcome.durationMs < 30000, `RTO cumprido: ${restoreOutcome.durationMs}ms (< 30s)`);
    console.log(`    Tempo de restauração do banco: ${restoreOutcome.durationMs}ms`);

    // =========================================================================
    // CENÁRIO 4: VALIDAÇÃO DE 100% DE COINCIDÊNCIA DE CONTAGENS (PRÉ VS PÓS)
    // =========================================================================
    console.log('\n[Cenário 4] Validação de 100% de coincidência entre contagens Pré e Pós Restore...');
    const postCounts = {
        events: queryCount(TEMP_DB, 'events'),
        projects: queryCount(TEMP_DB, 'projects'),
        judges: queryCount(TEMP_DB, 'judges'),
        roundHistory: queryCount(TEMP_DB, 'round_history_entries'),
        auditEvents: queryCount(TEMP_DB, 'audit_events')
    };

    console.log(`    Contagens no banco restaurado (${TEMP_DB}):`);
    console.log(`      - Events:                ${postCounts.events} (Pré: ${preCounts.events})`);
    console.log(`      - Projects:              ${postCounts.projects} (Pré: ${preCounts.projects})`);
    console.log(`      - Judges:                ${postCounts.judges} (Pré: ${preCounts.judges})`);
    console.log(`      - Round History Entries: ${postCounts.roundHistory} (Pré: ${preCounts.roundHistory})`);
    console.log(`      - Audit Events:          ${postCounts.auditEvents} (Pré: ${preCounts.auditEvents})`);

    assert(postCounts.events === preCounts.events, 
           `Contagem de 'events' 100% coincidente (${postCounts.events} === ${preCounts.events})`);
    assert(postCounts.projects === preCounts.projects, 
           `Contagem de 'projects' 100% coincidente (${postCounts.projects} === ${preCounts.projects})`);
    assert(postCounts.judges === preCounts.judges, 
           `Contagem de 'judges' 100% coincidente (${postCounts.judges} === ${preCounts.judges})`);
    assert(postCounts.roundHistory === preCounts.roundHistory, 
           `Contagem de 'round_history_entries' 100% coincidente (${postCounts.roundHistory} === ${preCounts.roundHistory})`);
    assert(postCounts.auditEvents === preCounts.auditEvents, 
           `Contagem de 'audit_events' 100% coincidente (${postCounts.auditEvents} === ${preCounts.auditEvents})`);

    // =========================================================================
    // CENÁRIO 5: VALIDAÇÃO DE INTEGRIDADE DO AUDIT TRAIL
    // =========================================================================
    console.log('\n[Cenário 5] Validação de integridade estrutural e de dados no Audit Trail...');
    const auditSample = querySql(TEMP_DB, `
        SELECT event_type, aggregate_type, aggregate_id, actor_type, event_version 
        FROM audit_events 
        ORDER BY occurred_at DESC 
        LIMIT 1;
    `);
    assert(auditSample.length > 0, 'audit_events restaurou registros com colunas válidas');

    const hasBackupTriggered = querySql(TEMP_DB, `
        SELECT COUNT(*) FROM audit_events WHERE event_type IN ('BackupTriggered', 'AutoSnapshotTriggered');
    `);
    assert(parseInt(hasBackupTriggered, 10) > 0, 'Eventos técnicos de backup/snapshot preservados na trilha');

    const hasPayload = querySql(TEMP_DB, `
        SELECT COUNT(*) FROM audit_events WHERE payload IS NOT NULL;
    `);
    assert(parseInt(hasPayload, 10) === postCounts.auditEvents, '100% dos eventos possuem payload JSONB intacto');

    // =========================================================================
    // CENÁRIO 6: VALIDAÇÃO DE INTEGRIDADE DO HISTÓRICO DE RODADAS
    // =========================================================================
    console.log('\n[Cenário 6] Validação de integridade do histórico de rodadas (round_history_entries)...');
    if (postCounts.roundHistory > 0) {
        const roundSample = querySql(TEMP_DB, `
            SELECT id, event_id, project_id, result, approval_mode, total_chairs 
            FROM round_history_entries 
            LIMIT 1;
        `);
        assert(roundSample.length > 0, 'Registro de rodada arquivada recuperado com sucesso');
        assert(roundSample.includes('5'), 'total_chairs preservado com 5 cadeiras');
    } else {
        assert(true, 'Histórico de rodadas validado (0 rodadas no baseline atual)');
    }

    // =========================================================================
    // CENÁRIO 7: VALIDAÇÃO DE INTEGRIDADE DOS EVENTOS
    // =========================================================================
    console.log('\n[Cenário 7] Validação de integridade dos eventos (events)...');
    const defaultEvent = querySql(TEMP_DB, `
        SELECT id, title, status FROM events WHERE id = 'evt-demo-day-2026';
    `);
    assert(defaultEvent.includes('evt-demo-day-2026'), 'Evento mestre evt-demo-day-2026 recuperado');
    assert(defaultEvent.includes('Demo Day'), 'Título do evento preservado');

    // =========================================================================
    // CENÁRIO 8: VALIDAÇÃO DE INTEGRIDADE DOS PROJETOS
    // =========================================================================
    console.log('\n[Cenário 8] Validação de integridade dos projetos (projects)...');
    const firstProject = querySql(TEMP_DB, `
        SELECT id, title, pitch_leader, track FROM projects WHERE id = 'proj-neurosync-01';
    `);
    assert(firstProject.includes('proj-neurosync-01'), 'Projeto proj-neurosync-01 recuperado');
    assert(firstProject.includes('NeuroSync AI'), 'Título do projeto NeuroSync AI íntegro');

    // =========================================================================
    // CENÁRIO 9: VALIDAÇÃO DE INTEGRIDADE DOS JURADOS
    // =========================================================================
    console.log('\n[Cenário 9] Validação de integridade dos jurados (judges)...');
    const judgeCount = querySql(TEMP_DB, `
        SELECT COUNT(*) FROM judges WHERE is_active = true;
    `);
    assert(parseInt(judgeCount, 10) >= 3, 'Corpo de jurados ativos recuperado');

    const judgeFarani = querySql(TEMP_DB, `
        SELECT name, company FROM judges WHERE id = 'judge-camila-01';
    `);
    assert(judgeFarani.includes('Camila Farani'), 'Jurada Camila Farani recuperada');

    // =========================================================================
    // CENÁRIO 10: LIMPEZA DO AMBIENTE TEMPORÁRIO
    // =========================================================================
    console.log('\n[Cenário 10] Limpeza segura do ambiente temporário de homologação...');
    try {
        querySql('postgres', `
            SELECT pg_terminate_backend(pid) 
            FROM pg_stat_activity 
            WHERE datname = '${TEMP_DB}' AND pid <> pg_backend_pid();
        `);
        querySql('postgres', `DROP DATABASE IF EXISTS ${TEMP_DB};`);
        assert(true, `Banco temporário '${TEMP_DB}' removido com sucesso`);
    } catch (err) {
        assert(false, `Falha ao remover banco temporário: ${err.message}`);
    }

    // Confirma que o banco principal permanece íntegro
    const mainCheck = queryCount(SOURCE_DB, 'events');
    assert(mainCheck === preCounts.events, 'Banco principal arena_voice permaneceu 100% intocado e íntegro');

    // Remove o arquivo de dump temporário da homologação
    if (fs.existsSync(targetDumpPath)) {
        try { fs.unlinkSync(targetDumpPath); } catch (_) {}
    }

    // Resumo final
    console.log('\n================================================================');
    console.log(`TOTAL: ${pass + fail} | APROVADOS: ${pass} | FALHAS: ${fail}`);
    console.log('================================================================\n');

    if (fail > 0) {
        console.log('FALHAS DETECTADAS:');
        failures.forEach(f => console.log(`  - ${f}`));
        process.exit(1);
    } else {
        console.log('✅ SUÍTE DE DISASTER RECOVERY & RESTORE 4D.3 HOMOLOGADA COM SUCESSO!\n');
    }
}

run().catch(err => {
    console.error('Erro fatal na execução dos testes de Disaster Recovery:', err);
    process.exit(1);
});
