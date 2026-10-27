import React from 'react';
import { Outlet } from 'react-router-dom';
import { OperatorHeader } from './OperatorHeader';
import { OperatorNavTabs } from './OperatorNavTabs';
import { OperatorProvider } from '../../contexts/OperatorContext';

/**
 * OperatorLayout — Layout Unificado da Mesa Técnica (Milestone 2C.1 / ADR-007).
 * 
 * Mantém o cabeçalho institucional, o indicador de prontidão de rede,
 * o OperatorProvider com dados de estado/projetos/evento e as abas de navegação
 * persistentes em todas as sub-rotas (/operator/*).
 */
export function OperatorLayout({ connectionStatus, children }) {
  return (
    <OperatorProvider>
      <div className="min-h-screen w-full bg-[#040408] text-white flex flex-col justify-between p-4 md:p-6 select-none space-y-6">
        {/* ── HEADER OPERACIONAL & NAVEGAÇÃO UNIFICADA ───────────────────────── */}
        <div className="space-y-4">
          <OperatorHeader connectionStatus={connectionStatus} />
          <OperatorNavTabs />
        </div>

        {/* ── CONTEÚDO DINÂMICO DA ABA ATIVA OU FILHO DIRETO ────────────────── */}
        <div className="flex-1 flex flex-col">
          {children || <Outlet />}
        </div>

        {/* ── FOOTER INSTITUCIONAL DISCRETO ──────────────────────────────────── */}
        <footer className="text-center text-xs text-gray-600 py-2">
          Arena Voice · Plataforma de Apresentação e Avaliação de Inovação
        </footer>
      </div>
    </OperatorProvider>
  );
}

export default OperatorLayout;
