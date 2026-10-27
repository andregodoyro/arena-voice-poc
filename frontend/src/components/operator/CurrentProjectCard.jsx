import React from 'react';
import { Sparkles, User, Tag, HelpCircle, Layers } from 'lucide-react';
import { Badge } from './Badge';

/**
 * CurrentProjectCard — Card de destaque do projeto atualmente no palco.
 * 
 * Exibe título, pitch leader, track, descrição resumida, status e orderIndex.
 */
export function CurrentProjectCard({ project }) {
  if (!project) {
    return (
      <div className="glass-panel rounded-2xl p-6 border border-white/10 bg-white/[0.02] flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-gray-500">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-300">Nenhum projeto em apresentação</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              O palco cênico está aguardando a seleção de um pitch pela mesa técnica.
            </p>
          </div>
        </div>
        <div className="hidden sm:block">
          <span className="text-xs font-mono text-gray-500 bg-white/[0.03] px-2.5 py-1 rounded-md border border-white/5">
            Palco Livre
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-2xl p-6 border border-emerald-500/30 bg-gradient-to-r from-emerald-950/20 via-white/[0.02] to-transparent shadow-[0_0_25px_rgba(16,185,129,0.08)] relative overflow-hidden">
      {/* Luz ambiente de fundo */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-3xl rounded-full pointer-events-none -mr-16 -mt-16" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="space-y-3 flex-1">
          {/* Header do Card com Tag e Ordem */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              #{project.orderIndex}
            </span>
            <Badge status={project.status ?? 'Current'} />
            {project.track && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-400 bg-white/[0.04] px-2 py-0.5 rounded border border-white/10">
                <Tag className="w-3 h-3 text-cyan-400" />
                <span>{project.track}</span>
              </span>
            )}
          </div>

          {/* Título do Projeto */}
          <div>
            <h3 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
              <span>{project.title}</span>
              <Sparkles className="w-4 h-4 text-emerald-400" />
            </h3>
            {project.pitchLeader && (
              <p className="text-xs text-gray-400 mt-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-gray-500" />
                <span>Pitch Leader:</span>
                <span className="text-gray-200 font-medium">{project.pitchLeader}</span>
              </p>
            )}
          </div>

          {/* Descrição Resumida */}
          {project.description && (
            <p className="text-xs text-gray-400 leading-relaxed max-w-3xl line-clamp-2">
              {project.description}
            </p>
          )}
        </div>

        {/* Resumo da Posição */}
        <div className="flex items-center gap-2 border-t md:border-t-0 md:border-l border-white/10 pt-3 md:pt-0 md:pl-6 text-right">
          <div className="text-left md:text-right">
            <span className="block text-[10px] uppercase tracking-wider text-gray-500 font-medium">
              Apresentação no Palco
            </span>
            <span className="text-sm font-semibold text-emerald-300 flex items-center md:justify-end gap-1.5 mt-0.5">
              <Layers className="w-4 h-4" />
              <span>Ordem #{project.orderIndex}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CurrentProjectCard;
