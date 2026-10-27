import React from 'react';
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
} from 'lucide-react';
import { useOperatorContext } from '../../contexts/OperatorContext';
import { CurrentProjectCard } from '../../components/operator/CurrentProjectCard';
import { ProjectList } from '../../components/operator/ProjectList';
import { isPendingProject, isCompletedProject } from '../../utils/projectStatus';

/**
 * OperatorProjectsTab — Aba de Gestão e Visualização da Fila de Projetos (/operator/projects).
 * 
 * Milestone 2C.2: Visualização dos dados de projetos em modo READ-ONLY.
 * Consome o OperatorContext, exibindo o card do projeto ativo, resumo métrico e lista ordenada.
 */
export function OperatorProjectsTab() {
  const { currentProject, projects, loading, error, refresh } = useOperatorContext();

  const totalProjects = projects.length;
  const pendingCount = projects.filter((p) => isPendingProject(p.status)).length;
  const completedCount = projects.filter((p) => isCompletedProject(p.status)).length;

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
            Visualização autoritativa da ordem cênica e status dos pitches para o palco.
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

          {/* Botão de Novo Projeto (Read-Only no 2C.2, será ativado no 2C.3) */}
          <button
            disabled
            className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-gray-500 text-xs font-semibold flex items-center gap-2 cursor-not-allowed opacity-60"
            title="Cadastro de projetos será habilitado na Fase 2C.3"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo Projeto</span>
          </button>
        </div>
      </div>

      {/* ── FEEDBACK DE ERRO ─────────────────────────────────────────────────── */}
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

          {/* ── LISTA DE PROJETOS ORDENADA ───────────────────────────────────── */}
          <div className="pt-2">
            <ProjectList
              projects={projects}
              currentProjectId={currentProject?.id}
            />
          </div>
        </>
      )}
    </div>
  );
}

export default OperatorProjectsTab;
