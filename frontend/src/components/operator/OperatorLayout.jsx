import React from 'react';
import { Outlet } from 'react-router-dom';
import { OperatorHeader } from './OperatorHeader';
import { OperatorNavTabs } from './OperatorNavTabs';
import { useOperatorContext } from '../../contexts/OperatorContext';

/**
 * OperatorLayout — Layout Unificado da Mesa Técnica (Milestone 2C.1 / ADR-007).
 * 
 * Mantém o cabeçalho institucional, o indicador de prontidão de rede/resync,
 * e as abas de navegação persistentes em todas as sub-rotas (/operator/*).
 * 
 * Permite rolagem vertical fluida (overflow-y: auto) para acomodar listas
 * extensas de projetos preservando o cabeçalho e footer.
 */
export function OperatorLayout({ connectionStatus: propsStatus, children }) {
  const { connectionStatus: contextStatus, isResyncing } = useOperatorContext();
  const effectiveStatus = propsStatus || (isResyncing ? 'RESSINCRONIZANDO' : contextStatus);

  return (
    <div className="min-h-screen w-full bg-[#040408] text-white flex flex-col justify-between p-4 md:p-6 space-y-6">
      {/* ── HEADER OPERACIONAL & NAVEGAÇÃO UNIFICADA ───────────────────────── */}
      <header className="space-y-4 shrink-0">
        <OperatorHeader connectionStatus={effectiveStatus} />
        <OperatorNavTabs />
      </header>

      {/* ── CONTEÚDO DINÂMICO DA ABA ATIVA OU FILHO DIRETO ────────────────── */}
      <main className="flex-1 flex flex-col min-h-0">
        {children || <Outlet />}
      </main>

      {/* ── FOOTER INSTITUCIONAL DISCRETO ──────────────────────────────────── */}
      <footer className="text-center text-xs text-gray-600 py-2 shrink-0">
        Arena Voice · Plataforma de Apresentação e Avaliação de Inovação
      </footer>
    </div>
  );
}

export default OperatorLayout;
