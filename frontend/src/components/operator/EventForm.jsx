import React, { useState, useEffect } from 'react';
import { Save, RotateCcw, AlertCircle, Loader2, Sparkles, Sliders, Monitor, Image as ImageIcon, Film } from 'lucide-react';
import { ColorSwatch } from './ColorSwatch';
import { isValidMediaUrl } from '../../utils/mediaValidation';

/**
 * EventForm — Formulário operacional de edição de dados e identidade do evento.
 * 
 * Segue o contrato REST do Milestone 2B/2C.4 (PUT /api/events/current) e Phase 5C.X:
 * - Título institucional (3 a 150 caracteres)
 * - Descrição detalhada
 * - Tagline cênica
 * - Mídia de Standby do Evento (MediaMode: auto | video | image, Capa, Vídeo e Logo)
 * - Cores primária e secundária (hexadecimal #RRGGBB)
 */
export function EventForm({
  event,
  isSubmitting = false,
  onSubmit,
  onLiveChange,
}) {
  const [formData, setFormData] = useState(() => ({
    title: event?.title || '',
    description: event?.description || '',
    tagline: event?.branding?.tagline || '',
    logoUrl: event?.branding?.logoUrl || '',
    coverImageUrl: event?.branding?.coverImageUrl || '',
    videoUrl: event?.branding?.videoUrl || '',
    mediaMode: event?.branding?.mediaMode || 'auto',
    primaryColor: event?.branding?.primaryColor || '#d90429',
    secondaryColor: event?.branding?.secondaryColor || '#00ffff',
  }));

  const [validationError, setValidationError] = useState('');

  // Re-hidratação quando o evento muda no OperatorContext
  useEffect(() => {
    if (event) {
      const nextData = {
        title: event.title || '',
        description: event.description || '',
        tagline: event.branding?.tagline || '',
        logoUrl: event.branding?.logoUrl || '',
        coverImageUrl: event.branding?.coverImageUrl || '',
        videoUrl: event.branding?.videoUrl || '',
        mediaMode: event.branding?.mediaMode || 'auto',
        primaryColor: event.branding?.primaryColor || '#d90429',
        secondaryColor: event.branding?.secondaryColor || '#00ffff',
      };
      setFormData(nextData);
      if (onLiveChange) onLiveChange(nextData);
    }
  }, [event]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const nextState = { ...formData, [name]: value };
    setFormData(nextState);
    if (validationError) setValidationError('');
    if (onLiveChange) onLiveChange(nextState);
  };

  const handleColorChange = (key, hex) => {
    const nextState = { ...formData, [key]: hex };
    setFormData(nextState);
    if (validationError) setValidationError('');
    if (onLiveChange) onLiveChange(nextState);
  };

  const handleReset = () => {
    if (isSubmitting || !event) return;
    const initial = {
      title: event.title || '',
      description: event.description || '',
      tagline: event.branding?.tagline || '',
      logoUrl: event.branding?.logoUrl || '',
      coverImageUrl: event.branding?.coverImageUrl || '',
      videoUrl: event.branding?.videoUrl || '',
      mediaMode: event.branding?.mediaMode || 'auto',
      primaryColor: event.branding?.primaryColor || '#d90429',
      secondaryColor: event.branding?.secondaryColor || '#00ffff',
    };
    setFormData(initial);
    setValidationError('');
    if (onLiveChange) onLiveChange(initial);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const title = formData.title.trim();
    if (!title || title.length < 3 || title.length > 150) {
      setValidationError('O título do evento é obrigatório e deve ter entre 3 e 150 caracteres.');
      return;
    }

    const hexRegex = /^#([A-Fa-f0-9]{6})$/;
    const primaryColor = formData.primaryColor.trim().toLowerCase();
    const secondaryColor = formData.secondaryColor.trim().toLowerCase();

    if (!hexRegex.test(primaryColor)) {
      setValidationError('A cor primária deve ser um código hexadecimal válido de 6 dígitos (ex: #d90429).');
      return;
    }

    if (!hexRegex.test(secondaryColor)) {
      setValidationError('A cor secundária deve ser um código hexadecimal válido de 6 dígitos (ex: #00ffff).');
      return;
    }

    const logoUrl = formData.logoUrl.trim();
    if (logoUrl && !isValidMediaUrl(logoUrl)) {
      setValidationError(
        'O logotipo deve ser um caminho relativo (ex: /branding/logo.png), URL válida (http/https) ou vazio.'
      );
      return;
    }

    const payload = {
      title,
      description: formData.description.trim(),
      branding: {
        tagline: formData.tagline.trim(),
        logoUrl,
        coverImageUrl: formData.coverImageUrl.trim(),
        videoUrl: formData.videoUrl.trim(),
        mediaMode: formData.mediaMode || 'auto',
        primaryColor,
        secondaryColor,
      },
    };

    onSubmit(payload);
  };

  const inputClasses =
    'w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs placeholder:text-gray-500 transition-all duration-200 ease-in-out focus:bg-white focus:text-gray-900 focus:placeholder:text-gray-400 focus:border-red-600 focus:ring-2 focus:ring-red-500/40 focus:outline-none focus:shadow-lg focus:shadow-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <form onSubmit={handleSubmit} noValidate className="glass-panel rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-5">
      {/* ── CABEÇALHO DO FORMULÁRIO ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Configurações Operacionais</h3>
            <p className="text-[11px] text-gray-400">Edição de parâmetros e branding cênico</p>
          </div>
        </div>

        {event?.id && (
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/[0.04] text-gray-400 border border-white/10">
            ID: {event.id}
          </span>
        )}
      </div>

      {/* ── FEEDBACK DE VALIDAÇÃO ────────────────────────────────────────────── */}
      {validationError && (
        <div className="p-3 rounded-xl bg-red-950/30 border border-red-500/30 text-red-400 text-xs flex items-center gap-2 animate-fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* ── DADOS INSTITUCIONAIS ─────────────────────────────────────────────── */}
      <div className="space-y-4">
        {/* Título do Evento */}
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1">
            Título do Evento <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="Ex: Demo Day Inovação 2026"
            disabled={isSubmitting}
            className={inputClasses}
          />
        </div>

        {/* Tagline Cênica */}
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1">
            Tagline / Frase de Impacto Cênico
          </label>
          <input
            type="text"
            name="tagline"
            value={formData.tagline}
            onChange={handleChange}
            placeholder="Ex: Apresente sua ideia. Conquiste as cadeiras."
            disabled={isSubmitting}
            className={inputClasses}
          />
        </div>

        {/* ── SEÇÃO: MÍDIA DE STANDBY DO EVENTO ───────────────────────────── */}
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3.5">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2">
            <Monitor className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-gray-200 uppercase tracking-wider">
                Mídia de Standby do Evento
              </h4>
              <p className="text-[11px] text-gray-400">
                Conteúdo institucional exibido no Hero Wall durante o estado de standby/abertura (EventIdle)
              </p>
            </div>
          </div>

          {/* Modo de Mídia (auto, video, image) */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-300 mb-1">
              Modo de Apresentação
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, mediaMode: 'auto' }))}
                className={`px-2 py-1.5 rounded-lg text-xs font-medium border text-left ${
                  formData.mediaMode === 'auto'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-black/30 text-gray-400 border-white/5'
                }`}
              >
                Auto (Padrão)
              </button>
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, mediaMode: 'video' }))}
                className={`px-2 py-1.5 rounded-lg text-xs font-medium border text-left ${
                  formData.mediaMode === 'video'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-black/30 text-gray-400 border-white/5'
                }`}
              >
                Vídeo Prioritário
              </button>
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, mediaMode: 'image' }))}
                className={`px-2 py-1.5 rounded-lg text-xs font-medium border text-left ${
                  formData.mediaMode === 'image'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-black/30 text-gray-400 border-white/5'
                }`}
              >
                Apenas Imagem
              </button>
            </div>
          </div>

          {/* Imagem de Capa */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
              <span>Imagem de Capa (Hero Wall)</span>
            </label>
            <input
              type="text"
              name="coverImageUrl"
              value={formData.coverImageUrl}
              onChange={handleChange}
              placeholder="/branding/event-cover.png ou URL..."
              disabled={isSubmitting}
              className={inputClasses}
            />
          </div>

          {/* Vídeo Institucional */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1 flex items-center gap-1.5">
              <Film className="w-3.5 h-3.5 text-amber-400" />
              <span>Vídeo Institucional de Abertura</span>
            </label>
            <input
              type="text"
              name="videoUrl"
              value={formData.videoUrl}
              onChange={handleChange}
              placeholder="/uploads/event-standby.mp4 ou URL..."
              disabled={isSubmitting}
              className={inputClasses}
            />
          </div>

          {/* Logotipo */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
              <span>Logotipo do Evento</span>
            </label>
            <input
              type="text"
              name="logoUrl"
              value={formData.logoUrl}
              onChange={handleChange}
              placeholder="/branding/event-logo.png ou https://..."
              disabled={isSubmitting}
              className={inputClasses}
            />
          </div>
        </div>

        {/* Descrição do Evento */}
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1">
            Descrição do Evento
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            placeholder="Breve resumo da rodada, contexto das apresentações ou regras gerais..."
            disabled={isSubmitting}
            className={`${inputClasses} resize-none`}
          />
        </div>
      </div>

      {/* ── SELEÇÃO DE CORES CÊNICAS ────────────────────────────────────────── */}
      <div className="pt-2 border-t border-white/5 space-y-4">
        <h4 className="text-xs font-semibold text-gray-200 flex items-center gap-1.5 uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Paleta de Iluminação dos Neons</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ColorSwatch
            label="Cor Primária"
            description="Neons e bordas"
            value={formData.primaryColor}
            onChange={(hex) => handleColorChange('primaryColor', hex)}
            disabled={isSubmitting}
          />

          <ColorSwatch
            label="Cor Secundária"
            description="Luz volumétrica e acentos"
            value={formData.secondaryColor}
            onChange={(hex) => handleColorChange('secondaryColor', hex)}
            disabled={isSubmitting}
          />
        </div>
      </div>

      {/* ── BOTÕES DE SALVAMENTO & DESCARTE ──────────────────────────────────── */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
        <button
          type="button"
          onClick={handleReset}
          disabled={isSubmitting}
          className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 flex items-center gap-2 transition-colors disabled:opacity-50"
          title="Descartar alterações e restaurar valores atuais do backend"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Descartar</span>
        </button>

        <button
          type="submit"
          disabled={isSubmitting}
          className="px-5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-950/40 transition-all disabled:opacity-50"
        >
          {isSubmitting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          <span>Salvar Alterações</span>
        </button>
      </div>
    </form>
  );
}

export default EventForm;
