const assert = require('assert');
const { spawn } = require('child_process');
const path = require('path');

const BASE_URL = process.env.ARENA_API_URL || 'http://127.0.0.1:5055';
const ADMIN_CREDS = { email: 'admin@arenavoice.local', password: process.env.ARENA_ADMIN_PASSWORD || 'ArenaAdmin@2026' };
const OPERATOR_CREDS = { email: 'operator@arenavoice.local', password: process.env.ARENA_OPERATOR_PASSWORD || 'ArenaOperator@2026' };
const VIEWER_CREDS = { email: 'viewer@arenavoice.local', password: process.env.ARENA_VIEWER_PASSWORD || 'ArenaViewer@2026' };

let passed = 0;
let failed = 0;

function test(name, fn) {
    return fn()
        .then(() => {
            console.log(`  [PASS] ${name}`);
            passed++;
        })
        .catch((err) => {
            console.error(`  [FAIL] ${name}: ${err.message}`);
            failed++;
        });
}

async function login(creds) {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(creds)
    });
    assert.strictEqual(res.status, 200, `Login failed for ${creds.email}: ${res.status}`);
    const data = await res.json();
    return data.accessToken || data.token;
}

async function run() {
    console.log('============================================================');
    console.log('  ARENA VOICE — VALIDAÇÃO FASE 5D.3 (SOUND LIBRARY BACKEND)');
    console.log('============================================================\n');

    const adminToken = await login(ADMIN_CREDS);
    const operatorToken = await login(OPERATOR_CREDS);
    const viewerToken = await login(VIEWER_CREDS);

    console.log('[1] Segurança & RBAC...');
    await test('GET /api/audio/library sem token retorna 401', async () => {
        const res = await fetch(`${BASE_URL}/api/audio/library`);
        assert.strictEqual(res.status, 401);
    });

    await test('GET /api/audio/mappings sem token retorna 401', async () => {
        const res = await fetch(`${BASE_URL}/api/audio/mappings`);
        assert.strictEqual(res.status, 401);
    });

    await test('Viewer pode consultar biblioteca e mappings (200)', async () => {
        const libRes = await fetch(`${BASE_URL}/api/audio/library`, {
            headers: { Authorization: `Bearer ${viewerToken}` }
        });
        const mapRes = await fetch(`${BASE_URL}/api/audio/mappings`, {
            headers: { Authorization: `Bearer ${viewerToken}` }
        });
        assert.strictEqual(libRes.status, 200);
        assert.strictEqual(mapRes.status, 200);
    });

    await test('Viewer não pode criar som (403)', async () => {
        const res = await fetch(`${BASE_URL}/api/audio/library`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${viewerToken}` },
            body: JSON.stringify({
                key: 'viewer-forbidden',
                name: 'Forbidden',
                category: 'ui',
                url: '/audio/ui/ui-sci-fi-click.mp3',
                bus: 'SFX'
            })
        });
        assert.strictEqual(res.status, 403);
    });

    console.log('\n[2] Seed Idempotente...');
    let library = [];
    await test('Biblioteca contém os 12 assets curados da 5D.1', async () => {
        const res = await fetch(`${BASE_URL}/api/audio/library`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        assert.strictEqual(res.status, 200);
        library = await res.json();
        const builtIn = library.filter((x) => x.isBuiltIn);
        assert.ok(builtIn.length >= 12, `Esperado >= 12 built-in, obtido ${builtIn.length}`);
    });

    await test('Mappings iniciais populados (>= 25)', async () => {
        const res = await fetch(`${BASE_URL}/api/audio/mappings`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        assert.strictEqual(res.status, 200);
        const mappings = await res.json();
        assert.ok(mappings.length >= 25, `Esperado >= 25 mappings, obtido ${mappings.length}`);
    });

    console.log('\n[3] CRUD, Validações e Desativação Segura...');
    const uniqueKey = `test-sfx-${Date.now()}`;
    let createdId = null;

    await test('Operator pode criar novo item na biblioteca (201)', async () => {
        const res = await fetch(`${BASE_URL}/api/audio/library`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${operatorToken}` },
            body: JSON.stringify({
                key: uniqueKey,
                name: 'Test SFX',
                description: 'Automated test sound',
                category: 'ui',
                url: '/audio/ui/ui-sci-fi-click.mp3',
                bus: 'SFX',
                defaultVolume: 0.75,
                isLoop: false,
                offsetSeconds: 0,
                durationSeconds: 0.5
            })
        });
        assert.strictEqual(res.status, 201);
        const created = await res.json();
        createdId = created.id;
        assert.strictEqual(created.key, uniqueKey);
        assert.strictEqual(created.isBuiltIn, false);
    });

    await test('Key duplicada retorna 409 Conflict', async () => {
        const res = await fetch(`${BASE_URL}/api/audio/library`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${operatorToken}` },
            body: JSON.stringify({
                key: uniqueKey,
                name: 'Duplicate',
                category: 'ui',
                url: '/audio/ui/ui-sci-fi-click.mp3',
                bus: 'SFX'
            })
        });
        assert.strictEqual(res.status, 409);
    });

    await test('URL fora de /audio/ ou com path traversal retorna 400', async () => {
        for (const badUrl of ['/etc/passwd', '../audio/a.mp3', 'https://evil.com/a.mp3', '/audio/../secret.mp3']) {
            const res = await fetch(`${BASE_URL}/api/audio/library`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${operatorToken}` },
                body: JSON.stringify({
                    key: `bad-url-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                    name: 'Bad URL',
                    category: 'ui',
                    url: badUrl,
                    bus: 'SFX'
                })
            });
            assert.strictEqual(res.status, 400, `Esperado 400 para ${badUrl}, obtido ${res.status}`);
        }
    });

    await test('Volume fora de [0,1] e offset negativo retornam 400', async () => {
        const res = await fetch(`${BASE_URL}/api/audio/library`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${operatorToken}` },
            body: JSON.stringify({
                key: `bad-vol-${Date.now()}`,
                name: 'Bad Vol',
                category: 'ui',
                url: '/audio/ui/ui-sci-fi-click.mp3',
                bus: 'SFX',
                defaultVolume: 1.5,
                offsetSeconds: -1
            })
        });
        assert.strictEqual(res.status, 400);
    });

    await test('Operator pode atualizar item (200)', async () => {
        const res = await fetch(`${BASE_URL}/api/audio/library/${createdId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${operatorToken}` },
            body: JSON.stringify({
                name: 'Test SFX Updated',
                description: 'Updated',
                category: 'stage',
                url: '/audio/stage/transition-dreamy.mp3',
                bus: 'SFX',
                defaultVolume: 0.6,
                isLoop: false,
                offsetSeconds: 0,
                durationSeconds: 1.0,
                packName: 'default',
                isEnabled: true
            })
        });
        assert.strictEqual(res.status, 200);
        const updated = await res.json();
        assert.strictEqual(updated.name, 'Test SFX Updated');
    });

    await test('Operator não pode desativar/deletar som (403)', async () => {
        const res = await fetch(`${BASE_URL}/api/audio/library/${createdId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${operatorToken}` }
        });
        assert.strictEqual(res.status, 403);
    });

    await test('Admin pode desativar som com segurança (200)', async () => {
        const res = await fetch(`${BASE_URL}/api/audio/library/${createdId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        assert.strictEqual(res.status, 200);
        const body = await res.json();
        assert.strictEqual(body.item.isEnabled, false);
    });

    await test('Ativar mapping para som desabilitado retorna 409', async () => {
        const res = await fetch(`${BASE_URL}/api/audio/mappings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${operatorToken}` },
            body: JSON.stringify({
                mappings: [{
                    eventKey: 'ui.click',
                    soundLibraryItemId: createdId,
                    layerOrder: 2,
                    enabled: true
                }]
            })
        });
        assert.strictEqual(res.status, 409);
    });

    await test('Evento inexistente em PUT /api/audio/mappings retorna 400', async () => {
        const clickSound = library.find((x) => x.key === 'ui-sci-fi-click');
        const res = await fetch(`${BASE_URL}/api/audio/mappings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${operatorToken}` },
            body: JSON.stringify({
                mappings: [{
                    eventKey: 'evento.inexistente',
                    soundLibraryItemId: clickSound.id,
                    layerOrder: 0,
                    enabled: true
                }]
            })
        });
        assert.strictEqual(res.status, 400);
    });

    console.log('\n[4] Contrato Frontend (audioConfigClient.js)...');
    await test('buildAudioConfigFromApi converte e faz fallback local com segurança', async () => {
        const { buildAudioConfigFromApi, fetchAudioConfig } = await import('../frontend/src/audio/audioConfigClient.js');
        const fallback = buildAudioConfigFromApi([], []);
        assert.strictEqual(fallback.source, 'local-fallback');
        assert.ok(fallback.catalog['ui-sci-fi-click']);

        const offline = await fetchAudioConfig({
            apiBaseUrl: 'http://127.0.0.1:59999',
            fetchImpl: async () => { throw new Error('Network down'); }
        });
        assert.strictEqual(offline.source, 'local-fallback');
    });

    console.log('\n============================================================');
    console.log(`RESULTADO 5D.3: ${passed} PASS | ${failed} FAIL`);
    console.log('============================================================');
    if (failed > 0) process.exit(1);
}

run().catch((err) => {
    console.error(err);
    process.exit(1);
});
