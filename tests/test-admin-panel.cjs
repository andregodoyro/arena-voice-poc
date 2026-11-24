/**
 * test-admin-panel.cjs
 * Suíte automatizada de validação do Painel Administrativo de Usuários (Milestone 5I):
 * - CRUD de usuários pelo Admin (GET, POST, PUT)
 * - Ativação e desativação de contas
 * - Redefinição de senha
 * - Validação de RBAC: endpoints /api/admin/* retornam 403 para Operator
 * - Validação de RBAC: endpoints /api/admin/* retornam 401 sem token
 */

const { spawn } = require('child_process');
const path = require('path');
const { getDotnetExe } = require('./tool-locator.cjs');

const BACKEND_DIR = path.resolve(__dirname, '../backend');
const DOTNET_EXE = getDotnetExe();
const PORT = 5062;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const ADMIN_EMAIL    = process.env.ARENA_ADMIN_EMAIL    || 'admin@arenavoice.local';
const ADMIN_PASSWORD = process.env.ARENA_ADMIN_PASSWORD || 'ArenaAdmin@2026';
const OPERATOR_EMAIL    = 'operator@arenavoice.local';
const OPERATOR_PASSWORD = process.env.ARENA_OPERATOR_PASSWORD || 'ArenaOperator@2026';

let passed = 0;
let failed = 0;

function assert(cond, label, detail = '') {
  if (cond) {
    passed++;
    console.log(`  ✅ PASS: ${label}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${label}${detail ? ` -> ${detail}` : ''}`);
  }
}

async function req(urlPath, options = {}) {
  const res = await fetch(`${BASE_URL}${urlPath}`, options);
  const text = await res.text();
  let body = null;
  if (text) {
    try { body = JSON.parse(text); } catch { body = text; }
  }
  return { status: res.status, ok: res.ok, body };
}

