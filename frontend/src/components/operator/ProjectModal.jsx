import React, { useState, useEffect } from 'react';
import { X, FolderPlus, Edit3, Loader2, AlertCircle } from 'lucide-react';
import { isValidMediaUrl } from '../../utils/mediaValidation';

/**
 * ProjectModal — Modal para Criação e Edição de Projetos/Pitches.
 * 
 * Segue o contrato REST do Milestone 2B (POST /api/projects e PUT /api/projects/{id}).
 * Suporta caminhos relativos internos (/samples/*) e URLs externas para logo e coverImageUrl.
 */
export function ProjectModal({
  isOpen,
  project = null,
  isSubmitting = false,
  onClose,
  onSubmit,
}) {
  const isEditing = Boolean(project?.id);

  const [formData, setFormData] = useState(() => ({
    title: project?.title || '',
    pitchLeader: project?.pitchLeader || '',
    track: project?.track || '',
    description: project?.description || '',
    orderIndex: project?.orderIndex ?? '',
    logoUrl: project?.media?.logoUrl || project?.logoUrl || '',
    coverImageUrl: project?.media?.coverImageUrl || project?.coverImageUrl || '',
  }));

  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    function handleKeyDown(e) {
      if (!isOpen || isSubmitting) return;
      if (e.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (validationError) setValidationError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validações básicas de formato alinhadas às regras do backend
    const title = formData.title.trim();
    if (!title || title.length < 3 || title.length > 120) {
      setValidationError('O título é obrigatório e deve ter entre 3 e 120 caracteres.');
      return;
    }

    const pitchLeader = formData.pitchLeader.trim();
    if (!pitchLeader || pitchLeader.length < 2 || pitchLeader.length > 100) {
      setValidationError('O Pitch Leader é obrigatório e deve ter entre 2 e 100 caracteres.');
      return;
    }

    const track = formData.track.trim();
    if (!track || track.length < 2 || track.length > 50) {
      setValidationError('A trilha/track é obrigatória e deve ter entre 2 e 50 caracteres.');
      return;
    }

    const parsedOrderIndex = formData.orderIndex !== '' ? Number(formData.orderIndex) : undefined;
    if (parsedOrderIndex !== undefined && (Number.isNaN(parsedOrderIndex) || parsedOrderIndex <= 0)) {
      setValidationError('A ordem na fila deve ser um número inteiro positivo maior que zero.');
      return;
    }

    // Validação flexível de mídia: aceita vazio, caminho relativo ou URL absoluta
    const logoUrl = formData.logoUrl.trim();
    if (logoUrl && !isValidMediaUrl(logoUrl)) {
      setValidationError('O logotipo deve ser um caminho relativo (ex: /samples/logo.png), URL válida (http/https) ou vazio.');
      return;
    }

    const coverImageUrl = formData.coverImageUrl.trim();
    if (coverImageUrl && !isValidMediaUrl(coverImageUrl)) {
      setValidationError('A imagem de capa deve ser um caminho relativo (ex: /samples/cover.png), URL válida (http/https) ou vazio.');
      return;
    }

    const payload = {
      title,
      pitchLeader,
      track,
      description: formData.description.trim(),
      orderIndex: parsedOrderIndex,
      logoUrl,
      coverImageUrl,
    };

    onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div
        className="w-full max-w-lg bg-[#0a0a12] border border-white/10 rounded-2xl shadow-2xl overflow-hidden my-8"
        role="dialog"
        aria-modal="true"
      >
        {/* ── CABEÇALHO DO MODAL ────────────────────────────────────────────── */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                isEditing
                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              }`}
            >
              {isEditing ? <Edit3 className="w-4 h-4" /> : <FolderPlus className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                {isEditing ? 'Editar Projeto' : 'Novo Projeto'}
              </h3>
              <p className="text-[11px] text-gray-400">
                {isEditing
                  ? 'Atualize os dados e a posição cênica do pitch.'
                  : 'Cadastre um novo pitch na fila de apresentações.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── FORMULÁRIO ────────────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4">
          {/* Mensagem de Erro de Validação */}
          {validationError && (
            <div className="p-3 rounded-xl bg-red-950/30 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Título do Projeto */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Título do Projeto / Startup <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Ex: NeuroSync AI"
              disabled={isSubmitting}
              className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs placeholder:text-gray-500 transition-all duration-200 ease-in-out focus:bg-white focus:text-gray-900 focus:placeholder:text-gray-400 focus:border-red-600 focus:ring-2 focus:ring-red-500/40 focus:outline-none focus:shadow-lg focus:shadow-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Pitch Leader & Trilha / Track */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Pitch Leader <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="pitchLeader"
                value={formData.pitchLeader}
                onChange={handleChange}
                placeholder="Ex: Ana Beatriz"
                disabled={isSubmitting}
                className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs placeholder:text-gray-500 transition-all duration-200 ease-in-out focus:bg-white focus:text-gray-900 focus:placeholder:text-gray-400 focus:border-red-600 focus:ring-2 focus:ring-red-500/40 focus:outline-none focus:shadow-lg focus:shadow-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Trilha (Track) <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="track"
                value={formData.track}
                onChange={handleChange}
                placeholder="Ex: HealthTech, AI, CleanTech"
                disabled={isSubmitting}
                className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs placeholder:text-gray-500 transition-all duration-200 ease-in-out focus:bg-white focus:text-gray-900 focus:placeholder:text-gray-400 focus:border-red-600 focus:ring-2 focus:ring-red-500/40 focus:outline-none focus:shadow-lg focus:shadow-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* Ordem na Fila & URL do Logo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Ordem na Fila (Sequência)
              </label>
              <input
                type="number"
                name="orderIndex"
                value={formData.orderIndex}
                onChange={handleChange}
                placeholder="Automática se vazio"
                min="1"
                disabled={isSubmitting}
                className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs placeholder:text-gray-500 transition-all duration-200 ease-in-out focus:bg-white focus:text-gray-900 focus:placeholder:text-gray-400 focus:border-red-600 focus:ring-2 focus:ring-red-500/40 focus:outline-none focus:shadow-lg focus:shadow-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Logotipo (Caminho ou URL)
              </label>
              <input
                type="text"
                name="logoUrl"
                value={formData.logoUrl}
                onChange={handleChange}
                placeholder="/samples/logo.png ou https://..."
                disabled={isSubmitting}
                className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs placeholder:text-gray-500 transition-all duration-200 ease-in-out focus:bg-white focus:text-gray-900 focus:placeholder:text-gray-400 focus:border-red-600 focus:ring-2 focus:ring-red-500/40 focus:outline-none focus:shadow-lg focus:shadow-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* URL da Imagem de Capa */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Imagem de Capa / Banner (Caminho ou URL)
            </label>
            <input
              type="text"
              name="coverImageUrl"
              value={formData.coverImageUrl}
              onChange={handleChange}
              placeholder="/samples/cover.png ou https://..."
              disabled={isSubmitting}
              className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs placeholder:text-gray-500 transition-all duration-200 ease-in-out focus:bg-white focus:text-gray-900 focus:placeholder:text-gray-400 focus:border-red-600 focus:ring-2 focus:ring-red-500/40 focus:outline-none focus:shadow-lg focus:shadow-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Descrição do Projeto */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Descrição Resumida do Pitch
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              placeholder="Breve descrição da proposta de valor, tecnologia ou mercado..."
              disabled={isSubmitting}
              className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs placeholder:text-gray-500 transition-all duration-200 ease-in-out focus:bg-white focus:text-gray-900 focus:placeholder:text-gray-400 focus:border-red-600 focus:ring-2 focus:ring-red-500/40 focus:outline-none focus:shadow-lg focus:shadow-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed resize-none"
            />
          </div>

          {/* ── BOTÕES DE AÇÃO ────────────────────────────────────────────── */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-950/40 transition-all disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isEditing ? 'Salvar Alterações' : 'Criar Projeto'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProjectModal;
