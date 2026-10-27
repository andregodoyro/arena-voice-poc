import React from 'react';
import { User, Tag, FileText } from 'lucide-react';
import { Badge } from './Badge';

/**
 * ProjectCard — Card individual de projeto na listagem de pitches.
 * 
 * Exibe orderIndex, title, pitchLeader, track, status e descrição resumida.
 * No Milestone 2C.2 é estritamente READ-ONLY (ações serão inseridas no 2C.3).
 */
export function ProjectCard({ project, isCurrent = false }) {
  if (!project) return null;

  return (
    <div
      className={`glass-panel rounded-xl p-4 transition-all duration-200 border ${
        isCurrent
          ? 'border-emerald-500/40 bg-emerald-950/10 shadow-[0_0_15px_rgba(16,185,129,0.12)]'
          : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.03]'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Lado Esquerdo: Ordem, Título, Leader e Track */}
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`font-mono text-xs font-bold px-2 py-0.5 rounded border ${
                isCurrent
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

        {/* Lado Direito: Badge de Status */}
        <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
          <Badge status={project.status} />
        </div>
      </div>
    </div>
  );
}

export default ProjectCard;
