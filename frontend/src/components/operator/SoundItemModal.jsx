import React, { useEffect, useState } from 'react';
import { X, Volume2, Loader2, AlertCircle } from 'lucide-react';

const KEY_REGEX = /^[a-z0-9][a-z0-9-_]{1,98}$/;

const EMPTY_FORM = {
  key: '',
  name: '',
  description: '',
  category: 'ui',
  bus: 'SFX',
  url: '/audio/ui/',
  defaultVolume: 0.8,
  isLoop: false,
  offsetSeconds: 0,
  durationSeconds: '',
  packName: 'default',
  isEnabled: true,
};

export function SoundItemModal({ isOpen, editingItem, isSubmitting, onClose, onSave }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    if (editingItem) {
      setForm({
        key: editingItem.key || '',
        name: editingItem.name || '',
        description: editingItem.description || '',
        category: editingItem.category || 'ui',
        bus: editingItem.bus || 'SFX',
        url: editingItem.url || '/audio/',
        defaultVolume: typeof editingItem.defaultVolume === 'number' ? editingItem.defaultVolume : 0.8,
        isLoop: Boolean(editingItem.isLoop),
        offsetSeconds: typeof editingItem.offsetSeconds === 'number' ? editingItem.offsetSeconds : 0,
        durationSeconds: editingItem.durationSeconds ?? '',
        packName: editingItem.packName || 'default',
        isEnabled: editingItem.isEnabled !== false,
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [isOpen, editingItem]);

  if (!isOpen) return null;

  const isEdit = Boolean(editingItem);

  const validate = () => {
    const cleanKey = form.key.trim().toLowerCase();
    if (!isEdit && !KEY_REGEX.test(cleanKey)) {
      return 'Key inválida. Use letras minúsculas, números, "-" ou "_" (2 a 100 caracteres).';
    }
    if (!form.name.trim() || form.name.trim().length > 150) {
      return 'Nome é obrigatório e deve ter até 150 caracteres.';
    }
    const cleanUrl = form.url.trim();
    if (
      !cleanUrl.startsWith('/audio/') ||
      cleanUrl.includes('..') ||
      cleanUrl.includes('\\') ||
      cleanUrl.includes('://')
    ) {
      return 'URL deve ser um path relativo seguro iniciado por "/audio/".';
    }
    const vol = Number(form.defaultVolume);
    if (Number.isNaN(vol) || vol < 0 || vol > 1) {
      return 'Volume padrão deve estar entre 0 e 1.';
    }
    const offset = Number(form.offsetSeconds);
    if (Number.isNaN(offset) || offset < 0) {
      return 'Offset (s) não pode ser negativo.';
    }
    if (form.durationSeconds !== '' && form.durationSeconds !== null) {
      const dur = Number(form.durationSeconds);
      if (Number.isNaN(dur) || dur <= 0) {
        return 'Duração (s) deve ser maior que zero quando informada.';
      }
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    const payload = {
      ...(isEdit ? {} : { key: form.key.trim().toLowerCase() }),
      name: form.name.trim(),
      description: form.description.trim() || null,
      category: form.category,
      bus: form.bus,
      url: form.url.trim(),
      defaultVolume: Number(form.defaultVolume),
      isLoop: Boolean(form.isLoop),
      offsetSeconds: Number(form.offsetSeconds),
      durationSeconds:
        form.durationSeconds === '' || form.durationSeconds === null
          ? null
          : Number(form.durationSeconds),
      packName: form.packName.trim() || 'default',
      isEnabled: Boolean(form.isEnabled),
    };

    try {
      await onSave(payload);
    } catch (err) {
      setError(err?.message || 'Erro ao salvar item na biblioteca.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div
        className="w-full max-w-xl bg-[#0a0a12] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <Volume2 className="w-5 h-5 text-red-400" />
            <h3 className="text-sm font-semibold text-white">
              {isEdit ? `Editar Som: ${editingItem.name}` : 'Novo Asset na Sound Library'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                Key (identificador único)
              </label>
              <input
                type="text"
                value={form.key}
                disabled={isEdit || isSubmitting}
                onChange={(e) => setForm({ ...form, key: e.target.value })}
                placeholder="ex: stage-epic-boom"
                className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-xs text-white focus:outline-none focus:border-red-500/60 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                Nome de Exibição
              </label>
              <input
                type="text"
                value={form.name}
                disabled={isSubmitting}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="ex: Epic Stage Boom"
                className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-xs text-white focus:outline-none focus:border-red-500/60"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
              URL do Asset (/audio/...)
            </label>
            <input
              type="text"
              value={form.url}
              disabled={isSubmitting}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder="/audio/stage/chair-bass-whoosh.mp3"
              className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-red-500/60"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                Bus
              </label>
              <select
                value={form.bus}
                disabled={isSubmitting}
                onChange={(e) => setForm({ ...form, bus: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-xs text-white focus:outline-none focus:border-red-500/60"
              >
                <option value="SFX">SFX</option>
                <option value="Ambient">Ambient</option>
                <option value="Music">Music</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                Categoria
              </label>
              <select
                value={form.category}
                disabled={isSubmitting}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-xs text-white focus:outline-none focus:border-red-500/60"
              >
                <option value="ui">ui</option>
                <option value="stage">stage</option>
                <option value="music">music</option>
                <option value="celebration">celebration</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                Pack
              </label>
              <input
                type="text"
                value={form.packName}
                disabled={isSubmitting}
                onChange={(e) => setForm({ ...form, packName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-xs text-white focus:outline-none focus:border-red-500/60"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                Volume Padrão ({Math.round(Number(form.defaultVolume) * 100)}%)
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={form.defaultVolume}
                disabled={isSubmitting}
                onChange={(e) => setForm({ ...form, defaultVolume: parseFloat(e.target.value) })}
                className="w-full accent-red-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                Offset (s)
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={form.offsetSeconds}
                disabled={isSubmitting}
                onChange={(e) => setForm({ ...form, offsetSeconds: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-xs text-white focus:outline-none focus:border-red-500/60"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                Duração (s, opcional)
              </label>
              <input
                type="number"
                min="0.05"
                step="0.1"
                value={form.durationSeconds}
                disabled={isSubmitting}
                onChange={(e) => setForm({ ...form, durationSeconds: e.target.value })}
                placeholder="Auto"
                className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-xs text-white focus:outline-none focus:border-red-500/60"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
              Descrição
            </label>
            <textarea
              rows={2}
              value={form.description}
              disabled={isSubmitting}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Descrição do efeito ou contexto de uso..."
              className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-xs text-white focus:outline-none focus:border-red-500/60"
            />
          </div>

          <div className="flex items-center gap-6 pt-1">
            <label className="inline-flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isLoop}
                disabled={isSubmitting}
                onChange={(e) => setForm({ ...form, isLoop: e.target.checked })}
                className="rounded accent-red-500"
              />
              Reprodução em Loop
            </label>

            <label className="inline-flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isEnabled}
                disabled={isSubmitting}
                onChange={(e) => setForm({ ...form, isEnabled: e.target.checked })}
                className="rounded accent-red-500"
              />
              Ativo na Biblioteca
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-500 transition-colors disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {isEdit ? 'Salvar Alterações' : 'Criar Asset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SoundItemModal;
