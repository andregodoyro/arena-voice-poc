/**
 * test-sound-map.cjs — Validação automatizada da Fase 5D.1 (Curadoria & Sound Map)
 * Verifica:
 * - Integridade de SOUND_CATALOG e SOUND_MAP (ESM import dinâmico)
 * - Existência física de todos os arquivos em frontend/public/audio/
 * - Ausência de assets descartados no diretório público
 * - Consistência de referências soundId / secondarySoundId / fallbackSynth
 */

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

let pass = 0;
let fail = 0;

function assert(cond, msg) {
  if (cond) {
    pass++;
    console.log(`  [PASS] ${msg}`);
  } else {
    fail++;
    console.error(`  [FAIL] ${msg}`);
    process.exitCode = 1;
  }
}

async function run() {
  console.log('============================================================');
  console.log('  ARENA VOICE — VALIDAÇÃO FASE 5D.1 (SOUND CATALOG & MAP)');
  console.log('============================================================\n');

  const rootDir = path.resolve(__dirname, '..');
  const publicAudioDir = path.join(rootDir, 'frontend', 'public', 'audio');
  const catalogPath = pathToFileURL(path.join(rootDir, 'frontend', 'src', 'audio', 'soundCatalog.js')).href;
  const mapPath = pathToFileURL(path.join(rootDir, 'frontend', 'src', 'audio', 'soundMap.js')).href;
  const audioEngineSrc = fs.readFileSync(path.join(rootDir, 'frontend', 'src', 'audio', 'AudioEngine.js'), 'utf8');

  const { SOUND_CATALOG, SOUND_CATALOG_LIST } = await import(catalogPath);
  const { SOUND_EVENTS, SOUND_MAP, resolveEventAssets } = await import(mapPath);

  assert(SOUND_CATALOG_LIST.length === 12, `Catálogo contém exatamente 12 assets curados (atual: ${SOUND_CATALOG_LIST.length})`);

  // 1. Verificar existência física de cada asset no diretório público
  for (const entry of SOUND_CATALOG_LIST) {
    assert(entry.url.startsWith('/audio/'), `URL padronizada para ${entry.id}: ${entry.url}`);
    const rel = entry.url.replace(/^\/audio\//, '');
    const fullPath = path.join(publicAudioDir, rel);
    const exists = fs.existsSync(fullPath);
    const size = exists ? fs.statSync(fullPath).size : 0;
    assert(exists && size > 1000, `Arquivo físico existe e não está vazio: ${rel} (${size} bytes)`);
  }

  // 2. Verificar que arquivos descartados não foram copiados
  const allPublicFiles = [];
  (function walk(dir) {
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, item.name);
      if (item.isDirectory()) walk(p);
      else allPublicFiles.push(item.name);
    }
  })(publicAudioDir);

  const forbiddenPatterns = ['christmas', 'carnival', 'samba', 'losing-horn', 'car-wash'];
  for (const pat of forbiddenPatterns) {
    assert(!allPublicFiles.some((f) => f.includes(pat)), `Asset descartado '${pat}' não presente em frontend/public/audio/`);
  }

  // 3. Verificar integridade do SOUND_MAP
  const eventValues = Object.values(SOUND_EVENTS);
  assert(eventValues.length >= 20, `SOUND_EVENTS cobre todos os contextos (${eventValues.length} eventos)`);

  for (const evKey of eventValues) {
    const mapping = SOUND_MAP[evKey];
    assert(Boolean(mapping), `Evento '${evKey}' possui entrada no SOUND_MAP`);
    if (!mapping) continue;

    if (mapping.soundId) {
      assert(Boolean(SOUND_CATALOG[mapping.soundId]), `soundId '${mapping.soundId}' existe no catálogo (${evKey})`);
    } else {
      assert(Boolean(mapping.missingAssetHint), `Evento sem asset '${evKey}' documenta missingAssetHint`);
    }

    if (mapping.secondarySoundId) {
      assert(Boolean(SOUND_CATALOG[mapping.secondarySoundId]), `secondarySoundId '${mapping.secondarySoundId}' existe no catálogo (${evKey})`);
    }

    if (mapping.fallbackSynth) {
      assert(audioEngineSrc.includes(`${mapping.fallbackSynth}(`), `Fallback '${mapping.fallbackSynth}' preservado em AudioEngine.js`);
    }

    const resolved = resolveEventAssets(evKey);
    assert(resolved !== null && resolved.mapping.eventKey === evKey, `resolveEventAssets('${evKey}') retorna estrutura válida`);
  }

  console.log('\n============================================================');
  console.log(`RESULTADO 5D.1: ${pass} PASS | ${fail} FAIL`);
  console.log('============================================================');
}

run().catch((err) => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
