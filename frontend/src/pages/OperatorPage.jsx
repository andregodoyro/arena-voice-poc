import React from 'react';
import { Radio, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';

/**
 * OperatorPage — Superfície Operacional e Administrativa (Placeholder Controlado).
 * 
 * Nesta etapa da Fase 1, atua como comprovação funcional de que a rota /operator
 * opera de forma independente do telão público, utilizando exclusivamente linguagem de produto.
 */
export function OperatorPage({ connectionStatus }) {
  // Tradução do estado interno para linguagem operacional de produto
  const getProductStatus = () => {
    switch (connectionStatus) {
      case 'CONECTADO':
        return {
          label: 'Sistema Pronto',
          colorClass: 'text-emerald-400 border-emerald-500/40 bg-emerald-950/30',
          dotClass: 'bg-emerald-400',
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
    <div className="min-h-screen w-full bg-[#040408] text-white flex flex-col justify-between p-6 select-none">
      {/* ── HEADER OPERACIONAL ──────────────────────────────────────────────── */}
      <header className="glass-panel rounded-2xl p-5 flex items-center justify-between border border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-amber-500 flex items-center justify-center shadow-lg shadow-red-500/30">
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

        {/* Indicador Operacional de Produto */}
        <div className={`px-4 py-2 rounded-xl border flex items-center gap-2.5 text-xs font-semibold ${status.colorClass}`}>
          <span className={`w-2.5 h-2.5 rounded-full ${status.dotClass}`} />
          <span>{status.label}</span>
        </div>
      </header>

      {/* ── CORPO CENTRAL (PLACEHOLDER CONTROLADO) ──────────────────────────── */}
      <main className="flex-1 flex items-center justify-center py-12">
        <div className="glass-panel rounded-3xl p-8 max-w-lg w-full text-center border border-white/10 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-5 text-gray-300">
            <ShieldCheck className="w-7 h-7 text-amber-400" />
          </div>

          <h2 className="text-xl font-bold text-white mb-2">
            Fase 1 — Operator Foundation
          </h2>

          <p className="text-sm text-gray-400 leading-relaxed mb-6">
            A infraestrutura de navegação independente da mesa técnica foi inicializada com sucesso.
            A estrutura operacional da Arena será habilitada nos próximos passos desta fase.
          </p>

          <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-4 text-xs text-gray-400 text-left space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-500 uppercase tracking-wider text-[10px] font-semibold">Superfície</span>
              <span className="font-medium text-gray-300">Operação Local</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500 uppercase tracking-wider text-[10px] font-semibold">Destino do Telão</span>
              <span className="font-medium text-gray-300">/stage</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500 uppercase tracking-wider text-[10px] font-semibold">Estado do Cockpit</span>
              <span className="font-medium text-emerald-400">Ativo</span>
            </div>
          </div>
        </div>
      </main>

      {/* ── FOOTER DISCRETO ─────────────────────────────────────────────────── */}
      <footer className="text-center text-xs text-gray-600">
        Arena Voice · Plataforma de Apresentação e Avaliação de Inovação
      </footer>
    </div>
  );
}

export default OperatorPage;
