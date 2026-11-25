import { SOUND_CATALOG } from './soundCatalog.js';
import { SOUND_MAP } from './soundMap.js';

/**
 * Converte a biblioteca e os mappings persistidos no backend para o formato
 * consumido pelo AudioEngine, mantendo fallback seguro para o catálogo local.
 */
export function buildAudioConfigFromApi(libraryItems = [], mappings = []) {
    if (!Array.isArray(libraryItems) || libraryItems.length === 0) {
        return {
            catalog: { ...SOUND_CATALOG },
            soundMap: { ...SOUND_MAP },
            source: 'local-fallback'
        };
    }

    const catalog = {};
    for (const item of libraryItems) {
        if (!item || !item.key || item.isEnabled === false) continue;
        catalog[item.key] = {
            key: item.key,
            name: item.name,
            category: item.category,
            url: item.url,
            bus: (item.bus || 'sfx').toLowerCase(),
            defaultVolume: typeof item.defaultVolume === 'number' ? item.defaultVolume : 0.8,
            isLoop: Boolean(item.isLoop),
            offsetSeconds: typeof item.offsetSeconds === 'number' ? item.offsetSeconds : 0,
            durationSeconds: item.durationSeconds ?? null,
            packName: item.packName || 'default',
            isBuiltIn: Boolean(item.isBuiltIn)
        };
    }

    const soundMap = { ...SOUND_MAP };
    if (Array.isArray(mappings) && mappings.length > 0) {
        const touchedEvents = new Set();
        const grouped = new Map();
        for (const m of mappings) {
            if (!m || !m.eventKey) continue;
            touchedEvents.add(m.eventKey);
            if (!m.enabled || !m.soundIsEnabled) continue;
            if (!catalog[m.soundKey]) continue;
            if (!grouped.has(m.eventKey)) grouped.set(m.eventKey, []);
            grouped.get(m.eventKey).push(m);
        }

        for (const eventKey of touchedEvents) {
            const base = SOUND_MAP[eventKey] || {};
            const layers = grouped.get(eventKey);
            if (!layers || layers.length === 0) {
                soundMap[eventKey] = {
                    ...base,
                    assetKey: null,
                    layers: []
                };
                continue;
            }

            layers.sort((a, b) => (a.layerOrder ?? 0) - (b.layerOrder ?? 0));
            const primary = layers[0];
            const secondary = layers.slice(1);

            soundMap[eventKey] = {
                ...base,
                assetKey: primary.soundKey,
                volume: primary.volumeOverride ?? primary.soundDefaultVolume ?? base.volume ?? 0.8,
                layers: secondary.map((s) => ({
                    assetKey: s.soundKey,
                    volume: s.volumeOverride ?? s.soundDefaultVolume ?? 0.7
                }))
            };
        }
    }

    return {
        catalog,
        soundMap,
        source: 'backend'
    };
}

/**
 * Busca configuração de áudio do backend com fallback transparente para o catálogo local.
 */
export async function fetchAudioConfig({ apiBaseUrl = '', token = null, fetchImpl = globalThis.fetch } = {}) {
    if (typeof fetchImpl !== 'function') {
        return buildAudioConfigFromApi([], []);
    }

    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    try {
        const [libRes, mapRes] = await Promise.all([
            fetchImpl(`${apiBaseUrl}/api/audio/library?includeDisabled=false`, { headers }),
            fetchImpl(`${apiBaseUrl}/api/audio/mappings`, { headers })
        ]);

        if (!libRes.ok || !mapRes.ok) {
            return buildAudioConfigFromApi([], []);
        }

        const [libraryItems, mappings] = await Promise.all([libRes.json(), mapRes.json()]);
        return buildAudioConfigFromApi(libraryItems, mappings);
    } catch {
        return buildAudioConfigFromApi([], []);
    }
}
