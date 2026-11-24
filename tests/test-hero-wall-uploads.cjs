/**
 * test-hero-wall-uploads.cjs
 * Validação de Upload de Ativos Visuais e Persistência de ProjectMedia (Phase 5C.2B).
 */

const { getDotnetExe, getNodeExe } = require('./tool-locator.cjs');
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://127.0.0.1:5000';
let passed = 0;
let failed = 0;

function pass(name) {
  passed++;
  console.log(`  [PASS] ${name}`);
}

function fail(name, details = '') {
  failed++;
  console.error(`  [FAIL] ${name}${details ? ` - ${details}` : ''}`);
}

function assert(cond, name, details = '') {
  if (cond) pass(name);
  else fail(name, details);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function pingBackend() {
  return new Promise((resolve) => {
    const req = http.get(`${BASE_URL}/api/status`, (res) => resolve(res.statusCode === 200));
    req.on('error', () => resolve(false));
    req.setTimeout(800, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function startBackendIfNeeded() {
  const isUp = await pingBackend();
  if (isUp) {
    console.log('[Setup] Backend já em execução em ' + BASE_URL);
    return null;
  }

  console.log('[Setup] Iniciando backend para os testes...');
  const dotnet = getDotnetExe();
  const backendDir = path.resolve(__dirname, '../backend');
  const proc = spawn(dotnet, ['run', '--no-build'], {
    cwd: backendDir,
    stdio: 'ignore',
    env: { ...process.env, ASPNETCORE_ENVIRONMENT: 'Development' },
  });

  for (let i = 0; i < 40; i++) {
    await sleep(500);
    if (await pingBackend()) {
      console.log('[Setup] Backend online e responsivo.');
      return proc;
    }
  }
  throw new Error('Timeout ao iniciar o backend.');
}

async function run() {
  console.log('\n======================================================');
  console.log('  PHASE 5C.2B - UPLOAD DE MÍDIA & HERO WALL OCCUPANCY ');
  console.log('======================================================\n');

  let proc = null;
  try {
    proc = await startBackendIfNeeded();

    // 1. Teste de rejeição de formato inválido
    console.log('[1] Validação de Tipos de Arquivo (POST /api/upload)');
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    
    // Teste 1.1: Enviar arquivo .exe (deve rejeitar 400)
    let body = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="test.exe"\r\nContent-Type: application/octet-stream\r\n\r\nfake-exe-content\r\n--${boundary}--\r\n`;
    let res = await fetch(`${BASE_URL}/api/upload`, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
      body,
    });
    assert(res.status === 400, 'POST /api/upload rejeita .exe com HTTP 400', `Status: ${res.status}`);

    // Teste 1.2: Enviar arquivo .png (deve aceitar 200)
    body = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="test-mockup.png"\r\nContent-Type: image/png\r\n\r\nfake-png-content-data\r\n--${boundary}--\r\n`;
    res = await fetch(`${BASE_URL}/api/upload`, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
      body,
    });
    assert(res.status === 200, 'POST /api/upload aceita .png com HTTP 200', `Status: ${res.status}`);
    const json = await res.json();
    assert(json.url && json.url.startsWith('/uploads/'), 'Retorna URL com prefixo /uploads/', json.url);
    assert(json.fileName === 'test-mockup.png', 'Preserva nome do arquivo original', json.fileName);

    // Teste 1.3: Download estático da imagem enviada
    const getUploaded = await fetch(`${BASE_URL}${json.url}`);
    assert(getUploaded.status === 200, 'Arquivo estático servido com HTTP 200 via /uploads/*', `Status: ${getUploaded.status}`);

    // 2. Teste de Criação de Projeto com Mídia e Itens de Galeria
    console.log('\n[2] Criação de Projeto com ProjectMedia & Gallery Items');
    const createProjectPayload = {
      title: 'EcoLog Test Project',
      pitchLeader: 'Lucas Rocha',
      track: 'Sustentabilidade',
      description: 'Rastreabilidade para um futuro sustentável',
      orderIndex: 99,
      logoUrl: json.url,
      coverImageUrl: json.url,
      mediaItems: [
        { id: 'item-1', type: 'image', url: json.url, order: 1 },
        { id: 'item-2', type: 'image', url: '/samples/ecolog-cover.png', order: 2 },
      ],
    };

    const projRes = await fetch(`${BASE_URL}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createProjectPayload),
    });
    assert(projRes.status === 201, 'POST /api/projects cria projeto com HTTP 201', `Status: ${projRes.status}`);
    const createdProject = await projRes.json();
    assert(createdProject.media?.logoUrl === json.url, 'LogoUrl persistida corretamente no Project.Media');
    assert(createdProject.media?.coverImageUrl === json.url, 'CoverImageUrl persistida corretamente no Project.Media');
    assert(
      Array.isArray(createdProject.media?.items) && createdProject.media.items.length === 2,
      'Project.Media.Items preserva array de mídias para slideshow',
      `Tamanho: ${createdProject.media?.items?.length}`
    );

    // 3. Atualização de Mídia no Projeto Existente
    console.log('\n[3] Atualização de Projeto (PUT /api/projects/{id})');
    const updateRes = await fetch(`${BASE_URL}/api/projects/${createdProject.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: 'Tese de inovação sustentável atualizada',
        mediaItems: [
          { id: 'item-1', type: 'image', url: json.url, order: 1 }
        ]
      }),
    });
    assert(updateRes.status === 200, 'PUT /api/projects/{id} atualiza com HTTP 200');
    const updated = await updateRes.json();
    assert(updated.description === 'Tese de inovação sustentável atualizada', 'Descrição atualizada');
    assert(updated.media?.items?.length === 1, 'Itens de galeria atualizados');

    // Limpeza
    await fetch(`${BASE_URL}/api/projects/${createdProject.id}`, { method: 'DELETE' });
    console.log('\n[Cleanup] Projeto de teste removido.');

  } catch (err) {
    fail('Erro crítico na execução dos testes', err.message);
  } finally {
    if (proc) {
      console.log('[Teardown] Encerrando backend auxiliar...');
      proc.kill();
    }
  }

  console.log('\n------------------------------------------------------');
  console.log(`TOTAL: ${passed + failed} | PASSOU: ${passed} | FALHOU: ${failed}`);
  console.log('------------------------------------------------------\n');
  process.exit(failed > 0 ? 1 : 0);
}

run();
