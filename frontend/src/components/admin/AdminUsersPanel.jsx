import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Plus,
  Search,
  Shield,
  ShieldOff,
  Edit2,
  Lock,
  UserCheck,
  UserX,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  X,
  Eye,
  EyeOff,
} from 'lucide-react';
import { adminApi } from '../../api/adminApi';

const ROLES = ['Admin', 'Operator', 'Viewer'];

const ROLE_COLORS = {
  Admin: 'text-red-400 bg-red-500/10 border-red-500/30',
  Operator: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  Viewer: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
};

function Badge({ role }) {
  return (
    <span
      className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${ROLE_COLORS[role] ?? 'text-gray-400 bg-white/5 border-white/10'}`}
    >
      {role}
    </span>
  );
}

function StatusDot({ active }) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${active ? 'bg-emerald-400' : 'bg-gray-600'}`}
      title={active ? 'Ativo' : 'Inativo'}
    />
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function FormField({ label, children }) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-medium text-gray-400 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputClass =
  'w-full bg-gray-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition-all';

// ── Create User Modal ────────────────────────────────────────────────────────
function CreateUserModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'Operator' });
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const user = await adminApi.createUser(form);
      onCreated(user);
      onClose();
    } catch (err) {
      setError(err.message || 'Erro ao criar usuário.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Criar Usuário" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-sm text-red-300 flex gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            {error}
          </div>
        )}
        <FormField label="Nome completo">
          <input
            className={inputClass}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ex: João Silva"
            required
          />
        </FormField>
        <FormField label="E-mail">
          <input
            type="email"
            className={inputClass}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="usuario@arenavoice.local"
            required
          />
        </FormField>
        <FormField label="Senha">
          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'}
              className={inputClass + ' pr-10'}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Mínimo 8 caracteres"
              required
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              onClick={() => setShowPass((v) => !v)}
            >
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </FormField>
        <FormField label="Perfil (role)">
          <select
            className={inputClass}
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </FormField>
        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-sm text-gray-300 hover:text-white hover:border-white/20 transition-all"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-all disabled:opacity-50"
          >
            {submitting ? 'Criando...' : 'Criar Usuário'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Edit User Modal ──────────────────────────────────────────────────────────
function EditUserModal({ user, onClose, onUpdated }) {
  const [form, setForm] = useState({ name: user.name, email: user.email, role: user.role });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const updated = await adminApi.updateUser(user.id, form);
      onUpdated(updated);
      onClose();
    } catch (err) {
      setError(err.message || 'Erro ao atualizar usuário.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title={`Editar: ${user.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-sm text-red-300 flex gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            {error}
          </div>
        )}
        <FormField label="Nome">
          <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </FormField>
        <FormField label="E-mail">
          <input type="email" className={inputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        </FormField>
        <FormField label="Perfil (role)">
          <select className={inputClass} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            {ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </FormField>
        <div className="flex gap-3 mt-6">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-sm text-gray-300 hover:text-white hover:border-white/20 transition-all">
            Cancelar
          </button>
          <button type="submit" disabled={submitting} className="flex-1 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold transition-all disabled:opacity-50">
            {submitting ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Reset Password Modal ─────────────────────────────────────────────────────
function ResetPasswordModal({ user, onClose }) {
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await adminApi.resetPassword(user.id, password);
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Erro ao redefinir senha.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title={`Redefinir Senha: ${user.name}`} onClose={onClose}>
      {success ? (
        <div className="text-center py-4">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
          <p className="text-sm text-gray-300">Senha redefinida com sucesso.</p>
          <p className="text-xs text-gray-500 mt-1">Todas as sessões ativas foram invalidadas.</p>
          <button onClick={onClose} className="mt-5 px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-semibold transition-all">
            Fechar
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-sm text-red-300 flex gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}
          <p className="text-sm text-gray-400 mb-4">
            A senha antiga será invalidada imediatamente, e todas as sessões ativas do usuário serão encerradas.
          </p>
          <FormField label="Nova senha">
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                className={inputClass + ' pr-10'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                required
              />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" onClick={() => setShowPass((v) => !v)}>
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </FormField>
          <div className="flex gap-3 mt-6">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-sm text-gray-300 hover:text-white hover:border-white/20 transition-all">
              Cancelar
            </button>
            <button type="submit" disabled={submitting} className="flex-1 px-4 py-2.5 rounded-xl bg-red-700 hover:bg-red-600 text-white text-sm font-semibold transition-all disabled:opacity-50">
              {submitting ? 'Redefinindo...' : 'Redefinir Senha'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

// ── Main Admin Users Panel ───────────────────────────────────────────────────
export function AdminUsersPanel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // null | 'create' | { type: 'edit'|'resetPass', user }

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminApi.listUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Erro ao carregar usuários.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleToggleActive = async (user) => {
    try {
      if (user.isActive) {
        await adminApi.deactivateUser(user.id);
      } else {
        await adminApi.activateUser(user.id);
      }
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, isActive: !u.isActive } : u))
      );
    } catch (err) {
      setError(err.message || 'Erro ao alterar status.');
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/30 flex items-center justify-center">
            <Shield className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Usuários do Sistema</h2>
            <p className="text-[11px] text-gray-500">{users.length} usuário{users.length !== 1 ? 's' : ''} cadastrado{users.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={fetchUsers}
            disabled={loading}
            className="p-2 rounded-xl border border-white/10 hover:border-white/20 text-gray-400 hover:text-white transition-all disabled:opacity-50"
            title="Atualizar lista"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setModal('create')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Novo Usuário
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
        <input
          className="w-full bg-gray-900/60 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/20 transition-all"
          placeholder="Buscar por nome, e-mail ou perfil..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-sm text-red-300 flex gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-white/[0.03] border-b border-white/10 text-left">
              <th className="px-4 py-3 text-xs text-gray-500 font-medium">Status</th>
              <th className="px-4 py-3 text-xs text-gray-500 font-medium">Usuário</th>
              <th className="px-4 py-3 text-xs text-gray-500 font-medium hidden md:table-cell">E-mail</th>
              <th className="px-4 py-3 text-xs text-gray-500 font-medium">Perfil</th>
              <th className="px-4 py-3 text-xs text-gray-500 font-medium hidden lg:table-cell">Último acesso</th>
              <th className="px-4 py-3 text-xs text-gray-500 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                  Carregando usuários...
                </td>
              </tr>
            )}
            {!loading && filteredUsers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                  {search ? 'Nenhum usuário encontrado para a busca.' : 'Nenhum usuário cadastrado.'}
                </td>
              </tr>
            )}
            {filteredUsers.map((user) => (
              <tr
                key={user.id}
                className={`border-b border-white/5 hover:bg-white/[0.02] transition-colors ${!user.isActive ? 'opacity-50' : ''}`}
              >
                <td className="px-4 py-3">
                  <StatusDot active={user.isActive} />
                </td>
                <td className="px-4 py-3">
                  <span className="text-white font-medium">{user.name}</span>
                  <span className="block text-[11px] text-gray-500 md:hidden">{user.email}</span>
                </td>
                <td className="px-4 py-3 text-gray-400 hidden md:table-cell">{user.email}</td>
                <td className="px-4 py-3">
                  <Badge role={user.role} />
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs hidden lg:table-cell">
                  {user.lastLoginAt
                    ? new Date(user.lastLoginAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
                    : '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {/* Editar */}
                    <button
                      type="button"
                      title="Editar usuário"
                      onClick={() => setModal({ type: 'edit', user })}
                      className="p-1.5 rounded-lg border border-white/10 hover:border-amber-500/40 text-gray-400 hover:text-amber-400 transition-all"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Redefinir senha */}
                    <button
                      type="button"
                      title="Redefinir senha"
                      onClick={() => setModal({ type: 'resetPass', user })}
                      className="p-1.5 rounded-lg border border-white/10 hover:border-sky-500/40 text-gray-400 hover:text-sky-400 transition-all"
                    >
                      <Lock className="w-3.5 h-3.5" />
                    </button>

                    {/* Ativar / Desativar */}
                    <button
                      type="button"
                      title={user.isActive ? 'Desativar conta' : 'Ativar conta'}
                      onClick={() => handleToggleActive(user)}
                      className={`p-1.5 rounded-lg border transition-all ${
                        user.isActive
                          ? 'border-white/10 hover:border-red-500/40 text-gray-400 hover:text-red-400'
                          : 'border-white/10 hover:border-emerald-500/40 text-gray-400 hover:text-emerald-400'
                      }`}
                    >
                      {user.isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {modal === 'create' && (
        <CreateUserModal
          onClose={() => setModal(null)}
          onCreated={(newUser) => setUsers((prev) => [...prev, newUser])}
        />
      )}
      {modal?.type === 'edit' && (
        <EditUserModal
          user={modal.user}
          onClose={() => setModal(null)}
          onUpdated={(updated) =>
            setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)))
          }
        />
      )}
      {modal?.type === 'resetPass' && (
        <ResetPasswordModal user={modal.user} onClose={() => setModal(null)} />
      )}
    </div>
  );
}

export default AdminUsersPanel;
