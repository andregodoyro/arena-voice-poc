import React from 'react';
import { FolderKanban, Layers, Plus } from 'lucide-react';

/**
 * OperatorProjectsTab — Aba de Gestão da Fila de Projetos (/operator/projects).
 * 
 * Base estrutural estabelecida no Milestone 2C.1.
 * O catálogo visual será implementado na Fase 2C.2 e o CRUD/Seleção na Fase 2C.3.
 */
export function OperatorProjectsTab() {
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
            Controle de ordem, apresentações e seleção de pitches para o palco cênico.
          </p>
        </div>

        <button
          disabled
          className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-gray-400 text-xs font-semibold flex items-center gap-2 cursor-not-allowed opacity-60"
          title="Cadastro de projetos será habilitado na Fase 2C.3"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Novo Projeto</span>
        </button>
      </div>

      {/* ── PAINEL DE ESTRUTURA VISUAL ───────────────────────────────────────── */}
      <div className="glass-panel rounded-2xl p-8 border border-white/10 flex flex-col items-center justify-center text-center space-y-4 my-auto min-h-[360px]">
        <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-red-400 shadow-inner">
          <Layers className="w-7 h-7" />
        </div>
        <div className="max-w-md space-y-2">
          <h3 className="text-sm font-semibold text-white">
            Fundação de Navegação Estabelecida (2C.1)
          </h3>
          <p className="text-xs text-gray-400 leading-relaxed">
            A rota <code className="text-red-400 font-mono text-[11px] bg-red-950/40 px-1.5 py-0.5 rounded border border-red-900/40">/operator/projects</code> está integrada ao layout unificado da mesa técnica.
          </p>
          <p className="text-xs text-gray-500">
            A visualização dos cards e fila com dados do backend será ativada na subfase <strong>2C.2</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}

export default OperatorProjectsTab;
