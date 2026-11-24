import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { StagePage } from './pages/StagePage';
import { LoginPage } from './pages/LoginPage';
import { AdminPage } from './pages/AdminPage';
import { OperatorLayout } from './components/operator/OperatorLayout';
import { OperatorCockpitTab } from './pages/operator/OperatorCockpitTab';
import { OperatorProjectsTab } from './pages/operator/OperatorProjectsTab';
import { OperatorEventTab } from './pages/operator/OperatorEventTab';
import { OperatorJuryTab } from './pages/operator/OperatorJuryTab';
import { OperatorProvider } from './contexts/OperatorContext';
import { AuthProvider } from './contexts/AuthContext';
import { RequireAuth } from './components/auth/RequireAuth';

/**
 * App — Orquestrador de Estado, Autenticação, Sincronização e Roteamento (Milestone 2C.5 / 3E / 5H / 5I).
 */
export default function App() {
  return (
    <AuthProvider>
      <OperatorProvider>
        <Routes>
          {/* Rota Raiz: redireciona para o Telão 3D */}
          <Route path="/" element={<Navigate to="/stage" replace />} />

          {/* Autenticação da Mesa Técnica */}
          <Route path="/login" element={<LoginPage />} />

          {/* Superfície Cênica: Telão Público 3D */}
          <Route path="/stage" element={<StagePage />} />

          {/* Painel Administrativo: restrito a Admin (Milestone 5I) */}
          <Route
            path="/admin"
            element={
              <RequireAuth allowedRoles={['Admin']}>
                <AdminPage />
              </RequireAuth>
            }
          />

          {/* Mesa Técnica Protegida: Cockpit do Operador com Sub-Navegação por Abas */}
          <Route
            path="/operator"
            element={
              <RequireAuth allowedRoles={['Admin', 'Operator']}>
                <OperatorLayout />
              </RequireAuth>
            }
          >
            <Route index element={<Navigate to="cockpit" replace />} />
            <Route path="cockpit" element={<OperatorCockpitTab />} />
            <Route path="projects" element={<OperatorProjectsTab />} />
            <Route path="event" element={<OperatorEventTab />} />
            <Route path="jury" element={<OperatorJuryTab />} />
          </Route>

          {/* Fallback de rotas desconhecidas */}
          <Route path="*" element={<Navigate to="/stage" replace />} />
        </Routes>
      </OperatorProvider>
    </AuthProvider>
  );
}
