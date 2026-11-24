import React from 'react';
import { AdminUsersPanel } from '../components/admin/AdminUsersPanel';
import { Shield, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * AdminPage — Painel Administrativo de Usuários (Milestone 5I).
 * Acessível apenas por usuários com role Admin (/admin).
 */
export function AdminPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8">
      {/* Page header */}
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link
            to="/operator/cockpit"
            className="p-2 rounded-xl border border-white/10 hover:border-white/20 text-gray-400 hover:text-white transition-all"
            title="Voltar ao cockpit"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center shadow-lg shadow-red-500/20">
              <Shield className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <span className="text-[11px] font-mono uppercase tracking-widest text-red-400 block">
                Painel Administrativo
              </span>
              <h1 className="text-lg font-bold text-white leading-none mt-0.5">
                Gestão de Usuários
              </h1>
            </div>
          </div>

          <div className="ml-auto px-3 py-1 rounded-xl bg-red-500/10 border border-red-500/30 text-[11px] font-mono uppercase text-red-400">
            Admin Only
          </div>
        </div>

        {/* Main panel */}
        <div className="glass-panel rounded-2xl p-5 md:p-6 border border-white/10">
          <AdminUsersPanel />
        </div>
      </div>
    </div>
  );
}

export default AdminPage;
