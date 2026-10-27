import React from 'react';
import { Layers, FolderOpen } from 'lucide-react';
import { ProjectCard } from './ProjectCard';
import { isCurrentProject } from '../../utils/projectStatus';

/**
 * ProjectList — Lista ordenada de projetos da arena.
 * 
 * Ordena por orderIndex crescente e renderiza os cards de projetos.
 */
export function ProjectList({ projects = [], currentProjectId = null }) {
  if (!projects || projects.length === 0) {
    return (
      <div className="glass-panel rounded-2xl p-10 border border-white/10 bg-white/[0.01] flex flex-col items-center justify-center text-center space-y-3">
        <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-gray-500">
          <FolderOpen className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-gray-300">Nenhum projeto cadastrado</h4>
          <p className="text-xs text-gray-500 max-w-sm">
            Nenhum pitch ou startup foi encontrado na base de dados do evento ativo.
          </p>
        </div>
      </div>
    );
  }

  // Ordena projetos por orderIndex
  const sortedProjects = [...projects].sort(
    (a, b) => (a.orderIndex || 0) - (b.orderIndex || 0)
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-gray-500" />
          <span>Fila de Apresentações ({sortedProjects.length})</span>
        </span>
        <span className="text-[11px] text-gray-500 font-mono">
          Ordenação por sequência cênica
        </span>
      </div>

      <div className="space-y-2">
        {sortedProjects.map((project) => {
          const isCurrent =
            project.id === currentProjectId ||
            isCurrentProject(project.status);

          return (
            <ProjectCard
              key={project.id}
              project={project}
              isCurrent={isCurrent}
            />
          );
        })}
      </div>
    </div>
  );
}

export default ProjectList;
