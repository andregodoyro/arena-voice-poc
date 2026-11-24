import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Lock, Mail, ArrowRight, Tv, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const targetPath = location.state?.from?.pathname || '/operator/cockpit';

  useEffect(() => {
    if (isAuthenticated) {
      navigate(targetPath, { replace: true });
    }
  }, [isAuthenticated, navigate, targetPath]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);

    try {
      await login(email.trim(), password);
      navigate(targetPath, { replace: true });
    } catch (err) {
      setErrorMsg(err.message || 'Falha ao autenticar. Verifique suas credenciais.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Glow cênico de fundo */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[560px] h-[560px] rounded-full bg-red-600/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md bg-gray-900/90 border border-white/10 rounded-2xl p-8 shadow-2xl backdrop-blur-xl relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-widest text-red-400">
              Arena Voice · Mesa Técnica
            </span>
            <h1 className="text-2xl font-bold text-white mt-1">Acesso Operacional</h1>
          </div>
          <div className="w-11 h-11 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center">
            <Lock className="w-5 h-5 text-red-400" />
          </div>
        </div>

        {errorMsg && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 flex items-start gap-2.5 text-sm text-red-200">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="block text-xs font-medium text-gray-300 mb-1.5">
              E-mail
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operador@arenavoice.local"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500/60"
              />
            </div>
          </div>

          <div>
            <label htmlFor="login-password" className="block text-xs font-medium text-gray-300 mb-1.5">
              Senha
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="login-password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500/60"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors shadow-lg shadow-red-600/20 cursor-pointer"
          >
            {submitting ? 'Autenticando...' : 'Entrar na Mesa Técnica'}
            {!submitting && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-between text-xs text-gray-400">
          <Link
            to="/stage"
            className="inline-flex items-center gap-1.5 text-gray-300 hover:text-white transition-colors"
          >
            <Tv className="w-3.5 h-3.5" />
            Voltar ao Telão (/stage)
          </Link>
          <span className="font-mono text-[11px] text-gray-500">JWT · RBAC</span>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
