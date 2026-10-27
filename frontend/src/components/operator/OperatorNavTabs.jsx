import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, Sliders } from 'lucide-react';

/**
 * OperatorNavTabs — Sub-navegação por abas contextuais da mesa técnica.
 * 
 * Implementa a navegação unificada do cockpit conforme ADR-007:
 * - /operator/cockpit  -> Telemetria ao vivo das cadeiras, placar e reset
 * - /operator/projects -> Gestão de startups, pitches e seleção de palco
 * - /operator/event    -> Configurações de sessão e identidade visual (branding)
 */
export function OperatorNavTabs() {
  const tabs = [
    {
      to: '/operator/cockpit',
      label: 'Cockpit ao Vivo',
      icon: LayoutDashboard,
      title: 'Monitoramento das cadeiras, placar e controle da arena',
    },
    {
      to: '/operator/projects',
      label: 'Fila de Projetos',
      icon: FolderKanban,
      title: 'Pitches, startups e seleção de palco',
    },
    {
      to: '/operator/event',
      label: 'Configurações do Evento',
      icon: Sliders,
      title: 'Identidade visual, branding cênico e dados do evento',
    },
  ];

  return (
    <nav className="flex items-center gap-2 overflow-x-auto pb-1" aria-label="Navegação da Mesa Técnica">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            title={tab.title}
            className={({ isActive }) => `
              px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all duration-200 border
              ${isActive
                ? 'bg-red-950/40 border-red-500/50 text-white shadow-lg shadow-red-950/30'
                : 'bg-white/[0.03] border-white/5 text-gray-400 hover:text-gray-200 hover:bg-white/[0.06] hover:border-white/10'
              }
            `}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span>{tab.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

export default OperatorNavTabs;
