import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { StagePage } from './pages/StagePage';
import { OperatorLayout } from './components/operator/OperatorLayout';
import { OperatorCockpitTab } from './pages/operator/OperatorCockpitTab';
import { OperatorProjectsTab } from './pages/operator/OperatorProjectsTab';
import { OperatorEventTab } from './pages/operator/OperatorEventTab';
import { OperatorProvider } from './contexts/OperatorContext';

/**
 * App — Orquestrador de Estado, Sincronização e Roteamento (Milestone 2C.5).
 * 
 * Centraliza o OperatorProvider com uma única conexão WebSocket ativa para todo o ciclo de vida.
 * Mantém a fonte da verdade compartilhada (snapshot autoritativo + aceleração via SignalR)
 * e delega a renderização para as superfícies /stage e /operator via React Router.
 */
export default function App() {
  return (
    <OperatorProvider>
      <Routes>
        {/* Rota Raiz: redireciona para o Telão 3D */}
        <Route path="/" element={<Navigate to="/stage" replace />} />

        {/* Superfície Cênica: Telão Público 3D */}
        <Route path="/stage" element={<StagePage />} />

        {/* Mesa Técnica: Cockpit do Operador com Sub-Navegação por Abas */}
        <Route path="/operator" element={<OperatorLayout />}>
          <Route index element={<Navigate to="cockpit" replace />} />
          <Route path="cockpit" element={<OperatorCockpitTab />} />
          <Route path="projects" element={<OperatorProjectsTab />} />
          <Route path="event" element={<OperatorEventTab />} />
        </Route>

        {/* Fallback de rotas desconhecidas */}
        <Route path="*" element={<Navigate to="/stage" replace />} />
      </Routes>
    </OperatorProvider>
  );
}
