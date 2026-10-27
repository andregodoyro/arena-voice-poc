import React from 'react';
import { Radio, ExternalLink } from 'lucide-react';

/**
 * OperatorHeader — Cabeçalho institucional e status de prontidão do sistema.
 * 
 * Traduz o estado técnico de transporte para linguagem de produto:
 * - Sistema Pronto (verde)
 * - Reconectando ao sistema... (âmbar)
 * - Sistema Indisponível (rosa/vermelho)
 */
export function OperatorHeader({ connectionStatus }) {
  const getProductStatus = () => {
    switch (connectionStatus) {
      case 'CONECTADO':
        return {
          label: 'Sistema Pronto',
          colorClass: 'text-emerald-400 border-emerald-500/40 bg-emerald-950/30',
          dotClass: 'bg-emerald-400',
        };
      case 'RESSINCRONIZANDO':
        return {
          label: 'Sincronizando estado...',
          colorClass: 'text-cyan-400 border-cyan-500/40 bg-cyan-950/30',
          dotClass: 'bg-cyan-400 animate-pulse',
        };
      case 'RECONECTANDO':
        return {
          label: 'Reconectando ao sistema...',
          colorClass: 'text-amber-400 border-amber-500/40 bg-amber-950/30',
          dotClass: 'bg-amber-400 animate-pulse',
        };
      default:
        return {
          label: 'Sistema Indisponível',
          colorClass: 'text-rose-400 border-rose-500/40 bg-rose-950/30',
          dotClass: 'bg-rose-500',
        };
    }
  };

  const status = getProductStatus();

  return (
    <header className="glass-panel rounded-2xl p-4 md:p-5 flex flex-wrap items-center justify-between gap-4 border border-white/10">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-amber-500 flex items-center justify-center shadow-lg shadow-red-500/30 flex-shrink-0">
          <Radio className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-display text-2xl tracking-wide leading-none text-white">
            ARENA VOICE
          </h1>
          <p className="text-xs text-gray-400 font-medium tracking-wider uppercase mt-1">
            Cockpit de Operação
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Indicador Operacional de Produto */}
        <div className={`px-4 py-2 rounded-xl border flex items-center gap-2.5 text-xs font-semibold ${status.colorClass}`}>
          <span className={`w-2.5 h-2.5 rounded-full ${status.dotClass}`} />
          <span>{status.label}</span>
        </div>

        {/* Link de conveniência para abrir o Telão */}
        <a
          href="/stage"
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-2 rounded-xl border border-white/10 hover:border-white/20 bg-white/[0.03] hover:bg-white/[0.06] text-gray-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-all"
          title="Abrir o Telão 3D público em uma nova aba"
        >
          <span>Ver Telão</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </header>
  );
}

export default OperatorHeader;
