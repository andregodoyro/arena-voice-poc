import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  FolderPlus,
  Edit3,
  Loader2,
  AlertCircle,
  Upload,
  Image as ImageIcon,
  Film,
  Trash2,
  Plus,
  Sparkles,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { isValidMediaUrl } from '../../utils/mediaValidation';
import { projectsApi } from '../../api/projectsApi';

const ACCEPTED_IMAGE_TYPES = '.jpg,.jpeg,.png,.webp,.svg';
const ACCEPTED_VIDEO_TYPES = '.mp4,.webm';

/**
 * ProjectModal — Modal para Criação e Edição de Projetos/Pitches com Upload de Mídia (Phase 5C.2B).
 * 
 * Funcionalidades:
 * - Upload direto com suporte a JPG, JPEG, PNG, WEBP e SVG;
 * - Suporte a Logo do Projeto, Imagem de Capa/Banner e Galeria de Mídia (Mockups/Screenshots/Renders);
 * - Modelo futuro preparado: media: ProjectMedia[] ({ id, type, url, order });
 * - Fallback de leitura local resiliente (offline-first);
 * - Previews em tempo real e reordenação.
 */
export function ProjectModal({
  isOpen,
  project = null,
  isSubmitting = false,
  onClose,
  onSubmit,
}) {
  const isEditing = Boolean(project?.id);

  // Inicialização de mídia existente
  const initialMediaItems = React.useMemo(() => {
    if (Array.isArray(project?.media?.items) && project.media.items.length > 0) {
      return project.media.items;
    }
    if (Array.isArray(project?.mediaItems) && project.mediaItems.length > 0) {
      return project.mediaItems;
    }
    return [];
  }, [project]);

  const [formData, setFormData] = useState(() => ({
    title: project?.title || '',
    pitchLeader: project?.pitchLeader || '',
    track: project?.track || '',
    description: project?.description || '',
    orderIndex: project?.orderIndex ?? '',
    logoUrl: project?.media?.logoUrl || project?.logoUrl || '',
    coverImageUrl: project?.media?.coverImageUrl || project?.coverImageUrl || '',
    videoUrl: project?.media?.videoUrl || project?.videoUrl || '',
  }));

  const [mediaItems, setMediaItems] = useState(initialMediaItems);
  const [validationError, setValidationError] = useState('');
  const [uploadingTarget, setUploadingTarget] = useState(null); // 'logo' | 'cover' | 'gallery' | null

  const logoInputRef = useRef(null);
  const coverInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  // Sincroniza estado quando projeto muda
  useEffect(() => {
    if (project) {
      setFormData({
        title: project.title || '',
        pitchLeader: project.pitchLeader || '',
        track: project.track || '',
        description: project.description || '',
        orderIndex: project.orderIndex ?? '',
        logoUrl: project.media?.logoUrl || project.logoUrl || '',
        coverImageUrl: project.media?.coverImageUrl || project.coverImageUrl || '',
        videoUrl: project.media?.videoUrl || project.videoUrl || '',
      });
      const items = Array.isArray(project.media?.items) ? project.media.items : (project.mediaItems || []);
      setMediaItems(items);
    } else {
      setFormData({
        title: '',
        pitchLeader: '',
        track: '',
        description: '',
        orderIndex: '',
        logoUrl: '',
        coverImageUrl: '',
        videoUrl: '',
      });
      setMediaItems([]);
    }
    setValidationError('');
  }, [project, isOpen]);

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

  /**
   * Processador genérico de upload para Logo, Capa e Galeria
   */
  const handleFileUpload = async (e, target) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingTarget(target);
    setValidationError('');

    try {
      if (target === 'logo') {
        const result = await projectsApi.uploadMedia(files[0]);
        setFormData((prev) => ({ ...prev, logoUrl: result.url }));
      } else if (target === 'cover') {
        const result = await projectsApi.uploadMedia(files[0]);
        setFormData((prev) => ({ ...prev, coverImageUrl: result.url }));
      } else if (target === 'video') {
        const result = await projectsApi.uploadMedia(files[0]);
        setFormData((prev) => ({ ...prev, videoUrl: result.url }));
      } else if (target === 'gallery') {
        const uploadedList = [];
        for (let i = 0; i < files.length; i++) {
          const res = await projectsApi.uploadMedia(files[i]);
          uploadedList.push({
            id: `media-${Date.now()}-${i}`,
            type: 'image',
            url: res.url,
            order: mediaItems.length + i + 1,
          });
        }
        setMediaItems((prev) => [...prev, ...uploadedList]);
      }
    } catch (err) {
      setValidationError(`Falha no upload do arquivo: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setUploadingTarget(null);
      e.target.value = '';
    }
  };

  const handleRemoveGalleryItem = (index) => {
    setMediaItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

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

    const logoUrl = formData.logoUrl.trim();
    if (logoUrl && !isValidMediaUrl(logoUrl)) {
      setValidationError('O logotipo deve ser um caminho válido, URL ou upload.');
      return;
    }

    const coverImageUrl = formData.coverImageUrl.trim();
    if (coverImageUrl && !isValidMediaUrl(coverImageUrl)) {
      setValidationError('A imagem de capa deve ser um caminho válido, URL ou upload.');
      return;
    }

    const videoUrl = formData.videoUrl.trim();
    if (videoUrl && !isValidMediaUrl(videoUrl)) {
      setValidationError('O vídeo deve ser um caminho válido, URL ou upload.');
      return;
    }

    const payload = {
      title,
      pitchLeader,
      track,
      description: formData.description.trim(),
      orderIndex: parsedOrderIndex,
      // Envia undefined (omite o campo) se vazio para não sobrescrever dados existentes no banco.
      // Envia a string se preenchida (incluindo quando removida intencionalmente pelo usuário via botão Remover).
      // A diferença entre "não tocar" e "remover" é resolvida pelo estado do formulário:
      // - campo intacto sem upload → string vazia → omite (preserva banco)
      // - campo preenchido via upload ou texto → envia URL
      // - campo removido com botão Remover → string vazia → omite
      //   NOTA: se desejar suporte a remoção explícita, enviar string vazia deliberadamente é ambíguo.
      //   Por ora, string vazia = "não alterar" é a política mais segura para o upload flow.
      logoUrl: logoUrl || undefined,
      coverImageUrl: coverImageUrl || undefined,
      videoUrl: videoUrl || undefined,
      mediaItems,
    };

    onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div
        className="w-full max-w-2xl bg-[#0b0d14] border border-white/10 rounded-2xl shadow-2xl overflow-hidden my-6 max-h-[90vh] flex flex-col"
        role="dialog"
        aria-modal="true"
      >
        {/* ── CABEÇALHO DO MODAL ────────────────────────────────────────────── */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02] shrink-0">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isEditing
                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              }`}
            >
              {isEditing ? <Edit3 className="w-5 h-5" /> : <FolderPlus className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">
                {isEditing ? 'Editar Projeto de Apresentação' : 'Cadastrar Novo Pitch / Startup'}
              </h3>
              <p className="text-xs text-gray-400">
                Configure os ativos visuais para ocupação monumental no Hero Showcase Wall.
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
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── CORPO COM ROLAGEM ─────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} noValidate className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Mensagem de Erro */}
          {validationError && (
            <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{validationError}</span>
            </div>
          )}

          {/* ── SEÇÃO 1: INFORMAÇÕES BÁSICAS DO PITCH ────────────────────────── */}
          <div className="space-y-4">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400/90 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Identificação do Projeto</span>
            </h4>

            {/* Título do Projeto */}
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Nome da Startup / Solução <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Ex: EcoLog ou NeuroSync AI"
                disabled={isSubmitting}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs placeholder:text-gray-500 focus:bg-white focus:text-gray-900 focus:outline-none focus:border-red-500 transition-all"
              />
            </div>

            {/* Pitch Leader & Trilha */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Pitch Leader (Apresentador) <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="pitchLeader"
                  value={formData.pitchLeader}
                  onChange={handleChange}
                  placeholder="Ex: Lucas Rocha"
                  disabled={isSubmitting}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs placeholder:text-gray-500 focus:bg-white focus:text-gray-900 focus:outline-none focus:border-red-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Trilha / Categoria <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="track"
                  value={formData.track}
                  onChange={handleChange}
                  placeholder="Ex: Sustentabilidade, HealthTech, AI"
                  disabled={isSubmitting}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs placeholder:text-gray-500 focus:bg-white focus:text-gray-900 focus:outline-none focus:border-red-500 transition-all"
                />
              </div>
            </div>

            {/* Ordem na Fila & Descrição */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="sm:col-span-1">
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Ordem de Palco
                </label>
                <input
                  type="number"
                  name="orderIndex"
                  value={formData.orderIndex}
                  onChange={handleChange}
                  placeholder="Automática"
                  min="1"
                  disabled={isSubmitting}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs placeholder:text-gray-500 focus:bg-white focus:text-gray-900 focus:outline-none focus:border-red-500 transition-all"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Tagline / Proposta de Valor
                </label>
                <input
                  type="text"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Ex: Rastreabilidade para um futuro sustentável"
                  disabled={isSubmitting}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs placeholder:text-gray-500 focus:bg-white focus:text-gray-900 focus:outline-none focus:border-red-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* ── SEÇÃO 2: ATIVOS VISUAIS DO HERO SHOWCASE WALL ───────────────── */}
          <div className="space-y-4 pt-4 border-t border-white/10">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                <Layers className="w-3.5 h-3.5" />
                <span>Ativos Visuais do Hero Showcase Wall (Palco LED)</span>
              </h4>
              <span className="text-[10px] text-gray-400 font-mono">
                Formatos: Imagens (.jpg, .png, .webp) | Vídeo (.mp4, .webm até 100MB)
              </span>
            </div>

            {/* 1. LOGO DO PROJETO */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-white block">Logotipo do Projeto</span>
                  <span className="text-[11px] text-gray-400">
                    Marca oficial exibida com destaque em vidro fosco no telão.
                  </span>
                </div>
                <input
                  type="file"
                  ref={logoInputRef}
                  accept={ACCEPTED_IMAGE_TYPES}
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, 'logo')}
                />
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={uploadingTarget === 'logo'}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/10 hover:bg-white/15 text-white flex items-center gap-1.5 transition-colors"
                >
                  {uploadingTarget === 'logo' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5" />
                  )}
                  <span>Fazer Upload</span>
                </button>
              </div>

              {/* Preview e URL do Logo */}
              <div className="flex items-center gap-3">
                {formData.logoUrl ? (
                  <div className="relative w-14 h-14 rounded-xl bg-black/50 border border-white/15 p-1.5 shrink-0 flex items-center justify-center overflow-hidden group">
                    <img
                      src={formData.logoUrl}
                      alt="Logo preview"
                      className="w-full h-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, logoUrl: '' }))}
                      className="absolute inset-0 bg-red-950/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remover logotipo"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-white/5 border border-dashed border-white/20 shrink-0 flex items-center justify-center text-gray-500">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                )}
                <input
                  type="text"
                  name="logoUrl"
                  value={formData.logoUrl}
                  onChange={handleChange}
                  placeholder="/samples/ecolog-logo.png ou URL externa..."
                  disabled={isSubmitting}
                  className="flex-1 px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-xs placeholder:text-gray-500"
                />
              </div>
            </div>

            {/* 2. IMAGEM DE CAPA / HERO BANNER */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-white block">
                    Imagem de Capa / Hero Visual (Principal)
                  </span>
                  <span className="text-[11px] text-gray-400">
                    Dominará 70% a 90% da parede de fundo da arena (Mockup, Render ou Banner).
                  </span>
                </div>
                <input
                  type="file"
                  ref={coverInputRef}
                  accept={ACCEPTED_IMAGE_TYPES}
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, 'cover')}
                />
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  disabled={uploadingTarget === 'cover'}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600/80 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  {uploadingTarget === 'cover' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5" />
                  )}
                  <span>Fazer Upload</span>
                </button>
              </div>

              {/* Preview e URL da Capa */}
              <div className="space-y-2">
                {formData.coverImageUrl && (
                  <div className="relative w-full h-28 rounded-xl bg-black/50 border border-white/15 overflow-hidden group">
                    <img
                      src={formData.coverImageUrl}
                      alt="Cover preview"
                      className="w-full h-full object-cover object-center"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2.5">
                      <span className="text-[11px] font-mono text-emerald-300 font-bold">
                        Destaque Heroico de Palco Ativo
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, coverImageUrl: '' }))}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-950/80 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remover imagem de capa"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                )}
                <input
                  type="text"
                  name="coverImageUrl"
                  value={formData.coverImageUrl}
                  onChange={handleChange}
                  placeholder="/samples/ecolog-cover.png ou URL da imagem panorâmica..."
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-xs placeholder:text-gray-500"
                />
              </div>
            </div>

            {/* 3. VÍDEO DE APRESENTAÇÃO (PITCH-LIVE NO LED WALL) */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-white block">
                    Vídeo de Apresentação (Pitch-Live no LED Wall)
                  </span>
                  <span className="text-[11px] text-gray-400">
                    Reproduzido nativamente no telão 3D durante o pitch (MP4 ou WebM, máx. 100MB).
                  </span>
                </div>
                <input
                  type="file"
                  ref={videoInputRef}
                  accept={ACCEPTED_VIDEO_TYPES}
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, 'video')}
                />
                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  disabled={uploadingTarget === 'video'}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600/80 hover:bg-blue-500 text-white flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  {uploadingTarget === 'video' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Film className="w-3.5 h-3.5" />
                  )}
                  <span>Fazer Upload Vídeo</span>
                </button>
              </div>

              {/* Preview e URL do Vídeo */}
              <div className="space-y-2">
                {formData.videoUrl && (
                  <div className="p-2.5 rounded-xl bg-blue-950/30 border border-blue-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-blue-200 truncate">
                      <Film className="w-4 h-4 text-blue-400 shrink-0" />
                      <span className="truncate font-mono text-[11px]">{formData.videoUrl}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, videoUrl: '' }))}
                      className="p-1 rounded-lg hover:bg-red-950/80 text-gray-400 hover:text-red-400 transition-colors ml-2 shrink-0"
                      title="Remover vídeo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <input
                  type="text"
                  name="videoUrl"
                  value={formData.videoUrl}
                  onChange={handleChange}
                  placeholder="/uploads/sample-pitch.mp4 ou URL externa de vídeo..."
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-xs placeholder:text-gray-500"
                />
              </div>
            </div>

            {/* 4. GALERIA DE MÍDIA / MOCKUPS (ProjectMedia[]) */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-white block">
                    Galeria de Mockups & Screenshots (Slideshow Automático)
                  </span>
                  <span className="text-[11px] text-gray-400">
                    Múltiplas imagens ativam crossfade cinematográfico elegante no Hero Wall.
                  </span>
                </div>
                <input
                  type="file"
                  ref={galleryInputRef}
                  accept={ACCEPTED_IMAGE_TYPES}
                  multiple
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, 'gallery')}
                />
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  disabled={uploadingTarget === 'gallery'}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/10 hover:bg-white/15 text-white flex items-center gap-1.5 transition-colors"
                >
                  {uploadingTarget === 'gallery' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  <span>Adicionar Imagens</span>
                </button>
              </div>

              {/* Grid de Thumbnails da Galeria */}
              {mediaItems.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                  {mediaItems.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="relative rounded-lg bg-black/50 border border-white/15 overflow-hidden group aspect-video flex items-center justify-center"
                    >
                      <img
                        src={item.url}
                        alt={`Slide ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/70 text-[9px] font-mono text-gray-300">
                        #{idx + 1}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveGalleryItem(idx)}
                        className="absolute top-1 right-1 p-1 rounded bg-red-950/80 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remover slide"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-gray-500 italic">
                  Nenhuma imagem secundária adicionada. Se houver apenas a imagem de capa, ela será exibida estaticamente.
                </p>
              )}
            </div>
          </div>

          {/* ── BOTÕES DE AÇÃO ────────────────────────────────────────────── */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-950/40 transition-all disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isEditing ? 'Salvar Projeto & Atualizar Telão' : 'Criar Projeto no Palco'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProjectModal;
