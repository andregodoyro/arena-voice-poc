import React, { useState, useMemo } from 'react';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  UserCheck,
  ShieldAlert,
  Search,
  ExternalLink,
  Mail,
  Building,
  Briefcase,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { useOperatorContext } from '../../contexts/OperatorContext';
import { judgesApi } from '../../api/judgesApi';
import { JudgeModal } from '../../components/operator/JudgeModal';

/**
 * OperatorJuryTab — Gestão da Banca Avaliadora e Catálogo Global de Jurados (/operator/jury) (Milestone 3E).
 */
export function OperatorJuryTab() {
  const { currentEvent, jury, judges, refresh } = useOperatorContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [isJudgeModalOpen, setIsJudgeModalOpen] = useState(false);
  const [editingJudge, setEditingJudge] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null);

  // Modal para escolher jurado para uma cadeira específica
  const [assignModal, setAssignModal] = useState({ isOpen: false, chairId: null });

  // Mapa da banca ativa por ChairId (1..5)
  const juryByChair = useMemo(() => {
    const map = {};
    if (Array.isArray(jury)) {
      for (const item of jury) {
        map[item.chairId] = item.judge;
      }
    }
    return map;
  }, [jury]);

  // Lista de jurados filtrada por busca
  const filteredJudges = useMemo(() => {
    if (!Array.isArray(judges)) return [];
    const q = searchQuery.toLowerCase().trim();
    if (!q) return judges;
    return judges.filter(
      (j) =>
        j.name.toLowerCase().includes(q) ||
        j.company.toLowerCase().includes(q) ||
        j.role.toLowerCase().includes(q) ||
        (Array.isArray(j.expertise) && j.expertise.some((e) => e.toLowerCase().includes(q)))
    );
  }, [judges, searchQuery]);

  // ── AÇÕES DE CADASTRO / EDIÇÃO ──────────────────────────────────────────
  const handleOpenCreateJudge = () => {
    setEditingJudge(null);
    setIsJudgeModalOpen(true);
  };

  const handleOpenEditJudge = (judge) => {
    setEditingJudge(judge);
    setIsJudgeModalOpen(true);
  };

  const handleJudgeModalSubmit = async (payload) => {
    setIsSubmitting(true);
    try {
      if (editingJudge?.id) {
        await judgesApi.updateJudge(editingJudge.id, payload);
        setActionFeedback({ type: 'success', message: `Jurado "${payload.name}" atualizado!` });
      } else {
        await judgesApi.createJudge(payload);
        setActionFeedback({ type: 'success', message: `Jurado "${payload.name}" cadastrado com sucesso!` });
      }
      setIsJudgeModalOpen(false);
      await refresh();
    } catch (err) {
      setActionFeedback({ type: 'error', message: err.message || 'Erro ao salvar jurado' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteJudge = async (judge) => {
    if (!window.confirm(`Tem certeza que deseja excluir "${judge.name}" do catálogo?`)) return;
    try {
      await judgesApi.deleteJudge(judge.id);
      setActionFeedback({ type: 'success', message: `Jurado "${judge.name}" removido!` });
      await refresh();
    } catch (err) {
      setActionFeedback({ type: 'error', message: err.message || 'Falha ao excluir jurado' });
    }
  };

  // ── AÇÕES DE ALOCAÇÃO NA BANCA DO EVENTO ATIVO ──────────────────────────
  const handleAssignChair = async (chairId, judgeId) => {
    if (!currentEvent?.id) {
      setActionFeedback({ type: 'error', message: 'Nenhum evento ativo na arena.' });
      return;
    }

    try {
      // Monta a nova lista de alocações para as 5 cadeiras
      const newAssignments = [];
      for (let c = 1; c <= 5; c++) {
        if (c === chairId) {
          if (judgeId) {
            newAssignments.push({ chairId: c, judgeId });
          }
        } else if (juryByChair[c]?.id) {
          // Mantém jurado atual da cadeira, a menos que seja o mesmo que está sendo movido
          if (juryByChair[c].id !== judgeId) {
            newAssignments.push({ chairId: c, judgeId: juryByChair[c].id });
          }
        }
      }

      await judgesApi.assignEventJury(currentEvent.id, newAssignments);
      setActionFeedback({ type: 'success', message: `Cadeira #${chairId} atualizada!` });
      setAssignModal({ isOpen: false, chairId: null });
      await refresh();
    } catch (err) {
      setActionFeedback({ type: 'error', message: err.message || 'Falha ao atualizar banca' });
    }
  };

  const handleRemoveFromChair = async (chairId) => {
    await handleAssignChair(chairId, null);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* ── ALERTA DE FEEDBACK TEMPORÁRIO ───────────────────────────────────── */}
      {actionFeedback && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between border ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            )}
            <span>{actionFeedback.message}</span>
          </div>
          <button onClick={() => setActionFeedback(null)} className="text-gray-400 hover:text-white text-xs">
            ✕
          </button>
        </div>
      )}

      {/* ── SEÇÃO 1: BANCA OFICIAL DA ARENA (EVENTO ATIVO) ──────────────────── */}
      <section className="p-6 rounded-2xl bg-gray-900/60 border border-white/10 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse" />
              <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>Banca Oficial da Arena (5 Cadeiras)</span>
              </h2>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Evento Ativo:{' '}
              <strong className="text-white">{currentEvent?.title || 'Nenhum evento ativo'}</strong>
              {currentEvent?.id && <span className="text-gray-500 text-[10px] ml-1.5 font-mono">#{currentEvent.id}</span>}
            </p>
          </div>

          <div className="text-xs text-gray-400 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-purple-400" />
            <span>
              {Object.keys(juryByChair).length} de 5 Cadeiras Ocupadas
            </span>
          </div>
        </div>

        {/* Grid das 5 Cadeiras */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((chairId) => {
            const judge = juryByChair[chairId];
            return (
              <div
                key={chairId}
                className={`p-4 rounded-xl border flex flex-col justify-between transition-all duration-200 relative overflow-hidden ${
                  judge
                    ? 'bg-purple-950/20 border-purple-500/30 hover:border-purple-500/50'
                    : 'bg-black/30 border-dashed border-white/10 hover:border-white/20'
                }`}
              >
                {/* Badge da Cadeira */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-black/50 border border-white/10 text-purple-300">
                    CADEIRA #{chairId}
                  </span>
                  {judge && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400" title="Jurado Alocado" />
                  )}
                </div>

                {/* Conteúdo do Jurado */}
                {judge ? (
                  <div className="flex flex-col items-center text-center space-y-2 py-2">
                    <img
                      src={judge.avatarUrl || '/samples/judges/camila.png'}
                      alt={judge.name}
                      onError={(e) => {
                        e.target.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(judge.name);
                      }}
                      className="w-14 h-14 rounded-full object-cover border-2 border-purple-500/40 shadow-lg"
                    />
                    <div>
                      <h3 className="text-sm font-bold text-white truncate max-w-[150px]">{judge.name}</h3>
                      <p className="text-[11px] text-purple-300 truncate max-w-[150px]">{judge.company}</p>
                      <p className="text-[10px] text-gray-400 truncate max-w-[150px]">{judge.role}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center py-6 text-gray-500 space-y-1">
                    <Users className="w-8 h-8 opacity-30" />
                    <span className="text-xs">Cadeira Vazia</span>
                  </div>
                )}

                {/* Ações da Cadeira */}
                <div className="pt-3 border-t border-white/5 flex items-center gap-1.5 mt-2">
                  <button
                    onClick={() => setAssignModal({ isOpen: true, chairId })}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-semibold text-gray-300 hover:text-white transition-colors"
                  >
                    {judge ? 'Alterar' : 'Designar'}
                  </button>
                  {judge && (
                    <button
                      onClick={() => handleRemoveFromChair(chairId)}
                      title="Desocupar cadeira"
                      className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── SEÇÃO 2: CATÁLOGO GLOBAL DE JURADOS ─────────────────────────────── */}
      <section className="p-6 rounded-2xl bg-gray-900/60 border border-white/10 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" />
              <span>Catálogo Global de Jurados</span>
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Banco permanente de especialistas e investidores cadastrados na plataforma
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Input de Busca */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar jurado..."
                className="pl-8 pr-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-purple-500/50"
              />
            </div>

            <button
              onClick={handleOpenCreateJudge}
              className="px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 rounded-xl shadow-lg shadow-purple-600/30 flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo Jurado</span>
            </button>
          </div>
        </div>

        {/* Grid de Cards de Jurados */}
        {filteredJudges.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhum jurado encontrado.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredJudges.map((judge) => {
              // Verifica se está alocado no evento ativo
              const assignedChair = Object.entries(juryByChair).find(
                ([_, j]) => j?.id === judge.id
              )?.[0];

              return (
                <div
                  key={judge.id}
                  className="p-4 rounded-xl bg-black/40 border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <img
                      src={judge.avatarUrl || '/samples/judges/camila.png'}
                      alt={judge.name}
                      onError={(e) => {
                        e.target.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(judge.name);
                      }}
                      className="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h3 className="text-sm font-bold text-white truncate">{judge.name}</h3>
                        {assignedChair && (
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
                            Cadeira #{assignedChair}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-purple-300 truncate flex items-center gap-1">
                        <Building className="w-3 h-3 shrink-0" />
                        <span>{judge.company}</span>
                      </p>
                      <p className="text-[11px] text-gray-400 truncate flex items-center gap-1">
                        <Briefcase className="w-3 h-3 shrink-0" />
                        <span>{judge.role}</span>
                      </p>
                    </div>
                  </div>

                  {judge.bio && (
                    <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed">
                      {judge.bio}
                    </p>
                  )}

                  {Array.isArray(judge.expertise) && judge.expertise.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {judge.expertise.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-white/5 text-gray-400 text-[10px] border border-white/5"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-2">
                      {judge.email && (
                        <a
                          href={`mailto:${judge.email}`}
                          title={judge.email}
                          className="text-gray-400 hover:text-white"
                        >
                          <Mail className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {judge.socialUrl && (
                        <a
                          href={judge.socialUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="LinkedIn / Portfólio"
                          className="text-gray-400 hover:text-white"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditJudge(judge)}
                        className="p-1 text-gray-400 hover:text-white rounded hover:bg-white/5 transition-colors"
                        title="Editar Jurado"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteJudge(judge)}
                        className="p-1 text-gray-400 hover:text-red-400 rounded hover:bg-white/5 transition-colors"
                        title="Remover do Catálogo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── MODAL: CADASTRAR / EDITAR JURADO ─────────────────────────────────── */}
      <JudgeModal
        isOpen={isJudgeModalOpen}
        onClose={() => setIsJudgeModalOpen(false)}
        onSubmit={handleJudgeModalSubmit}
        initialJudge={editingJudge}
        isSubmitting={isSubmitting}
      />

      {/* ── MODAL: SELECIONAR JURADO PARA UMA CADEIRA ───────────────────────── */}
      {assignModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-lg bg-gray-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">
                  Designar Jurado para Cadeira #{assignModal.chairId}
                </h3>
                <p className="text-xs text-gray-400">
                  Selecione um especialista do catálogo para ocupar esta posição no palco
                </p>
              </div>
              <button
                onClick={() => setAssignModal({ isOpen: false, chairId: null })}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {judges
                .filter((j) => j.isActive)
                .map((judge) => {
                  const isCurrent = juryByChair[assignModal.chairId]?.id === judge.id;
                  const isOccupyingOtherChair = Object.entries(juryByChair).find(
                    ([c, j]) => j?.id === judge.id && Number(c) !== assignModal.chairId
                  );

                  return (
                    <div
                      key={judge.id}
                      onClick={() => handleAssignChair(assignModal.chairId, judge.id)}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        isCurrent
                          ? 'bg-purple-950/40 border-purple-500/60'
                          : 'bg-black/40 border-white/5 hover:border-purple-500/30 hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={judge.avatarUrl || '/samples/judges/camila.png'}
                          alt={judge.name}
                          className="w-10 h-10 rounded-full object-cover border border-white/10"
                        />
                        <div>
                          <h4 className="text-xs font-bold text-white">{judge.name}</h4>
                          <p className="text-[11px] text-gray-400">{judge.company} · {judge.role}</p>
                        </div>
                      </div>

                      {isCurrent ? (
                        <span className="text-[10px] font-bold text-purple-400 bg-purple-500/20 px-2 py-0.5 rounded">
                          Atual
                        </span>
                      ) : isOccupyingOtherChair ? (
                        <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                          Mover da Cadeira #{isOccupyingOtherChair[0]}
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-400 bg-white/5 px-2 py-0.5 rounded">
                          Selecionar
                        </span>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OperatorJuryTab;
