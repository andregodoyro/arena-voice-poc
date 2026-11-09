import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Building,
  Briefcase,
  Image as ImageIcon,
  Mail,
  Globe,
  Tag,
  FileText,
  AlertCircle,
  Loader2,
  CheckCircle,
} from 'lucide-react';

/**
 * JudgeModal — Modal para cadastro e edição de jurados no catálogo global (Milestone 3E).
 */
export function JudgeModal({
  isOpen,
  onClose,
  onSubmit,
  initialJudge = null,
  isSubmitting = false,
}) {
  const isEditing = Boolean(initialJudge?.id);

  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bio, setBio] = useState('');
  const [expertise, setExpertise] = useState('');
  const [email, setEmail] = useState('');
  const [socialUrl, setSocialUrl] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (initialJudge) {
      setName(initialJudge.name || '');
      setCompany(initialJudge.company || '');
      setRole(initialJudge.role || '');
      setAvatarUrl(initialJudge.avatarUrl || '');
      setBio(initialJudge.bio || '');
      setExpertise(Array.isArray(initialJudge.expertise) ? initialJudge.expertise.join(', ') : '');
      setEmail(initialJudge.email || '');
      setSocialUrl(initialJudge.socialUrl || '');
      setIsActive(initialJudge.isActive ?? true);
    } else {
      setName('');
      setCompany('');
      setRole('');
      setAvatarUrl('/samples/judges/default-avatar.png');
      setBio('');
      setExpertise('');
      setEmail('');
      setSocialUrl('');
      setIsActive(true);
    }
    setErrorMsg(null);
  }, [initialJudge, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || name.trim().length < 3) {
      setErrorMsg('O nome do jurado deve ter no mínimo 3 caracteres.');
      return;
    }
    if (!company.trim()) {
      setErrorMsg('A empresa/organização é obrigatória.');
      return;
    }
    if (!role.trim()) {
      setErrorMsg('O cargo é obrigatório.');
      return;
    }
    if (!avatarUrl.trim()) {
      setErrorMsg('A URL da foto/avatar é obrigatória.');
      return;
    }

    const payload = {
      name: name.trim(),
      company: company.trim(),
      role: role.trim(),
      avatarUrl: avatarUrl.trim(),
      bio: bio.trim() || null,
      expertise: expertise
        ? expertise.split(',').map((t) => t.trim()).filter(Boolean)
        : null,
      email: email.trim() || null,
      socialUrl: socialUrl.trim() || null,
      isActive: Boolean(isActive),
    };

    onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-gray-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {isEditing ? 'Editar Jurado' : 'Novo Jurado'}
              </h2>
              <p className="text-xs text-gray-400">
                {isEditing
                  ? `Atualizando perfil de ${initialJudge.name}`
                  : 'Cadastre um novo especialista para a banca da Arena'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nome */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-purple-400" />
                <span>Nome Completo *</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ex: Camila Farani"
                maxLength={100}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-purple-500/50"
              />
            </div>

            {/* Empresa */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-purple-400" />
                <span>Empresa / Organização *</span>
              </label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="ex: G2 Capital"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-purple-500/50"
              />
            </div>

            {/* Cargo */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-purple-400" />
                <span>Cargo / Função *</span>
              </label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="ex: Shark Investor & Chair"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-purple-500/50"
              />
            </div>

            {/* URL da Foto/Avatar */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
                <span>URL da Foto / Avatar *</span>
              </label>
              <input
                type="text"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="/samples/judges/avatar.png ou https://..."
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-purple-500/50"
              />
            </div>

            {/* E-mail (Preventivo) */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-purple-400" />
                <span>E-mail Institucional</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jurado@fundo.com.br"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-purple-500/50"
              />
            </div>

            {/* LinkedIn / Social */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-purple-400" />
                <span>LinkedIn ou Perfil Web</span>
              </label>
              <input
                type="url"
                value={socialUrl}
                onChange={(e) => setSocialUrl(e.target.value)}
                placeholder="https://linkedin.com/in/..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-purple-500/50"
              />
            </div>
          </div>

          {/* Especialidades / Tags */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-purple-400" />
              <span>Especialidades (separadas por vírgula)</span>
            </label>
            <input
              type="text"
              value={expertise}
              onChange={(e) => setExpertise(e.target.value)}
              placeholder="ex: Fintech, Venture Capital, IA, ESG"
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-purple-500/50"
            />
          </div>

          {/* Mini-Bio */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-purple-400" />
              <span>Mini-Biografia</span>
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="Breve histórico profissional, realizações ou teses de investimento..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-purple-500/50 resize-none"
            />
          </div>

          {/* Status Ativo (Preventivo) */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
            <input
              type="checkbox"
              id="isActiveJudge"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-gray-800 border-gray-700"
            />
            <label htmlFor="isActiveJudge" className="text-xs text-gray-300 select-none cursor-pointer">
              <span className="font-semibold text-white">Jurado Disponível no Catálogo</span>
              <p className="text-[11px] text-gray-500">
                Se desmarcado, o jurado não poderá ser alocado em novas bancas de eventos.
              </p>
            </label>
          </div>

          {/* Botões do Rodapé */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 rounded-xl shadow-lg shadow-purple-600/30 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>{isEditing ? 'Salvar Alterações' : 'Cadastrar Jurado'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
export default JudgeModal;
