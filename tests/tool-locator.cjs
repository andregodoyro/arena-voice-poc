/**
 * ============================================================
 * ARENA VOICE — TOOL LOCATOR (PORTABILIDADE & DESCOBERTA DINÂMICA)
 * ============================================================
 * Ordem rigorosa de descoberta:
 *   1. Variáveis de ambiente (DOTNET_EXE, NODE_EXE, PG_DUMP_EXE, etc.)
 *   2. Configuração explícita
 *   3. Ferramentas portáteis do projeto (devtools/portable/...)
 *   4. PATH do sistema operacional (Linux / Cloud / Docker / CI/CD)
 *   5. Fallbacks seguros
 */

const fs = require('fs');
const path = require('path');

function resolveExecutable(toolName, envVars = [], subDir = null) {
    // 1. Variáveis de ambiente explícitas
    for (const v of envVars) {
        if (process.env[v] && fs.existsSync(process.env[v])) {
            return process.env[v];
        }
    }

    const isWin = process.platform === 'win32';
    const exeName = isWin ? `${toolName}.exe` : toolName;
    const projectRoot = path.resolve(__dirname, '..');
    const folderName = subDir || toolName;

    // 2. Diretórios candidatos no repositório / ferramentas portáteis
    const candidates = [
        path.join(projectRoot, 'devtools', 'portable', folderName, 'bin', exeName),
        path.join(projectRoot, 'devtools', 'portable', folderName, exeName),
        path.join(projectRoot, '..', 'devtools', 'portable', folderName, 'bin', exeName),
        path.join(projectRoot, '..', 'devtools', 'portable', folderName, exeName)
    ];

    // Para ferramentas do PostgreSQL (psql, pg_dump, pg_restore)
    if (['psql', 'pg_dump', 'pg_restore', 'pg_ctl'].includes(toolName)) {
        candidates.unshift(
            path.join(projectRoot, 'devtools', 'portable', 'pgsql', 'bin', exeName),
            path.join(projectRoot, '..', 'devtools', 'portable', 'pgsql', 'bin', exeName)
        );
    }

    for (const c of candidates) {
        if (fs.existsSync(c)) {
            return c;
        }
    }

    // 3. Fallback no PATH do sistema operacional (Padrão Linux / Cloud / Docker / CI)
    return isWin && toolName !== 'node' ? exeName : toolName;
}

module.exports = {
    resolveExecutable,
    getDotnetExe: () => resolveExecutable('dotnet', ['DOTNET_EXE']),
    getNodeExe: () => resolveExecutable('node', ['NODE_EXE']),
    getPsqlExe: () => resolveExecutable('psql', ['PSQL_EXE', 'PSQL'], 'pgsql'),
    getPgRestoreExe: () => resolveExecutable('pg_restore', ['PG_RESTORE_EXE', 'PGRESTORE_PATH'], 'pgsql'),
    getPgDumpExe: () => resolveExecutable('pg_dump', ['PG_DUMP_EXE', 'PGDUMP_PATH'], 'pgsql')
};
