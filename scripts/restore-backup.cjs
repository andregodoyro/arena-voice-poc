/**
 * ============================================================================
 * ARENA VOICE — DISASTER RECOVERY & PHYSICAL RESTORE ENGINE (MILESTONE 4D.3)
 * ============================================================================
 * Executa restauração física de dumps PostgreSQL (.pgdump) via pg_restore.
 * Padrão: Out-of-Process, idempotente e seguro com --clean e --if-exists.
 *
 * Uso CLI:
 *   node scripts/restore-backup.cjs [arquivo_backup] [banco_alvo]
 *
 * Exemplos:
 *   node scripts/restore-backup.cjs                                      # Restaura o mais recente em arena_voice
 *   node scripts/restore-backup.cjs round_2_20261116T144432Z.pgdump      # Restaura arquivo específico em arena_voice
 *   node scripts/restore-backup.cjs round_2_20261116T144432Z.pgdump arena_voice_restore_test # Restaura em banco isolado
 *
 * Exportação de Módulo:
 *   const { restoreBackup, getLatestBackup } = require('./restore-backup.cjs');
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { getPgRestoreExe, getPsqlExe } = require('../tests/tool-locator.cjs');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const BACKUPS_DIR = path.join(PROJECT_ROOT, 'backups');

function getAvailableBackups() {
    if (!fs.existsSync(BACKUPS_DIR)) {
        return [];
    }

    const files = fs.readdirSync(BACKUPS_DIR)
        .filter(f => f.endsWith('.pgdump'))
        .map(f => {
            const fullPath = path.join(BACKUPS_DIR, f);
            const stat = fs.statSync(fullPath);
            return {
                name: f,
                fullPath,
                sizeBytes: stat.size,
                mtime: stat.mtime
            };
        })
        .filter(b => b.sizeBytes > 1000); // Descarta arquivos incompletos de 0 bytes

    // Ordenação decrescente por data de modificação (mais recente primeiro)
    return files.sort((a, b) => b.mtime - a.mtime);
}

function getLatestBackup() {
    const list = getAvailableBackups();
    return list.length > 0 ? list[0] : null;
}

function resolveBackupPath(inputArg) {
    if (!inputArg) {
        const latest = getLatestBackup();
        if (!latest) {
            throw new Error(`Nenhum arquivo de backup (.pgdump) encontrado no diretório: ${BACKUPS_DIR}`);
        }
        return latest.fullPath;
    }

    // Se foi fornecido caminho absoluto ou relativo direto
    if (fs.existsSync(inputArg)) {
        return path.resolve(inputArg);
    }

    // Se foi fornecido apenas o nome do arquivo em backups/
    const candidateInBackups = path.join(BACKUPS_DIR, inputArg);
    if (fs.existsSync(candidateInBackups)) {
        return candidateInBackups;
    }

    throw new Error(`Arquivo de backup não encontrado: ${inputArg} (Verificado também em ${BACKUPS_DIR})`);
}

function restoreBackup(options = {}) {
    const startTime = Date.now();
    const backupFilePath = resolveBackupPath(options.backupFile);
    const targetDatabase = options.targetDatabase || process.env.PGDATABASE || 'arena_voice';
    const host = options.host || process.env.PGHOST || 'localhost';
    const port = options.port || process.env.PGPORT || '5432';
    const username = options.username || process.env.PGUSER || 'postgres';
    const password = options.password || process.env.PGPASSWORD || 'local_dev_password';

    const pgRestoreExe = options.pgRestoreExe || getPgRestoreExe();

    // Argumentos padrão da Arena Voice para pg_restore:
    // -Fc (formato custom)
    // --clean (emite DROP antes dos CREATE para permitir restauração idempotente)
    // --if-exists (evita erros fatais de DROP quando o objeto ainda não existe)
    // --no-owner --no-privileges (garante portabilidade entre usuários do banco)
    const args = [
        '-h', host,
        '-p', String(port),
        '-U', username,
        '-d', targetDatabase,
        '--clean',
        '--if-exists',
        '--no-owner',
        '--no-privileges',
        backupFilePath
    ];

    const env = {
        ...process.env,
        PGPASSWORD: password
    };

    const result = spawnSync(pgRestoreExe, args, {
        env,
        encoding: 'utf8',
        maxBuffer: 32 * 1024 * 1024,
        timeout: options.timeoutMs || 30000
    });

    const durationMs = Date.now() - startTime;
    const stdout = result.stdout || '';
    const stderr = result.stderr || '';
    const exitCode = result.status ?? (result.error ? 1 : 0);

    // Em PostgreSQL, pg_restore retorna:
    // 0 = sucesso
    // 1 = avisos (warnings, como avisos de tabelas dropadas que não existiam)
    // 2 = erro fatal
    // Se for 0 ou 1 e não houver erro crítico de conexão/arquivo, é considerado bem-sucedido.
    const isFatal = exitCode >= 2 || (result.error !== undefined);
    const success = !isFatal;

    return {
        success,
        exitCode,
        durationMs,
        backupFilePath,
        backupFileName: path.basename(backupFilePath),
        targetDatabase,
        stdout,
        stderr,
        error: result.error ? result.error.message : null
    };
}

// Execução via linha de comando
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.includes('--help') || args.includes('-h') || args.includes('/?')) {
        console.log('\n================================================================');
        console.log('ARENA VOICE — DISASTER RECOVERY & RESTORE ENGINE (4D.3)');
        console.log('================================================================');
        console.log('Uso:');
        console.log('  scripts\\restore-backup.cmd [arquivo_backup] [banco_alvo]');
        console.log('\nExemplos:');
        console.log('  scripts\\restore-backup.cmd                                      (Restaura o snapshot mais recente)');
        console.log('  scripts\\restore-backup.cmd round_2_20261116T144432Z.pgdump      (Restaura rodada especifica)');
        console.log('  scripts\\restore-backup.cmd round_1_*.pgdump arena_voice_homolog (Restaura em banco alternativo)');
        console.log('\nOpcoes:');
        console.log('  --list, -l    Lista os backups disponíveis em backups/');
        console.log('  --help, -h    Exibe esta ajuda operacional');
        console.log('================================================================\n');
        process.exit(0);
    }

    if (args.includes('--list') || args.includes('-l')) {
        console.log('\n================================================================');
        console.log('ARENA VOICE — BACKUPS DISPONÍVEIS NO FILESYSTEM');
        console.log('================================================================');
        const list = getAvailableBackups();
        if (list.length === 0) {
            console.log('Nenhum backup (.pgdump) encontrado em backups/.');
        } else {
            list.forEach((b, idx) => {
                const sz = (b.sizeBytes / 1024).toFixed(1) + ' KB';
                console.log(` [${idx + 1}] ${b.name.padEnd(40)} ${sz.padStart(10)}  ${b.mtime.toISOString()}`);
            });
        }
        console.log('================================================================\n');
        process.exit(0);
    }

    const backupArg = args[0] || null;
    const targetDbArg = args[1] || 'arena_voice';

    console.log('\n================================================================');
    console.log('ARENA VOICE — DISASTER RECOVERY & RESTORE ENGINE (4D.3)');
    console.log('================================================================');

    try {
        const resolvedPath = resolveBackupPath(backupArg);
        const fileName = path.basename(resolvedPath);
        const stat = fs.statSync(resolvedPath);
        const sizeFormatted = (stat.size / 1024).toFixed(1) + ' KB';

        console.log(`\n📦 Snapshot Selecionado: ${fileName} (${sizeFormatted})`);
        console.log(`🎯 Banco Alvo:           ${targetDbArg}`);
        console.log(`⚙️  Executando restauração física via pg_restore...`);

        const outcome = restoreBackup({
            backupFile: resolvedPath,
            targetDatabase: targetDbArg
        });

        console.log(`⏱️  Tempo Decorrido:       ${outcome.durationMs}ms`);
        console.log(`📊 Código de Retorno:     ${outcome.exitCode}`);

        if (outcome.success) {
            console.log(`\n✅ RESTORE CONCLUÍDO COM SUCESSO NO BANCO '${targetDbArg}'!`);
            console.log('----------------------------------------------------------------');
            console.log('Passos seguintes recomendados:');
            console.log('  1. Inicie o backend:      .\\scripts\\start-backend.cmd');
            console.log('  2. O backend reidratará automaticamente o estado oficial.');
            console.log('  3. Atualize o navegador do Operador e Stage (F5).\n');
            process.exit(0);
        } else {
            console.error(`\n❌ FALHA NO RESTORE: Código de saída ${outcome.exitCode}`);
            if (outcome.error) console.error(`Erro: ${outcome.error}`);
            if (outcome.stderr) console.error(`Stderr: ${outcome.stderr}`);
            process.exit(1);
        }
    } catch (err) {
        console.error(`\n❌ ERRO NA OPERAÇÃO DE RESTORE: ${err.message}\n`);
        process.exit(1);
    }
}

module.exports = {
    getAvailableBackups,
    getLatestBackup,
    resolveBackupPath,
    restoreBackup
};
