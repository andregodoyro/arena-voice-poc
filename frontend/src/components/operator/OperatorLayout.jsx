import React from 'react';
import { Outlet } from 'react-router-dom';
import { OperatorHeader } from './OperatorHeader';
import { OperatorNavTabs } from './OperatorNavTabs';

/**
 * OperatorLayout — Layout Unificado da Mesa Técnica (Milestone 2C.1 / ADR-007).
 * 
 * Mantém o cabeçalho institucional, o indicador de prontidão de rede
 * e as abas de navegação persistentes em todas as sub-rotas (/operator/*).
 */
export function OperatorLayout({ connectionStatus }) {
  return (
    <div className="min-h-screen w-full bg-[#040408] text-white flex flex-col justify-between p-4 md:p-6 select-none space-y-6">
      {/* ── HEADER OPERACIONAL & NAVEGAÇÃO UNIFICADA ───────────────────────── */}
      <div className="space-y-4">
        <OperatorHeader connectionStatus={connectionStatus} />
        <OperatorNavTabs />
      </div>

      {/* ── CONTEÚDO DINÂMICO DA ABA ATIVA ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col">
        <Outlet />
      </div>

      {/* ── FOOTER INSTITUCIONAL DISCRETO ──────────────────────────────────── */}
      <footer className="text-center text-xs text-gray-600 py-2">
        Arena Voice · Plataforma de Apresentação e Avaliação de Inovação
      </footer>
    </div>
  );
}

export default OperatorLayout;
