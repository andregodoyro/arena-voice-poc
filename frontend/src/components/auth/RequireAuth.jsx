import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

/**
 * RequireAuth — Proteção declarativa de rotas privadas (Milestone 5H.2).
 *
 * NOTA DE SEGURANÇA: A autorização real e inegociável ocorre no backend ASP.NET Core.
 * Este componente protege a experiência de navegação redirecionando não-autenticados para /login.
 */
export function RequireAuth({ children, allowedRoles = [] }) {
  const { isAuthenticated, isLoading, hasRole, user, logout } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400 font-mono">Validando sessão...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0 && !hasRole(...allowedRoles)) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-gray-900/90 border border-red-500/30 rounded-2xl p-8 text-center shadow-2xl">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center">
            <ShieldAlert className="w-7 h-7 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Acesso Restrito (403)</h1>
          <p className="text-sm text-gray-400 mb-6">
            O perfil atual (<span className="text-white font-semibold">{user?.role}</span>) não possui permissão para acessar o Painel de Operação.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/stage"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-sm font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Ir para o Palco
            </Link>
            <button
              type="button"
              onClick={logout}
              className="px-4 py-2.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-300 text-sm font-medium transition-colors"
            >
              Trocar Usuário
            </button>
          </div>
        </div>
      </div>
    );
  }

  return children;
}

export default RequireAuth;
