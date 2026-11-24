/**
 * test-auth-and-ranking.cjs
 * Suíte automatizada de validação da Fundação Arquitetural (Milestones 5H + 6A):
 * - Autenticação JWT (Login, Refresh, Logout, /me)
 * - Controle de Acesso RBAC (Admin, Operator, Viewer — 401 e 403)
 * - Rate-limiting contra força bruta (429)
 * - Autenticação independente de hardware ESP32 (X-Device-Key)
 * - Segurança de Uploads (Magic Bytes & XSS SVG)
 * - Motor de Ranking Oficial Consolidado (GET /api/events/:id/results)
 */

const { spawn } = require('child_process');
const path = require('path');
const { getDotnetExe } = require('./tool-locator.cjs');

const BACKEND_DIR = path.resolve(__dirname, '../backend');
const DOTNET_EXE = getDotnetExe();
const PORT = 5058;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const DEVICE_KEY = 'esp32-test-secret-key-2026';

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
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  return { status: res.status, ok: res.ok, body };
}

function authHeader(token) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function waitForHealth(timeoutMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await req('/health');
      if (r.status === 200) return true;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

async function runTests() {
  console.log('🚀 Subindo backend isolado para testes 5H + 6A (PostgreSQL)...');
  const child = spawn(DOTNET_EXE, ['run', '--no-build'], {
    cwd: BACKEND_DIR,
    env: {
      ...process.env,
      PORT: String(PORT),
      ARENA_STORAGE_ENGINE: 'postgres',
      ARENA_DEVICE_API_KEY: DEVICE_KEY,
      DOTNET_CLI_TELEMETRY_OPTOUT: '1',
    },
    stdio: 'ignore',
  });

  try {
    const ready = await waitForHealth();
    assert(ready, 'Backend inicializou e respondeu /health 200 OK');
    if (!ready) return;

    // 1. Rotas Públicas do Stage
    console.log('\n[1] Validando rotas públicas do Telão (/stage) e Health...');
    assert((await req('/health')).status === 200, 'GET /health é público (200)');
    assert((await req('/api/status')).status === 200, 'GET /api/status é público (200)');
    assert((await req('/api/state')).status === 200, 'GET /api/state é público (200)');
    assert((await req('/api/events/current')).status === 200, 'GET /api/events/current é público (200)');

    // 2. Bloqueio de rotas protegidas sem token (401)
    console.log('\n[2] Validando bloqueio de acesso não autenticado (HTTP 401)...');
    assert((await req('/api/reset', { method: 'POST' })).status === 401, 'POST /api/reset sem token retorna 401');
    assert((await req('/api/pitch/transition', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetStage: 1 }) })).status === 401, 'POST /api/pitch/transition sem token retorna 401');
    assert((await req('/api/upload', { method: 'POST' })).status === 401, 'POST /api/upload sem token retorna 401');
    assert((await req('/api/audit')).status === 401, 'GET /api/audit sem token retorna 401');
    assert((await req('/api/admin/backup', { method: 'POST' })).status === 401, 'POST /api/admin/backup sem token retorna 401');

    // 3. Login dos 3 perfis (Viewer, Operator, Admin)
    console.log('\n[3] Validando Login JWT para Viewer, Operator e Admin...');
    const viewerLogin = await req('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'viewer@arenavoice.local', password: 'ArenaViewer@2026' }),
    });
    assert(viewerLogin.status === 200 && Boolean(viewerLogin.body?.accessToken), 'Login Viewer gerou JWT válido');

    const opLogin = await req('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'operator@arenavoice.local', password: 'ArenaOperator@2026' }),
    });
    assert(opLogin.status === 200 && Boolean(opLogin.body?.accessToken), 'Login Operator gerou JWT válido');

    const adminLogin = await req('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@arenavoice.local', password: 'ArenaAdmin@2026' }),
    });
    assert(adminLogin.status === 200 && Boolean(adminLogin.body?.accessToken), 'Login Admin gerou JWT válido');

    const viewerToken = viewerLogin.body.accessToken;
    const opToken = opLogin.body.accessToken;
    const adminToken = adminLogin.body.accessToken;

    // 4. Matriz RBAC (403 Forbidden)
    console.log('\n[4] Validando RBAC estrito (HTTP 403 Forbidden)...');
    assert((await req('/api/reset', { method: 'POST', headers: authHeader(viewerToken) })).status === 403, 'Viewer tentando POST /api/reset recebe 403');
    assert((await req('/api/audit', { headers: authHeader(viewerToken) })).status === 403, 'Viewer tentando GET /api/audit recebe 403');
    assert((await req('/api/admin/backups', { headers: authHeader(opToken) })).status === 403, 'Operator tentando GET /api/admin/backups recebe 403');
    assert((await req('/api/admin/backups', { headers: authHeader(adminToken) })).status === 200, 'Admin acessando GET /api/admin/backups recebe 200');
    assert((await req('/api/audit', { headers: authHeader(opToken) })).status === 200, 'Operator acessando GET /api/audit recebe 200');

    // 5. Refresh Token, /me e Logout
    console.log('\n[5] Validando /api/auth/me, Refresh Token e Logout...');
    const meRes = await req('/api/auth/me', { headers: authHeader(opToken) });
    assert(meRes.status === 200 && meRes.body?.role === 'Operator', 'GET /api/auth/me retorna perfil Operator');

    const refreshRes = await req('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: viewerLogin.body.refreshToken }),
    });
    assert(refreshRes.status === 200 && Boolean(refreshRes.body?.accessToken), 'POST /api/auth/refresh rotaciona tokens');

    const logoutRes = await req('/api/auth/logout', { method: 'POST', headers: authHeader(viewerToken) });
    assert(logoutRes.status === 200, 'POST /api/auth/logout revoga sessão');

    const reuseRefresh = await req('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refreshRes.body.refreshToken }),
    });
    assert(reuseRefresh.status === 401, 'Refresh token revogado após logout é rejeitado (401)');

    // 6. Rate-limit de login (429)
    console.log('\n[6] Validando Rate Limiting contra força bruta (HTTP 429)...');
    let hit429 = false;
    for (let i = 0; i < 6; i++) {
      const attempt = await req('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'bruteforce@arenavoice.local', password: 'wrong' }),
      });
      if (attempt.status === 429) {
        hit429 = true;
        break;
      }
    }
    assert(hit429, 'Excesso de tentativas inválidas dispara HTTP 429 Too Many Requests');

    // 7. ESP32 Device Key Auth
    console.log('\n[7] Validando autenticação independente de hardware ESP32 (X-Device-Key)...');
    const noKeyPress = await req('/api/chair-press', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chairId: 1, source: 'ESP32_TEST' }),
    });
    assert(noKeyPress.status === 401, 'POST /api/chair-press sem X-Device-Key retorna 401');

    const wrongKeyPress = await req('/api/chair-press', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Device-Key': 'wrong-key' },
      body: JSON.stringify({ chairId: 1, source: 'ESP32_TEST' }),
    });
    assert(wrongKeyPress.status === 401, 'POST /api/chair-press com X-Device-Key incorreta retorna 401');

    const validKeyPress = await req('/api/chair-press', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Device-Key': DEVICE_KEY },
      body: JSON.stringify({ chairId: 1, source: 'ESP32_TEST' }),
    });
    assert(validKeyPress.status === 200 || validKeyPress.status === 409, `POST /api/chair-press com X-Device-Key válida autentica (status ${validKeyPress.status})`);

    // 8. Upload Security (Magic Bytes + XSS SVG)
    console.log('\n[8] Validando segurança de Uploads (Magic Bytes, Áudio e XSS SVG)...');
    const fakePngForm = new FormData();
    fakePngForm.append('file', new Blob(['MZ_THIS_IS_NOT_A_PNG'], { type: 'image/png' }), 'malware.png');
    const fakePngRes = await fetch(`${BASE_URL}/api/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${opToken}` },
      body: fakePngForm,
    });
    assert(fakePngRes.status === 400, 'Upload de PNG falsificado é bloqueado pelos Magic Bytes (400)');

    const xssSvgForm = new FormData();
    xssSvgForm.append('file', new Blob(['<svg><script>alert(1)</script></svg>'], { type: 'image/svg+xml' }), 'xss.svg');
    const xssSvgRes = await fetch(`${BASE_URL}/api/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${opToken}` },
      body: xssSvgForm,
    });
    assert(xssSvgRes.status === 400, 'Upload de SVG contendo <script> é bloqueado (400)');

    const validPngBytes = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00]);
    const validPngForm = new FormData();
    validPngForm.append('file', new Blob([validPngBytes], { type: 'image/png' }), 'ok.png');
    const validPngRes = await fetch(`${BASE_URL}/api/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${opToken}` },
      body: validPngForm,
    });
    assert(validPngRes.status === 200, 'Upload de PNG legítimo com assinatura válida retorna 200');

    const validMp3Bytes = new Uint8Array([0x49, 0x44, 0x33, 0x03, 0x00, 0x00, 0x00, 0x00]); // ID3 header
    const validMp3Form = new FormData();
    validMp3Form.append('file', new Blob([validMp3Bytes], { type: 'audio/mpeg' }), 'theme.mp3');
    const validMp3Res = await fetch(`${BASE_URL}/api/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${opToken}` },
      body: validMp3Form,
    });
    const mp3Json = await validMp3Res.json();
    assert(validMp3Res.status === 200 && mp3Json.category === 'audio', 'Upload de áudio MP3 legítimo retorna 200 (category=audio)');

    // 9. Motor de Ranking Oficial Consolidado (6A)
    console.log('\n[9] Validando Motor de Ranking Oficial Consolidado (Milestone 6A)...');
    const currentEvtRes = await req('/api/events/current');
    const activeEventId = currentEvtRes.body?.id;
    const rankRes = await req(`/api/events/${encodeURIComponent(activeEventId)}/results`);
    assert(
      rankRes.status === 200 && rankRes.body?.eventId === activeEventId && Array.isArray(rankRes.body?.rankings),
      `GET /api/events/${activeEventId}/results retorna estrutura oficial de ranking`
    );

    const missingRankRes = await req('/api/events/evento-inexistente-xyz/results');
    assert(missingRankRes.status === 404, 'GET /api/events/:id/results para evento inexistente retorna 404');
  } finally {
    child.kill();
  }

  console.log('\n================================================================================');
  console.log(`RESULTADO 5H + 6A: ${passed} APROVADOS | ${failed} FALHAS`);
  console.log('================================================================================');
  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
