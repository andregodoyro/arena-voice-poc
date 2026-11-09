import React, { useState, useEffect } from 'react';
import {
  X,
  Sliders,
  Calendar,
  Sparkles,
  Type,
  FileText,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
  Tag,
  Clock,
} from 'lucide-react';
import { ColorSwatch } from './ColorSwatch';
import { ColorPreviewCard } from './ColorPreviewCard';
import { EVENT_STATUS } from '../../utils/eventStatus';

/**
 * EventModal — Modal completo de criação e edição de eventos (Milestone 3A).
 */
export function EventModal({
  isOpen,
  onClose,
  onSubmit,
  initialEvent = null,
  isSubmitting = false,
}) {
  const isEditing = Boolean(initialEvent?.id);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [status, setStatus] = useState(EVENT_STATUS.DRAFT);
  const [primaryColor, setPrimaryColor] = useState('#d90429');
  const [secondaryColor, setSecondaryColor] = useState('#ffd166');
  const [logoUrl, setLogoUrl] = useState('');
  const [tagline, setTagline] = useState('');
  const [pitchDuration, setPitchDuration] = useState(180);
  const [qaDuration, setQaDuration] = useState(120);
  const [votingDuration, setVotingDuration] = useState(30);
  const [lockoutEnabled, setLockoutEnabled] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (initialEvent) {
      setTitle(initialEvent.title || '');
      setDescription(initialEvent.description || '');
      setStatus(
        typeof initialEvent.status === 'number'
          ? initialEvent.status
          : EVENT_STATUS.DRAFT
      );
      if (initialEvent.scheduledDate) {
        try {
          const d = new Date(initialEvent.scheduledDate);
          setScheduledDate(d.toISOString().slice(0, 16));
        } catch {
          setScheduledDate('');
        }
      } else {
        setScheduledDate('');
      }
      setPrimaryColor(initialEvent.branding?.primaryColor || '#d90429');
      setSecondaryColor(initialEvent.branding?.secondaryColor || '#ffd166');
      setLogoUrl(initialEvent.branding?.logoUrl || '');
      setTagline(initialEvent.branding?.tagline || '');
      setPitchDuration(initialEvent.timers?.pitchDurationSeconds ?? 180);
      setQaDuration(initialEvent.timers?.qaDurationSeconds ?? 120);
      setVotingDuration(initialEvent.timers?.votingDurationSeconds ?? 30);
      setLockoutEnabled(initialEvent.timers?.lockoutEnabled ?? true);
    } else {
      setTitle('');
      setDescription('');
      setScheduledDate('');
      setStatus(EVENT_STATUS.DRAFT);
      setPrimaryColor('#d90429');
      setSecondaryColor('#ffd166');
      setLogoUrl('/branding/event-logo.png');
      setTagline('O palco onde as melhores ideias conquistam as cadeiras.');
      setPitchDuration(180);
      setQaDuration(120);
      setVotingDuration(30);
      setLockoutEnabled(true);
    }
    setErrorMsg(null);
  }, [initialEvent, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || title.trim().length < 3) {
      setErrorMsg('O título do evento deve ter no mínimo 3 caracteres.');
      return;
    }

    const payload = {
      title: title.trim(),
      description: description.trim(),
      scheduledDate: scheduledDate ? new Date(scheduledDate).toISOString() : null,
      status: Number(status),
      branding: {
        primaryColor,
        secondaryColor,
        logoUrl: logoUrl.trim() || '/branding/event-logo.png',
        tagline: tagline.trim(),
      },
      timers: {
        pitchDurationSeconds: Number(pitchDuration) || 180,
        qaDurationSeconds: Number(qaDuration) || 120,
        votingDurationSeconds: Number(votingDuration) || 30,
        lockoutEnabled: Boolean(lockoutEnabled),
      },
    };

    onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-gray-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* ── CABEÇALHO DO MODAL ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {isEditing ? 'Editar Evento' : 'Novo Evento no Catálogo'}
              </h2>
              <p className="text-xs text-gray-400">
                {isEditing
                  ? `Atualizando metadados e ambientação do evento #${initialEvent.id}`
                  : 'Cadastre um novo evento para a fila institucional da arena'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── CORPO DO FORMULÁRIO ────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* COLUNA ESQUERDA: DADOS INSTITUCIONAIS (7 colunas) */}
            <div className="lg:col-span-7 space-y-4">
              {/* Título */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5 text-amber-400" />
                  <span>Título do Evento *</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="ex: Demo Day Inovação 2027"
                  maxLength={150}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-amber-500/50"
                />
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>Descrição / Objetivo</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Descreva o propósito, regulamento ou público da dinâmica..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-amber-500/50 resize-none"
                />
              </div>

              {/* Data & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    <span>Data e Horário</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-amber-400" />
                    <span>Status Inicial</span>
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-500/50"
                  >
                    <option value={EVENT_STATUS.DRAFT}>Rascunho (Draft)</option>
                    <option value={EVENT_STATUS.READY}>Pronto (Ready)</option>
                    <option value={EVENT_STATUS.FINISHED}>Encerrado (Finished)</option>
                    <option value={EVENT_STATUS.ARCHIVED}>Arquivado (Archived)</option>
                  </select>
                  <p className="text-[10px] text-gray-500 mt-1">
                    * Status "Ativo na Arena" é obtido através do botão Ativar no Palco.
                  </p>
                </div>
              </div>

              {/* Tagline */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Slogan / Tagline do Evento</span>
                </label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="ex: O palco onde as melhores ideias conquistam as cadeiras"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-amber-500/50"
                />
              </div>

              {/* Logo URL */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                  <span>URL do Logotipo</span>
                </label>
                <input
                  type="text"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="/branding/event-logo.png ou https://..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-amber-500/50 font-mono"
                />
              </div>

              {/* Seção de Timers & Lockout (Milestone 3C) */}
              <div className="p-3.5 rounded-xl bg-black/30 border border-white/5 space-y-3">
                <label className="block text-xs font-bold text-gray-300 flex items-center gap-1.5 uppercase tracking-wider">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Temporizadores Padrão (Segundos)</span>
                </label>

                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">Pitch</label>
                    <input
                      type="number"
                      min="10"
                      max="1800"
                      value={pitchDuration}
                      onChange={(e) => setPitchDuration(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-amber-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">Q&A</label>
                    <input
                      type="number"
                      min="10"
                      max="1800"
                      value={qaDuration}
                      onChange={(e) => setQaDuration(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-amber-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">Votação</label>
                    <input
                      type="number"
                      min="5"
                      max="600"
                      value={votingDuration}
                      onChange={(e) => setVotingDuration(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-amber-500/50"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-gray-200 block">Trava de Votação (Lockout)</span>
                    <span className="text-[10px] text-gray-400 block">Exige estágio "Votação Aberta" para aceitar acionamentos</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={lockoutEnabled}
                    onChange={(e) => setLockoutEnabled(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 bg-gray-800 border-gray-600 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* COLUNA DIREITA: BRANDING & PREVIEW (5 colunas) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="p-4 rounded-xl bg-black/30 border border-white/5 space-y-4">
                <h4 className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Iluminação Cênica do Palco</span>
                </h4>

                {/* Cor Primária */}
                <ColorSwatch
                  label="Cor Primária (Neons e Arcos)"
                  value={primaryColor}
                  onChange={setPrimaryColor}
                  description="Ilumina arcos externos, fita de borda e cadeiras apoiadas."
                />

                {/* Cor Secundária */}
                <ColorSwatch
                  label="Cor Secundária (Pódio e Balizamento)"
                  value={secondaryColor}
                  onChange={setSecondaryColor}
                  description="Ilumina anel do orador, frisos dos degraus e aura de unanimidade."
                />
              </div>

              {/* Card de Preview em Tempo Real */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2">
                  Pré-visualização do HUD e Palco:
                </label>
                <ColorPreviewCard
                  title={title || 'Título do Evento'}
                  tagline={tagline || 'Slogan ou descrição curta'}
                  primaryColor={primaryColor}
                  secondaryColor={secondaryColor}
                  logoUrl={logoUrl}
                />
              </div>
            </div>
          </div>

          {/* ── BOTÕES DE AÇÃO DO RODAPÉ DO MODAL ────────────────────────────── */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-gray-950 text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-amber-500/20 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <span>{isEditing ? 'Salvar Alterações' : 'Criar Evento'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