function authHeader(token) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function login(email, password) {
  const r = await req('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) throw new Error(`Login falhou para ${email}: HTTP ${r.status} - ${JSON.stringify(r.body)}`);
  return r.body.accessToken;
}

async function waitForHealth(timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await req('/health');
      if (r.status === 200) return true;
    } catch { /* retry */ }
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

async function runTests() {
  console.log('🚀 Subindo backend isolado para testes 5I (Admin Panel)...');
  const child = spawn(DOTNET_EXE, ['run', '--no-build'], {
    cwd: BACKEND_DIR,
    env: {
      ...process.env,
      PORT: String(PORT),
      ARENA_STORAGE_ENGINE: 'postgres',
      DOTNET_CLI_TELEMETRY_OPTOUT: '1',
    },
    stdio: 'ignore',
  });

  let adminToken = '';
  let operatorToken = '';
  let createdUserId = '';

  try {
    const healthy = await waitForHealth();
    if (!healthy) throw new Error('Backend não respondeu em 30s');
    console.log(`✅ Backend pronto em ${BASE_URL}\n`);

    // ── 1. Autenticação ──────────────────────────────────────────────────
    console.log('── [1] Autenticação ────────────────────────────────────────');
    adminToken = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
    assert(!!adminToken, 'Admin login bem-sucedido');

    operatorToken = await login(OPERATOR_EMAIL, OPERATOR_PASSWORD);
    assert(!!operatorToken, 'Operator login bem-sucedido');

    // ── 2. RBAC: acesso sem token → 401 ─────────────────────────────────
    console.log('\n── [2] Acesso sem token retorna 401 ────────────────────────');
    const noAuth = await req('/api/admin/users');
    assert(noAuth.status === 401, 'GET /api/admin/users sem token → 401 Unauthorized');

    const noAuthPost = await req('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'X', email: 'x@x.com', password: 'pass', role: 'Viewer' }),
    });
    assert(noAuthPost.status === 401, 'POST /api/admin/users sem token → 401 Unauthorized');

    // ── 3. RBAC: Operator não pode acessar admin ──────────────────────────
    console.log('\n── [3] Operator sem acesso ao painel Admin → 403 ───────────');
    const opList = await req('/api/admin/users', {
      headers: { Authorization: `Bearer ${operatorToken}` },
    });
    assert(opList.status === 403, 'GET /api/admin/users com token Operator → 403 Forbidden');

    const opCreate = await req('/api/admin/users', {
      method: 'POST',
      headers: authHeader(operatorToken),
      body: JSON.stringify({ name: 'Hacker', email: 'hack@x.com', password: 'Senha@123', role: 'Admin' }),
    });
    assert(opCreate.status === 403, 'POST /api/admin/users com token Operator → 403 Forbidden');

    // ── 4. Admin: Listar usuários ─────────────────────────────────────────
    console.log('\n── [4] Admin: Listagem de usuários ─────────────────────────');
    const listRes = await req('/api/admin/users', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(listRes.status === 200, 'GET /api/admin/users com token Admin → 200 OK');
    assert(Array.isArray(listRes.body), 'Resposta é um array de usuários');
    assert(listRes.body.length >= 3, 'Contém ao menos 3 usuários seed (Admin, Operator, Viewer)');

    // ── 5. Admin: Criar usuário ───────────────────────────────────────────
    console.log('\n── [5] Admin: Criar novo usuário ───────────────────────────');
    const createRes = await req('/api/admin/users', {
      method: 'POST',
      headers: authHeader(adminToken),
      body: JSON.stringify({
        name: 'Usuário de Teste 5I',
        email: 'teste5i@arenavoice.local',
        password: 'Teste5I@Pass!',
        role: 'Viewer',
      }),
    });
    assert(createRes.status === 201, 'POST /api/admin/users cria usuário → 201 Created');
    assert(createRes.body?.email === 'teste5i@arenavoice.local', 'E-mail do usuário criado confere');
    assert(createRes.body?.role === 'Viewer', 'Role do usuário criado confere (Viewer)');
    assert(createRes.body?.isActive === true, 'Usuário criado inicia como ativo');
    createdUserId = createRes.body?.id;
    assert(!!createdUserId, `ID gerado: ${createdUserId}`);

    // Duplicar email deve retornar 409
    const dupEmail = await req('/api/admin/users', {
      method: 'POST',
      headers: authHeader(adminToken),
      body: JSON.stringify({
        name: 'Duplicado',
        email: 'teste5i@arenavoice.local',
        password: 'Duplicado@123',
        role: 'Viewer',
      }),
    });
    assert(dupEmail.status === 409, 'POST /api/admin/users com email duplicado → 409 Conflict');

    // ── 6. Admin: Obter usuário por ID ────────────────────────────────────
    console.log('\n── [6] Admin: Obter usuário por ID ─────────────────────────');
    const getRes = await req(`/api/admin/users/${createdUserId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(getRes.status === 200, `GET /api/admin/users/${createdUserId} → 200 OK`);
    assert(getRes.body?.id === createdUserId, 'ID do usuário retornado confere');

    const getNotFound = await req('/api/admin/users/usr-nao-existe-xyz', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(getNotFound.status === 404, 'GET /api/admin/users/inexistente → 404 Not Found');

    // ── 7. Admin: Editar usuário ──────────────────────────────────────────
    console.log('\n── [7] Admin: Editar nome e role ───────────────────────────');
    const editRes = await req(`/api/admin/users/${createdUserId}`, {
      method: 'PUT',
      headers: authHeader(adminToken),
      body: JSON.stringify({ name: 'Usuário 5I Editado', role: 'Operator' }),
    });
    assert(editRes.status === 200, 'PUT /api/admin/users/{id} → 200 OK');
    assert(editRes.body?.name === 'Usuário 5I Editado', 'Nome atualizado corretamente');
    assert(editRes.body?.role === 'Operator', 'Role atualizada para Operator');

    // ── 8. Admin: Desativar conta ─────────────────────────────────────────
    console.log('\n── [8] Admin: Desativar e reativar conta ───────────────────');
    const deactivateRes = await req(`/api/admin/users/${createdUserId}/deactivate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(deactivateRes.status === 200, 'POST /deactivate → 200 OK');
    assert(deactivateRes.body?.user?.isActive === false, 'Conta desativada corretamente');

    // Usuário desativado não consegue logar
    let loginFailed = false;
    try {
      const r = await req('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'teste5i@arenavoice.local', password: 'Teste5I@Pass!' }),
      });
      loginFailed = r.status === 401;
    } catch { loginFailed = false; }
    assert(loginFailed, 'Usuário desativado não consegue fazer login (401)');

    const activateRes = await req(`/api/admin/users/${createdUserId}/activate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(activateRes.status === 200, 'POST /activate → 200 OK');
    assert(activateRes.body?.user?.isActive === true, 'Conta reativada corretamente');

    // ── 9. Admin: Redefinição de senha ────────────────────────────────────
    console.log('\n── [9] Admin: Redefinição de senha ─────────────────────────');

    // Senha muito curta deve retornar 400
    const shortPass = await req(`/api/admin/users/${createdUserId}/reset-password`, {
      method: 'POST',
      headers: authHeader(adminToken),
      body: JSON.stringify({ newPassword: 'short' }),
    });
    assert(shortPass.status === 400, 'Senha com menos de 8 chars → 400 Bad Request');

    const resetRes = await req(`/api/admin/users/${createdUserId}/reset-password`, {
      method: 'POST',
      headers: authHeader(adminToken),
      body: JSON.stringify({ newPassword: 'NovaSenha@5I!' }),
    });
    assert(resetRes.status === 200, 'POST /reset-password → 200 OK');
    assert(resetRes.body?.success === true, 'Redefinição de senha bem-sucedida');

    // Senha antiga não deve mais funcionar
    const oldPassLogin = await req('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'teste5i@arenavoice.local', password: 'Teste5I@Pass!' }),
    });
    assert(oldPassLogin.status === 401, 'Login com senha antiga retorna 401 após reset');

    // Nova senha deve funcionar
    const newPassLogin = await req('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'teste5i@arenavoice.local', password: 'NovaSenha@5I!' }),
    });
    assert(newPassLogin.status === 200, 'Login com nova senha → 200 OK');

    // ── 10. Proteção: Admin não pode desativar a própria conta ───────────
    console.log('\n── [10] Proteção: auto-desativação bloqueada ────────────────');
    // Obter ID do admin
    const meRes = await req('/api/auth/me', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminId = meRes.body?.id;
    if (adminId) {
      const selfDeactivate = await req(`/api/admin/users/${adminId}/deactivate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert(selfDeactivate.status === 403, 'Admin não pode desativar a própria conta → 403 Forbidden');
    } else {
      assert(false, 'Não foi possível obter ID do Admin para teste de auto-desativação');
    }

    // ── Limpeza ───────────────────────────────────────────────────────────
    if (createdUserId) {
      await req(`/api/admin/users/${createdUserId}/deactivate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    }

  } finally {
    child.kill('SIGTERM');
    await new Promise((r) => setTimeout(r, 800));

    console.log('\n════════════════════════════════════════════════════════════');
    console.log('          RESULTADO FINAL — ADMIN PANEL (5I)');
    console.log('════════════════════════════════════════════════════════════');
    console.log(`PASS: ${passed}`);
    console.log(`FAIL: ${failed}`);
    console.log(`TOTAL: ${passed + failed}`);
    console.log('════════════════════════════════════════════════════════════\n');

    if (failed > 0) {
      process.exit(1);
    }
    console.log('✅ ADMIN PANEL 5I: TODOS OS TESTES APROVADOS\n');
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('ERRO FATAL:', err);
  process.exit(1);
});
