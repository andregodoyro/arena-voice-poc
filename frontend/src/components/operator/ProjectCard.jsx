import React from 'react';
import { User, Tag, FileText, Play, Edit2, Trash2, Loader2 } from 'lucide-react';
import { Badge } from './Badge';
import { isCurrentProject } from '../../utils/projectStatus';

/**
 * ProjectCard — Card individual de projeto na listagem de pitches.
 * 
 * Milestone 2C.3: Controles operacionais de Edição, Exclusão e Seleção Cênica.
 * Segue ADR-005 (Seleção Atômica) e ADR-006 (Proteção contra exclusão de projeto ativo).
 */
export function ProjectCard({
  project,
  isCurrent = false,
  isProcessing = false,
  onEdit,
  onDelete,
  onSelect,
}) {
  if (!project) return null;

  const currentStatus = isCurrent || isCurrentProject(project.status);

  return (
    <div
      className={`glass-panel rounded-xl p-4 transition-all duration-200 border ${
        currentStatus
          ? 'border-emerald-500/40 bg-emerald-950/10 shadow-[0_0_15px_rgba(16,185,129,0.12)]'
          : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.03]'
      }`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Lado Esquerdo: Ordem, Título, Leader e Track */}
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`font-mono text-xs font-bold px-2 py-0.5 rounded border ${
                currentStatus
                  ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                  : 'text-gray-400 bg-white/[0.04] border-white/10'
              }`}
            >
              #{project.orderIndex}
            </span>

            <h4 className="text-sm font-semibold text-white truncate max-w-sm">
              {project.title}
            </h4>

            {project.track && (
              <span className="inline-flex items-center gap-1 text-[11px] text-gray-400 bg-white/[0.03] px-2 py-0.5 rounded border border-white/5">
                <Tag className="w-2.5 h-2.5 text-cyan-400" />
                <span>{project.track}</span>
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
            {project.pitchLeader && (
              <span className="flex items-center gap-1 text-gray-300">
                <User className="w-3 h-3 text-gray-500" />
                <span>Leader: {project.pitchLeader}</span>
              </span>
            )}

            {project.description && (
              <span className="flex items-center gap-1 text-gray-500 truncate max-w-md hidden md:inline-flex">
                <FileText className="w-3 h-3 text-gray-600 shrink-0" />
                <span className="truncate">{project.description}</span>
              </span>
            )}
          </div>
        </div>

        {/* Lado Direito: Status e Ações Operacionais */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start lg:self-center">
          <Badge status={project.status} />

          {/* Botão: Colocar no Palco (Oculto se já for o projeto ativo) */}
          {!currentStatus && onSelect && (
            <button
              type="button"
              onClick={() => onSelect(project)}
              disabled={isProcessing}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600/90 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition-all shadow-sm hover:shadow-emerald-950/50 disabled:opacity-50"
              title="Promover este projeto ao palco cênico (POST /api/projects/{id}/select)"
            >
              {isProcessing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
              <span>Colocar no Palco</span>
            </button>
          )}

          {/* Botão: Editar Projeto */}
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(project)}
              disabled={isProcessing}
              className="p-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors disabled:opacity-50"
              title="Editar dados do projeto"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Botão: Excluir Projeto (Desabilitado se for Current - ADR-006) */}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(project)}
              disabled={currentStatus || isProcessing}
              className={`p-1.5 rounded-lg border transition-colors ${
                currentStatus
                  ? 'border-white/5 bg-white/[0.02] text-gray-600 cursor-not-allowed opacity-40'
                  : 'border-red-500/20 bg-red-500/5 hover:bg-red-500/15 text-red-400 hover:text-red-300 disabled:opacity-50'
              }`}
              title={
                currentStatus
                  ? 'Não é possível excluir o projeto atualmente em apresentação (ADR-006)'
                  : 'Excluir projeto'
              }
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProjectCard;
