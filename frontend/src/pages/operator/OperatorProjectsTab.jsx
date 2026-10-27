import React, { useState, useEffect } from 'react';
import {
  FolderKanban,
  RefreshCw,
  Plus,
  AlertCircle,
  Layers,
  Clock,
  CheckCircle2,
  Sparkles,
  Loader2,
  AlertTriangle,
  X,
} from 'lucide-react';
import { useOperatorContext } from '../../contexts/OperatorContext';
import { projectsApi } from '../../api/projectsApi';
import { CurrentProjectCard } from '../../components/operator/CurrentProjectCard';
import { ProjectList } from '../../components/operator/ProjectList';
import { ProjectModal } from '../../components/operator/ProjectModal';
import { ConfirmDialog } from '../../components/operator/ConfirmDialog';
import { isPendingProject, isCompletedProject } from '../../utils/projectStatus';

/**
 * OperatorProjectsTab — Aba de Gestão Operacional da Fila de Projetos (/operator/projects).
 * 
 * Milestone 2C.3: Criação, Edição, Exclusão (com proteção 409 - ADR-006)
 * e Seleção Atômica Cênica (ADR-005).
 */
export function OperatorProjectsTab() {
  const { currentProject, projects, loading, error, refresh } = useOperatorContext();

  // Estados de modais e ações operacionais
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [isSubmittingModal, setIsSubmittingModal] = useState(false);

  const [projectToDelete, setProjectToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [processingProjectId, setProcessingProjectId] = useState(null);
  const [actionFeedback, setActionFeedback] = useState(null);

  // Auto-dismiss do feedback após 5 segundos
  useEffect(() => {
    if (!actionFeedback) return;
    const timer = setTimeout(() => {
      setActionFeedback(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [actionFeedback]);

  // Contadores métricos
  const totalProjects = projects.length;
  const pendingCount = projects.filter((p) => isPendingProject(p.status)).length;
  const completedCount = projects.filter((p) => isCompletedProject(p.status)).length;

  // ── HANDLERS OPERACIONAIS ────────────────────────────────────────────────

  const handleOpenCreate = () => {
    setEditingProject(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (project) => {
    setEditingProject(project);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (isSubmittingModal) return;
    setIsModalOpen(false);
    setEditingProject(null);
  };

  const handleSubmitModal = async (payload) => {
    setIsSubmittingModal(true);
    try {
      if (editingProject) {
        await projectsApi.updateProject(editingProject.id, payload);
        setActionFeedback({
          type: 'success',
          message: `Projeto "${payload.title}" atualizado com sucesso!`,
        });
      } else {
        await projectsApi.createProject(payload);
        setActionFeedback({
          type: 'success',
          message: `Projeto "${payload.title}" cadastrado com sucesso!`,
        });
      }
      setIsModalOpen(false);
      setEditingProject(null);
      await refresh();
    } catch (err) {
      setActionFeedback({
        type: 'error',
        message: err.message || 'Falha ao salvar dados do projeto no servidor.',
      });
    } finally {
      setIsSubmittingModal(false);
    }
  };

  const handleRequestDelete = (project) => {
    setProjectToDelete(project);
  };

  const handleCancelDelete = () => {
    if (isDeleting) return;
    setProjectToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!projectToDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      await projectsApi.deleteProject(projectToDelete.id);
      setActionFeedback({
        type: 'success',
        message: `Projeto "${projectToDelete.title}" removido com sucesso.`,
      });
      setProjectToDelete(null);
      await refresh();
    } catch (err) {
      // Salvaguarda ADR-006: se o backend rejeitar com 409 Conflict, exibe aviso específico
      if (err.status === 409 || err.message?.toLowerCase().includes('cannot delete')) {
        setActionFeedback({
          type: 'error',
          message:
            'Aviso de Salvaguarda (ADR-006): Não é possível excluir o projeto atualmente em apresentação no palco.',
        });
      } else {
        setActionFeedback({
          type: 'error',
          message: err.message || 'Falha ao excluir o projeto do servidor.',
        });
      }
      setProjectToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSelectProject = async (project) => {
    if (processingProjectId) return; // Proteção contra duplo clique
    setProcessingProjectId(project.id);
    try {
      await projectsApi.selectProject(project.id);
      setActionFeedback({
        type: 'success',
        message: `Projeto "${project.title}" colocado no palco com sucesso!`,
      });
      await refresh();
    } catch (err) {
      setActionFeedback({
        type: 'error',
        message: err.message || 'Falha ao selecionar o projeto para o palco.',
      });
    } finally {
      setProcessingProjectId(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col space-y-6">
      {/* ── BARRA SUPERIOR DA ABA ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-red-500" />
            <span>Fila de Projetos e Startups</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Gestão operacional de pitches: cadastro, edição, exclusão e promoção ao palco cênico.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Botão de Atualizar */}
          <button
            onClick={refresh}
            disabled={loading}
            className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
            title="Recarregar dados do backend"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-red-400' : ''}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>

          {/* Botão de Novo Projeto (Ativado no Milestone 2C.3) */}
          <button
            onClick={handleOpenCreate}
            disabled={loading}
            className="px-4 py-2 rounded-xl border border-red-500/40 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-red-950/40 transition-all disabled:opacity-50"
            title="Cadastrar um novo pitch na fila"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo Projeto</span>
          </button>
        </div>
      </div>

      {/* ── FEEDBACK DE AÇÃO OPERACIONAL (TOAST / BANNER) ────────────────────── */}
      {actionFeedback && (
        <div
          className={`glass-panel rounded-xl p-3.5 border text-xs flex items-center justify-between gap-3 animate-fade-in ${
            actionFeedback.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-950/30 text-emerald-300'
              : 'border-red-500/30 bg-red-950/30 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{actionFeedback.message}</span>
          </div>

          <button
            onClick={() => setActionFeedback(null)}
            className="text-gray-400 hover:text-white p-1 rounded transition-colors shrink-0"
            title="Dispensar aviso"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── FEEDBACK DE ERRO GERAL DO CONTEXTO ───────────────────────────────── */}
      {error && (
        <div className="glass-panel rounded-xl p-4 border border-red-500/30 bg-red-950/20 text-red-400 flex items-start justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={refresh}
            className="underline font-semibold hover:text-white shrink-0"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* ── FEEDBACK DE CARREGAMENTO INICIAL ─────────────────────────────────── */}
      {loading && projects.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 border border-white/10 flex flex-col items-center justify-center space-y-3 min-h-[300px]">
          <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
          <p className="text-xs text-gray-400">Carregando dados dos projetos...</p>
        </div>
      ) : (
        <>
          {/* ── RESUMO MÉTRICO / CARDS DE INDICADORES ────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Total de Projetos */}
            <div className="glass-panel rounded-xl p-4 border border-white/10 bg-white/[0.02]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">
                  Total Projetos
                </span>
                <Layers className="w-4 h-4 text-blue-400" />
              </div>
              <p className="text-2xl font-bold text-white mt-1.5">{totalProjects}</p>
              <span className="text-[10px] text-gray-500">Cadastrados no evento</span>
            </div>

            {/* Projetos Pendentes */}
            <div className="glass-panel rounded-xl p-4 border border-white/10 bg-white/[0.02]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">
                  Pendentes
                </span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-2xl font-bold text-amber-300 mt-1.5">{pendingCount}</p>
              <span className="text-[10px] text-gray-500">Aguardando no backstage</span>
            </div>

            {/* Projetos Concluídos */}
            <div className="glass-panel rounded-xl p-4 border border-white/10 bg-white/[0.02]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">
                  Concluídos
                </span>
                <CheckCircle2 className="w-4 h-4 text-gray-400" />
              </div>
              <p className="text-2xl font-bold text-gray-300 mt-1.5">{completedCount}</p>
              <span className="text-[10px] text-gray-500">Pitches finalizados</span>
            </div>

            {/* Projeto Atual no Palco */}
            <div className="glass-panel rounded-xl p-4 border border-emerald-500/20 bg-emerald-950/10">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider text-emerald-400 font-medium">
                  Projeto Atual
                </span>
                <Sparkles className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-sm font-bold text-white mt-1.5 truncate">
                {currentProject ? currentProject.title : 'Nenhum'}
              </p>
              <span className="text-[10px] text-emerald-400/70">
                {currentProject ? `Ordem #${currentProject.orderIndex}` : 'Palco livre'}
              </span>
            </div>
          </div>

          {/* ── PROJETO ATUAL NO PALCO ───────────────────────────────────────── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Projeto no Palco Cênico</span>
              </span>
              <span className="text-[11px] text-gray-500 font-mono">
                Sincronizado com Snapshot autoritativo
              </span>
            </div>
            <CurrentProjectCard project={currentProject} />
          </div>

          {/* ── LISTA DE PROJETOS ORDENADA COM AÇÕES ─────────────────────────── */}
          <div className="pt-2">
            <ProjectList
              projects={projects}
              currentProjectId={currentProject?.id}
              processingProjectId={processingProjectId}
              onEdit={handleOpenEdit}
              onDelete={handleRequestDelete}
              onSelect={handleSelectProject}
            />
          </div>
        </>
      )}

      {/* ── MODAL DE CADASTRO E EDIÇÃO ───────────────────────────────────────── */}
      <ProjectModal
        key={editingProject?.id || (isModalOpen ? 'open-new' : 'closed')}
        isOpen={isModalOpen}
        project={editingProject}
        isSubmitting={isSubmittingModal}
        onClose={handleCloseModal}
        onSubmit={handleSubmitModal}
      />

      {/* ── DIÁLOGO DE CONFIRMAÇÃO DE EXCLUSÃO ────────────────────────────────── */}
      <ConfirmDialog
        isOpen={Boolean(projectToDelete)}
        title="Excluir Projeto"
        message={`Deseja realmente excluir o projeto "${projectToDelete?.title}"? Esta ação não poderá ser desfeita.`}
        confirmLabel="Excluir Definitivamente"
        cancelLabel="Cancelar"
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </div>
  );
}

export default OperatorProjectsTab;
