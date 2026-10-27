import React from 'react';
import { Sliders, Palette } from 'lucide-react';

/**
 * OperatorEventTab — Aba de Configurações e Branding do Evento (/operator/event).
 * 
 * Base estrutural estabelecida no Milestone 2C.1.
 * O formulário de edição de metadados e preview visual de neons será ativado na Fase 2C.4.
 */
export function OperatorEventTab() {
  return (
    <div className="flex-1 flex flex-col space-y-6">
      {/* ── BARRA SUPERIOR DA ABA ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-amber-500" />
            <span>Configurações e Identidade do Evento</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Personalização do nome, descrição e paleta de cores dos neons cênicos.
          </p>
        </div>
      </div>

      {/* ── PAINEL DE ESTRUTURA VISUAL ───────────────────────────────────────── */}
      <div className="glass-panel rounded-2xl p-8 border border-white/10 flex flex-col items-center justify-center text-center space-y-4 my-auto min-h-[360px]">
        <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-amber-400 shadow-inner">
          <Palette className="w-7 h-7" />
        </div>
        <div className="max-w-md space-y-2">
          <h3 className="text-sm font-semibold text-white">
            Fundação de Navegação Estabelecida (2C.1)
          </h3>
          <p className="text-xs text-gray-400 leading-relaxed">
            A rota <code className="text-amber-400 font-mono text-[11px] bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-900/40">/operator/event</code> está integrada ao layout unificado da mesa técnica.
          </p>
          <p className="text-xs text-gray-500">
            O formulário de configurações e preview de cores com PUT /api/events/current será ativado na subfase <strong>2C.4</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}

export default OperatorEventTab;
