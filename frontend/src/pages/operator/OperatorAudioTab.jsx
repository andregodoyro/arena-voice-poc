import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Music,
  Volume2,
  Plus,
  Search,
  Edit2,
  PowerOff,
  Play,
  Square,
  Sliders,
  Save,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Radio,
  ShieldCheck,
} from 'lucide-react';
import { audioApi } from '../../api/audioApi';
import { useAuth } from '../../contexts/AuthContext';
import { SOUND_EVENTS } from '../../audio/soundMap';
import { audioEventSubscriber } from '../../audio/AudioEventSubscriber';
import { EXPERIENCE_EVENTS } from '../../services/experienceEventBus';
import { useExperienceEventBus } from '../../hooks/useExperienceEventBus';
import { SoundItemModal } from '../../components/operator/SoundItemModal';
import { ConfirmDialog } from '../../components/operator/ConfirmDialog';

const ALL_EVENT_KEYS = Object.values(SOUND_EVENTS);

/**
 * OperatorAudioTab — Cockpit Audio Management UI (/operator/audio) (Fase 5D.4).
 *
 * Gerencia a Sound Library e o Event Sound Mapping Editor usando a API 5D.3,
 * com preview isolado de áudio, sincronização SignalR em tempo real e RBAC.
 */
export function OperatorAudioTab() {
  const { user } = useAuth();
  const role = user?.role || 'Viewer';
  const canEdit = role === 'Admin' || role === 'Operator';
  const canDeactivate = role === 'Admin';

  const [activeSection, setActiveSection] = useState('library'); // 'library' | 'mappings'
  const [library, setLibrary] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [draftMappings, setDraftMappings] = useState([]);
  const [isMappingsDirty, setIsMappingsDirty] = useState(false);

  const [loading, setLoading] = useState(true);
  const [savingMappings, setSavingMappings] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [remoteUpdatePending, setRemoteUpdatePending] = useState(false);

  // Filtros da Library
  const [searchQuery, setSearchQuery] = useState('');
  const [busFilter, setBusFilter] = useState('ALL');
  const [packFilter, setPackFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Filtro de Eventos
  const [eventSearch, setEventSearch] = useState('');

  // Modal Create/Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isSubmittingItem, setIsSubmittingItem] = useState(false);

  // Confirm Deactivation
  const [confirmDeactivate, setConfirmDeactivate] = useState(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  // Isolated Preview Player (nunca interfere no AudioEngine do show)
  const previewAudioRef = useRef(null);
  const previewTimerRef = useRef(null);
  const [previewingId, setPreviewingId] = useState(null);
  const [previewVolume, setPreviewVolume] = useState(0.75);

  const stopPreview = useCallback(() => {
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      try { previewAudioRef.current.currentTime = 0; } catch { /* ignore */ }
      previewAudioRef.current = null;
    }
    setPreviewingId(null);
  }, []);

  useEffect(() => {
    return () => stopPreview();
  }, [stopPreview]);

  useEffect(() => {
    if (previewAudioRef.current) {
      previewAudioRef.current.volume = previewVolume;
    }
  }, [previewVolume]);

  const togglePreview = (item) => {
    if (previewingId === item.id) {
      stopPreview();
      return;
    }
    stopPreview();
    try {
      const audio = new Audio(item.url);
      audio.volume = previewVolume;
      if (item.offsetSeconds > 0) {
        audio.addEventListener('loadedmetadata', () => {
          try { audio.currentTime = item.offsetSeconds; } catch { /* ignore */ }
        }, { once: true });
      }
      audio.onended = () => {
        stopPreview();
      };
      audio.onerror = () => {
        stopPreview();
        setFeedback({ type: 'error', message: `Não foi possível reproduzir preview de '${item.url}'.` });
      };
      previewAudioRef.current = audio;
      setPreviewingId(item.id);
      if (item.durationSeconds > 0) {
        previewTimerRef.current = setTimeout(() => stopPreview(), item.durationSeconds * 1000);
      }
      audio.play().catch((err) => {
        stopPreview();
        setFeedback({ type: 'error', message: `Preview bloqueado pelo navegador: ${err.message}` });
      });
    } catch (err) {
      stopPreview();
      setFeedback({ type: 'error', message: `Erro ao iniciar preview: ${err.message}` });
    }
  };

  const loadAudioData = useCallback(async () => {
    setLoading(true);
    try {
      const [libData, mapData] = await Promise.all([
        audioApi.getLibrary(true),
        audioApi.getMappings(),
      ]);
      const libList = Array.isArray(libData) ? libData : [];
      const mapList = Array.isArray(mapData) ? mapData : [];
      setLibrary(libList);
      setMappings(mapList);
      setDraftMappings(mapList.map((m) => ({ ...m })));
      setIsMappingsDirty(false);
      setRemoteUpdatePending(false);
      audioEventSubscriber.setConfigFromApi(libList, mapList);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Erro ao carregar biblioteca e mappings de áudio.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAudioData();
  }, [loadAudioData]);

  // Real-time sync via SignalR (AudioConfigUpdated -> ExperienceEventBus)
  useExperienceEventBus({
    [EXPERIENCE_EVENTS.AUDIO_CONFIG_UPDATED]: () => {
      if (isMappingsDirty || isModalOpen) {
        setRemoteUpdatePending(true);
      } else {
        loadAudioData();
      }
    },
  });

  // ── Library Filters ────────────────────────────────────────────────────────
  const availablePacks = useMemo(() => {
    const packs = new Set(library.map((i) => i.packName || 'default'));
    return ['ALL', ...Array.from(packs)];
  }, [library]);

  const filteredLibrary = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return library.filter((item) => {
      if (busFilter !== 'ALL' && item.bus !== busFilter) return false;
      if (packFilter !== 'ALL' && (item.packName || 'default') !== packFilter) return false;
      if (statusFilter === 'ENABLED' && !item.isEnabled) return false;
      if (statusFilter === 'DISABLED' && item.isEnabled) return false;
      if (q) {
        const matchName = item.name?.toLowerCase().includes(q);
        const matchKey = item.key?.toLowerCase().includes(q);
        const matchCat = item.category?.toLowerCase().includes(q);
        if (!matchName && !matchKey && !matchCat) return false;
      }
      return true;
    });
  }, [library, searchQuery, busFilter, packFilter, statusFilter]);

  const enabledLibraryItems = useMemo(
    () => library.filter((i) => i.isEnabled),
    [library]
  );

  // ── Library CRUD Handlers ─────────────────────────────────────────────────
  const handleSaveItem = async (payload) => {
    setIsSubmittingItem(true);
    try {
      if (editingItem) {
        await audioApi.updateLibraryItem(editingItem.id, payload);
        setFeedback({ type: 'success', message: `Som '${payload.name}' atualizado.` });
      } else {
        await audioApi.createLibraryItem(payload);
        setFeedback({ type: 'success', message: `Som '${payload.name}' criado na biblioteca.` });
      }
      setIsModalOpen(false);
      setEditingItem(null);
      await loadAudioData();
    } finally {
      setIsSubmittingItem(false);
    }
  };

  const handleConfirmDeactivate = async () => {
    if (!confirmDeactivate) return;
    setIsDeactivating(true);
    try {
      await audioApi.deactivateLibraryItem(confirmDeactivate.id);
      setFeedback({
        type: 'success',
        message: `Som '${confirmDeactivate.name}' desativado com segurança.`,
      });
      setConfirmDeactivate(null);
      await loadAudioData();
    } catch (err) {
      setFeedback({ type: 'error', message: err?.message || 'Falha ao desativar som.' });
    } finally {
      setIsDeactivating(false);
    }
  };

  // ── Mapping Editor Helpers ────────────────────────────────────────────────
  const mappingsByEvent = useMemo(() => {
    const grouped = {};
    for (const key of ALL_EVENT_KEYS) {
      grouped[key] = [];
    }
    for (const m of draftMappings) {
      if (!grouped[m.eventKey]) grouped[m.eventKey] = [];
      grouped[m.eventKey].push(m);
    }
    for (const key of Object.keys(grouped)) {
      grouped[key].sort((a, b) => (a.layerOrder ?? 0) - (b.layerOrder ?? 0));
    }
    return grouped;
  }, [draftMappings]);

  const filteredEventKeys = useMemo(() => {
    const q = eventSearch.toLowerCase().trim();
    if (!q) return ALL_EVENT_KEYS;
    return ALL_EVENT_KEYS.filter((k) => k.toLowerCase().includes(q));
  }, [eventSearch]);

  const handleAddMapping = (eventKey, soundLibraryItemId) => {
    if (!soundLibraryItemId) return;
    const sound = library.find((s) => s.id === soundLibraryItemId);
    if (!sound || !sound.isEnabled) {
      setFeedback({ type: 'error', message: 'Selecione um som ativo da biblioteca.' });
      return;
    }

    const exists = draftMappings.some(
      (m) => m.eventKey === eventKey && m.soundLibraryItemId === soundLibraryItemId
    );
    if (exists) {
      setFeedback({ type: 'error', message: `O som '${sound.name}' já está vinculado a '${eventKey}'.` });
      return;
    }

    const currentLayers = mappingsByEvent[eventKey] || [];
    const nextOrder = currentLayers.length > 0
      ? Math.max(...currentLayers.map((l) => l.layerOrder ?? 0)) + 1
      : 0;

    setDraftMappings((prev) => [
      ...prev,
      {
        id: `temp-${Date.now()}-${Math.random()}`,
        eventKey,
        soundLibraryItemId: sound.id,
        soundKey: sound.key,
        soundName: sound.name,
        soundUrl: sound.url,
        soundBus: sound.bus,
        soundDefaultVolume: sound.defaultVolume,
        soundIsEnabled: sound.isEnabled,
        layerOrder: nextOrder,
        enabled: true,
        volumeOverride: null,
      },
    ]);
    setIsMappingsDirty(true);
  };

  const handleUpdateMappingField = (eventKey, soundLibraryItemId, patch) => {
    setDraftMappings((prev) =>
      prev.map((m) =>
        m.eventKey === eventKey && m.soundLibraryItemId === soundLibraryItemId
          ? { ...m, ...patch }
          : m
      )
    );
    setIsMappingsDirty(true);
  };

  const handleMoveLayer = (eventKey, soundLibraryItemId, direction) => {
    const layers = [...(mappingsByEvent[eventKey] || [])];
    const idx = layers.findIndex((m) => m.soundLibraryItemId === soundLibraryItemId);
    const targetIdx = idx + direction;
    if (idx < 0 || targetIdx < 0 || targetIdx >= layers.length) return;

    const current = layers[idx];
    const swap = layers[targetIdx];
    const currentOrder = current.layerOrder;
    const swapOrder = swap.layerOrder;

    setDraftMappings((prev) =>
      prev.map((m) => {
        if (m.eventKey === eventKey && m.soundLibraryItemId === current.soundLibraryItemId) {
          return { ...m, layerOrder: swapOrder === currentOrder ? targetIdx : swapOrder };
        }
        if (m.eventKey === eventKey && m.soundLibraryItemId === swap.soundLibraryItemId) {
          return { ...m, layerOrder: currentOrder === swapOrder ? idx : currentOrder };
        }
        return m;
      })
    );
    setIsMappingsDirty(true);
  };

  const handleRemoveMapping = (eventKey, soundLibraryItemId) => {
    setDraftMappings((prev) =>
      prev.filter((m) => !(m.eventKey === eventKey && m.soundLibraryItemId === soundLibraryItemId))
    );
    setIsMappingsDirty(true);
  };

  const handleSaveMappings = async () => {
    if (draftMappings.length === 0) {
      setFeedback({ type: 'error', message: 'A lista de mappings não pode ficar vazia.' });
      return;
    }

    for (const m of draftMappings) {
      if (m.volumeOverride !== '' && m.volumeOverride !== null && m.volumeOverride !== undefined) {
        const vol = Number(m.volumeOverride);
        if (Number.isNaN(vol) || vol < 0 || vol > 1) {
          setFeedback({ type: 'error', message: `VolumeOverride inválido em '${m.eventKey}' (${m.soundName}). Deve estar entre 0 e 1.` });
          return;
        }
      }
    }

    setSavingMappings(true);
    try {
      const payload = draftMappings.map((m) => ({
        eventKey: m.eventKey,
        soundLibraryItemId: m.soundLibraryItemId,
        layerOrder: Number(m.layerOrder ?? 0),
        enabled: Boolean(m.enabled),
        volumeOverride:
          m.volumeOverride === '' || m.volumeOverride === null || m.volumeOverride === undefined
            ? null
            : Number(m.volumeOverride),
      }));
      await audioApi.updateMappings(payload);
      setFeedback({ type: 'success', message: 'Event Sound Mappings salvos e sincronizados via SignalR.' });
      await loadAudioData();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Erro ao salvar mappings de eventos.',
      });
    } finally {
      setSavingMappings(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white/[0.02] border border-white/10 rounded-2xl p-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <Music className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Audio & Soundscape Control Center
              </h2>
              <p className="text-xs text-gray-400">
                Gerenciamento da Sound Library persistida e vínculos com eventos do ExperienceEventBus
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Preview Volume */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/40 border border-white/10">
            <Volume2 className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-[11px] text-gray-400">Preview</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={previewVolume}
              onChange={(e) => setPreviewVolume(parseFloat(e.target.value))}
              className="w-20 accent-red-500"
            />
          </div>

          {/* Role badge */}
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold bg-white/5 border border-white/10 text-gray-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Perfil: {role}
          </span>

          <button
            type="button"
            onClick={loadAudioData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Remote Sync Banner */}
      {remoteUpdatePending && (
        <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">
          <div className="flex items-center gap-2.5">
            <Radio className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>
              Outro operador atualizou a configuração de áudio via SignalR. Suas edições locais ainda não salvas foram preservadas.
            </span>
          </div>
          <button
            type="button"
            onClick={loadAudioData}
            className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-100 font-semibold shrink-0"
          >
            Recarregar da API
          </button>
        </div>
      )}

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`flex items-center justify-between gap-3 p-3.5 rounded-xl border text-xs ${
            feedback.type === 'error'
              ? 'bg-red-500/10 border-red-500/30 text-red-300'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs opacity-70 hover:opacity-100"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Sub-navigation */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        <button
          type="button"
          onClick={() => setActiveSection('library')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all border ${
            activeSection === 'library'
              ? 'bg-red-950/50 border-red-500/50 text-white'
              : 'bg-white/[0.03] border-white/5 text-gray-400 hover:text-white'
          }`}
        >
          <Volume2 className="w-4 h-4" />
          Sound Library ({library.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('mappings')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all border ${
            activeSection === 'mappings'
              ? 'bg-red-950/50 border-red-500/50 text-white'
              : 'bg-white/[0.03] border-white/5 text-gray-400 hover:text-white'
          }`}
        >
          <Sliders className="w-4 h-4" />
          Event Sound Mappings ({draftMappings.length})
          {isMappingsDirty && (
            <span className="w-2 h-2 rounded-full bg-amber-400" title="Alterações não salvas" />
          )}
        </button>
      </div>

      {/* SECTION 1: SOUND LIBRARY */}
      {activeSection === 'library' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3 justify-between">
            <div className="flex flex-wrap items-center gap-2.5 flex-1">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nome, key ou categoria..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-red-500/50"
                />
              </div>

              <select
                value={busFilter}
                onChange={(e) => setBusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-gray-200"
              >
                <option value="ALL">Todos os Buses</option>
                <option value="SFX">SFX</option>
                <option value="Ambient">Ambient</option>
                <option value="Music">Music</option>
              </select>

              <select
                value={packFilter}
                onChange={(e) => setPackFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-gray-200"
              >
                {availablePacks.map((p) => (
                  <option key={p} value={p}>
                    {p === 'ALL' ? 'Todos os Packs' : `Pack: ${p}`}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-gray-200"
              >
                <option value="ALL">Todos os Status</option>
                <option value="ENABLED">Ativos</option>
                <option value="DISABLED">Desativados</option>
              </select>
            </div>

            {canEdit && (
              <button
                type="button"
                onClick={() => {
                  setEditingItem(null);
                  setIsModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-500 text-white transition-colors shrink-0"
              >
                <Plus className="w-4 h-4" />
                Novo Asset
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400 text-xs gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Carregando Sound Library...
            </div>
          ) : filteredLibrary.length === 0 ? (
            <div className="text-center py-14 border border-dashed border-white/10 rounded-2xl text-xs text-gray-400">
              Nenhum asset encontrado com os filtros atuais.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredLibrary.map((item) => {
                const isPreviewing = previewingId === item.id;
                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl border p-4 space-y-3 transition-colors ${
                      item.isEnabled
                        ? 'bg-white/[0.02] border-white/10 hover:border-white/20'
                        : 'bg-black/30 border-white/5 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-semibold text-white truncate">{item.name}</h3>
                          {item.isBuiltIn && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/25">
                              Built-in
                            </span>
                          )}
                          {!item.isEnabled && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/15 text-red-300 border border-red-500/25">
                              Desativado
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] font-mono text-gray-400 truncate mt-0.5">
                          {item.key}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => togglePreview(item)}
                        title={isPreviewing ? 'Parar preview' : 'Reproduzir preview'}
                        className={`p-2 rounded-xl border transition-colors shrink-0 ${
                          isPreviewing
                            ? 'bg-red-600 border-red-500 text-white'
                            : 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-300'
                        }`}
                      >
                        {isPreviewing ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {item.description && (
                      <p className="text-xs text-gray-400 line-clamp-2">{item.description}</p>
                    )}

                    <div className="text-[11px] font-mono text-gray-500 truncate bg-black/30 px-2.5 py-1.5 rounded-lg border border-white/5">
                      {item.url}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                      <span className="px-2 py-0.5 rounded-md bg-white/5 text-gray-300 border border-white/10">
                        Bus: {item.bus}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-white/5 text-gray-300 border border-white/10">
                        Cat: {item.category}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-white/5 text-gray-300 border border-white/10">
                        Vol: {Math.round((item.defaultVolume ?? 0.8) * 100)}%
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-white/5 text-gray-300 border border-white/10">
                        {item.isLoop ? 'Loop' : 'One-shot'}
                      </span>
                      {item.durationSeconds && (
                        <span className="px-2 py-0.5 rounded-md bg-white/5 text-gray-300 border border-white/10">
                          {item.durationSeconds}s
                        </span>
                      )}
                    </div>

                    {(canEdit || canDeactivate) && (
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingItem(item);
                              setIsModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10"
                          >
                            <Edit2 className="w-3 h-3" />
                            Editar
                          </button>
                        )}
                        {canDeactivate && item.isEnabled && (
                          <button
                            type="button"
                            onClick={() => setConfirmDeactivate(item)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/25"
                          >
                            <PowerOff className="w-3 h-3" />
                            Desativar
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: EVENT SOUND MAPPING EDITOR */}
      {activeSection === 'mappings' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={eventSearch}
                onChange={(e) => setEventSearch(e.target.value)}
                placeholder="Filtrar EventKey (ex: stage.chair_turn)..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-red-500/50"
              />
            </div>

            {canEdit && (
              <div className="flex items-center gap-2.5">
                {isMappingsDirty && (
                  <button
                    type="button"
                    onClick={() => {
                      setDraftMappings(mappings.map((m) => ({ ...m })));
                      setIsMappingsDirty(false);
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300"
                  >
                    Descartar
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSaveMappings}
                  disabled={!isMappingsDirty || savingMappings}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-500 text-white transition-colors disabled:opacity-40"
                >
                  {savingMappings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Salvar Mappings
                </button>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {filteredEventKeys.map((eventKey) => {
              const layers = mappingsByEvent[eventKey] || [];
              return (
                <div
                  key={eventKey}
                  className="rounded-2xl bg-white/[0.02] border border-white/10 p-4 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-xs font-mono font-semibold text-red-300">
                        {eventKey}
                      </span>
                      <span className="text-[11px] text-gray-400">
                        {layers.length} {layers.length === 1 ? 'som vinculado' : 'sons vinculados'}
                      </span>
                    </div>

                    {canEdit && (
                      <select
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAddMapping(eventKey, e.target.value);
                            e.target.value = '';
                          }
                        }}
                        className="px-3 py-1.5 rounded-xl bg-black/50 border border-white/10 text-xs text-gray-200 max-w-xs"
                      >
                        <option value="">+ Vincular som da biblioteca...</option>
                        {enabledLibraryItems.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.bus})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {layers.length === 0 ? (
                    <p className="text-[11px] text-gray-500 italic">
                      Nenhum asset vinculado (fallback procedural ou silencioso).
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {layers.map((layer, index) => {
                        const isSoundDisabled = !layer.soundIsEnabled;
                        return (
                          <div
                            key={`${layer.eventKey}-${layer.soundLibraryItemId}`}
                            className={`flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-xl border ${
                              layer.enabled && !isSoundDisabled
                                ? 'bg-black/35 border-white/10'
                                : 'bg-black/20 border-white/5 opacity-60'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="px-2 py-0.5 rounded bg-white/5 text-[10px] font-mono text-gray-400">
                                L{layer.layerOrder ?? index}
                              </span>
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-white truncate">
                                  {layer.soundName}
                                  {isSoundDisabled && (
                                    <span className="ml-2 text-[10px] text-red-400">
                                      (Asset Desabilitado)
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] font-mono text-gray-500 truncate">
                                  {layer.soundKey} · {layer.soundBus} · Efetivo: {Math.round(((layer.volumeOverride ?? layer.soundDefaultVolume ?? 0.8)) * 100)}%
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                              <label className="flex items-center gap-1.5 text-[11px] text-gray-300">
                                <span>Vol:</span>
                                <input
                                  type="number"
                                  min="0"
                                  max="1"
                                  step="0.05"
                                  disabled={!canEdit}
                                  placeholder={`${layer.soundDefaultVolume ?? 0.8}`}
                                  value={layer.volumeOverride ?? ''}
                                  onChange={(e) =>
                                    handleUpdateMappingField(
                                      layer.eventKey,
                                      layer.soundLibraryItemId,
                                      {
                                        volumeOverride:
                                          e.target.value === '' ? null : parseFloat(e.target.value),
                                      }
                                    )
                                  }
                                  className="w-16 px-2 py-1 rounded-lg bg-black/50 border border-white/10 text-xs text-white"
                                />
                              </label>

                              <label className="inline-flex items-center gap-1.5 text-[11px] text-gray-300 cursor-pointer">
                                <input
                                  type="checkbox"
                                  disabled={!canEdit || isSoundDisabled}
                                  checked={Boolean(layer.enabled)}
                                  onChange={(e) =>
                                    handleUpdateMappingField(
                                      layer.eventKey,
                                      layer.soundLibraryItemId,
                                      { enabled: e.target.checked }
                                    )
                                  }
                                  className="rounded accent-red-500"
                                />
                                Ativo
                              </label>

                              {canEdit && (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    disabled={index === 0}
                                    onClick={() =>
                                      handleMoveLayer(layer.eventKey, layer.soundLibraryItemId, -1)
                                    }
                                    className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 disabled:opacity-30"
                                    title="Subir prioridade de layer"
                                  >
                                    <ArrowUp className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={index === layers.length - 1}
                                    onClick={() =>
                                      handleMoveLayer(layer.eventKey, layer.soundLibraryItemId, 1)
                                    }
                                    className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 disabled:opacity-30"
                                    title="Descer prioridade de layer"
                                  >
                                    <ArrowDown className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleRemoveMapping(layer.eventKey, layer.soundLibraryItemId)
                                    }
                                    className="p-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300"
                                    title="Remover vínculo"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal Create/Edit Asset */}
      <SoundItemModal
        isOpen={isModalOpen}
        editingItem={editingItem}
        isSubmitting={isSubmittingItem}
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
        }}
        onSave={handleSaveItem}
      />

      {/* Confirm Deactivation */}
      <ConfirmDialog
        isOpen={Boolean(confirmDeactivate)}
        title="Desativar Som da Biblioteca"
        message={`Deseja desativar '${confirmDeactivate?.name}'? Todos os mappings vinculados a este som serão desabilitados com segurança sem perda de histórico.`}
        confirmLabel="Desativar"
        isDestructive
        isLoading={isDeactivating}
        onConfirm={handleConfirmDeactivate}
        onCancel={() => setConfirmDeactivate(null)}
      />
    </div>
  );
}

export default OperatorAudioTab;
