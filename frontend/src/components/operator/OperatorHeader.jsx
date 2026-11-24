import React from 'react';
import { Radio, ExternalLink, LogOut, ShieldCheck, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

/**
 * OperatorHeader — Cabeçalho institucional, status de prontidão e sessão autenticada (Milestone 5H.2).
 */
export function OperatorHeader({ connectionStatus }) {
  const { user, logout, hasRole } = useAuth();

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

      <div className="flex flex-wrap items-center gap-3">
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

        {/* Painel Admin — visível apenas para Admin */}
        {hasRole('Admin') && (
          <Link
            to="/admin"
            className="px-3 py-2 rounded-xl border border-red-500/30 bg-red-500/5 hover:bg-red-500/15 text-red-300 hover:text-red-200 text-xs font-medium flex items-center gap-1.5 transition-all"
            title="Acessar Painel Administrativo"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Painel Admin</span>
          </Link>
        )}

        {/* Perfil do Usuário Autenticado + Logout */}
        {user && (
          <div className="flex items-center gap-2 pl-2 border-l border-white/10">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-gray-200 font-medium">{user.name}</span>
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-white/10 text-gray-300">
                {user.role}
              </span>
            </div>
            <button
              type="button"
              onClick={logout}
              title="Encerrar sessão"
              className="px-3 py-2 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-300 hover:text-red-200 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

export default OperatorHeader;
