import React, { useState, useEffect, useMemo } from 'react';
import {
  Sliders,
  RefreshCw,
  Plus,
  Play,
  Flag,
  Archive,
  Sparkles,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import { useOperatorContext } from '../../contexts/OperatorContext';
import { eventsApi } from '../../api/eventsApi';
import { EventCard } from '../../components/operator/EventCard';
import { EventModal } from '../../components/operator/EventModal';
import { ConfirmDialog } from '../../components/operator/ConfirmDialog';
import { ColorPreviewCard } from '../../components/operator/ColorPreviewCard';
import { EVENT_STATUS } from '../../utils/eventStatus';

/**
 * OperatorEventTab — Aba de Gestão Completa do Ciclo de Vida de Eventos (/operator/event).
 * 
 * Milestone 3A: Transforma a aba em um Catálogo Corporativo com Ciclo de Vida:
 * - Card de Destaque: Evento Ativo na Arena com preview cênico e ação explícita de encerramento
 * - Catálogo Completo: Lista com filtros (Todos, Ativo, Prontos, Rascunhos, Encerrados, Arquivados)
 * - Operações: Criar, Editar, Duplicar, Ativar (sem finalizar o anterior), Encerrar, Arquivar
 */
export function OperatorEventTab() {
  const { currentEvent, eventsList, loading, refresh } = useOperatorContext();

  const [activeFilter, setActiveFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null);

  // Estados dos Diálogos de Confirmação
  const [activateConfirm, setActivateConfirm] = useState({ isOpen: false, event: null });
  const [finishConfirm, setFinishConfirm] = useState({ isOpen: false, event: null });
  const [archiveConfirm, setArchiveConfirm] = useState({ isOpen: false, event: null });

  // Auto-dismiss do feedback após 5 segundos
  useEffect(() => {
    if (!actionFeedback) return;
    const timer = setTimeout(() => {
      setActionFeedback(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [actionFeedback]);

  // Contadores por Status
  const counts = useMemo(() => {
    const list = Array.isArray(eventsList) ? eventsList : [];
    return {
      all: list.length,
      active: list.filter((e) => e.status === 2 || e.status === 'Active').length,
      ready: list.filter((e) => e.status === 1 || e.status === 'Ready').length,
      draft: list.filter((e) => e.status === 0 || e.status === 'Draft').length,
      finished: list.filter((e) => e.status === 3 || e.status === 'Finished').length,
      archived: list.filter((e) => e.status === 4 || e.status === 'Archived').length,
    };
  }, [eventsList]);

  // Lista Filtrada
  const filteredEvents = useMemo(() => {
    const list = Array.isArray(eventsList) ? eventsList : [];
    if (activeFilter === 'all') return list;
    if (activeFilter === 'active') return list.filter((e) => e.status === 2 || e.status === 'Active');
    if (activeFilter === 'ready') return list.filter((e) => e.status === 1 || e.status === 'Ready');
    if (activeFilter === 'draft') return list.filter((e) => e.status === 0 || e.status === 'Draft');
    if (activeFilter === 'finished') return list.filter((e) => e.status === 3 || e.status === 'Finished');
    if (activeFilter === 'archived') return list.filter((e) => e.status === 4 || e.status === 'Archived');
    return list;
  }, [eventsList, activeFilter]);

  // ── AÇÕES DO OPERADOR ───────────────────────────────────────────────────

  const handleOpenCreate = () => {
    setEditingEvent(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (evt) => {
    setEditingEvent(evt);
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (payload) => {
    setIsSubmitting(true);
    try {
      if (editingEvent?.id) {
        await eventsApi.updateEvent(editingEvent.id, payload);
        setActionFeedback({
          type: 'success',
          message: `Evento "${payload.title}" atualizado com sucesso!`,
        });
      } else {
        await eventsApi.createEvent(payload);
        setActionFeedback({
          type: 'success',
          message: `Evento "${payload.title}" criado no catálogo com sucesso!`,
        });
      }
      setIsModalOpen(false);
      await refresh();
    } catch (err) {
      console.error('[OperatorEventTab] Erro ao salvar evento:', err);
      setActionFeedback({
        type: 'error',
        message: err.message || 'Falha ao salvar o evento.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDuplicate = async (evt) => {
    setIsSubmitting(true);
    try {
      const res = await eventsApi.duplicateEvent(evt.id);
      setActionFeedback({
        type: 'success',
        message: `Evento "${res.title}" duplicado em status Rascunho com sucesso!`,
      });
      await refresh();
    } catch (err) {
      console.error('[OperatorEventTab] Erro ao duplicar evento:', err);
      setActionFeedback({
        type: 'error',
        message: err.message || 'Falha ao duplicar o evento.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Disparo e Execução de Ativação
  const handleRequestActivate = (evt) => {
    setActivateConfirm({ isOpen: true, event: evt });
  };

  const handleConfirmActivate = async () => {
    const evt = activateConfirm.event;
    if (!evt) return;
    setIsSubmitting(true);
    try {
      await eventsApi.activateEvent(evt.id);
      setActionFeedback({
        type: 'success',
        message: `Evento "${evt.title}" ativado no palco com sucesso! O evento anterior retornou para o status Pronto.`,
      });
      setActivateConfirm({ isOpen: false, event: null });
      await refresh();
    } catch (err) {
      console.error('[OperatorEventTab] Erro ao ativar evento:', err);
      setActionFeedback({
        type: 'error',
        message: err.message || 'Falha ao ativar evento no palco.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Disparo e Execução de Encerramento (Finish)
  const handleRequestFinish = (evt) => {
    setFinishConfirm({ isOpen: true, event: evt });
  };

  const handleConfirmFinish = async () => {
    const evt = finishConfirm.event;
    if (!evt) return;
    setIsSubmitting(true);
    try {
      await eventsApi.finishEvent(evt.id);
      setActionFeedback({
        type: 'success',
        message: `Evento "${evt.title}" encerrado formalmente com sucesso!`,
      });
      setFinishConfirm({ isOpen: false, event: null });
      await refresh();
    } catch (err) {
      console.error('[OperatorEventTab] Erro ao encerrar evento:', err);
      setActionFeedback({
        type: 'error',
        message: err.message || 'Falha ao encerrar evento.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Disparo e Execução de Arquivamento
  const handleRequestArchive = (evt) => {
    setArchiveConfirm({ isOpen: true, event: evt });
  };

  const handleConfirmArchive = async () => {
    const evt = archiveConfirm.event;
    if (!evt) return;
    setIsSubmitting(true);
    try {
      await eventsApi.archiveEvent(evt.id);
      setActionFeedback({
        type: 'success',
        message: `Evento "${evt.title}" arquivado no histórico.`,
      });
      setArchiveConfirm({ isOpen: false, event: null });
      await refresh();
    } catch (err) {
      console.error('[OperatorEventTab] Erro ao arquivar evento:', err);
      setActionFeedback({
        type: 'error',
        message: err.message || 'Falha ao arquivar evento.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col space-y-8">
      {/* ── BARRA SUPERIOR: TÍTULO, ESTATÍSTICAS E NOVO EVENTO ─────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Sliders className="w-6 h-6 text-amber-500" />
            <span>Gestão e Catálogo de Eventos</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Planejamento, ativação cênica e governança do ciclo de vida dos eventos da arena.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={refresh}
            disabled={loading || isSubmitting}
            className="px-3.5 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
            title="Recarregar catálogo"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            <span>Atualizar</span>
          </button>

          <button
            onClick={handleOpenCreate}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-gray-950 text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-amber-500/20"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Novo Evento</span>
          </button>
        </div>
      </div>

      {/* ── FEEDBACK DE AÇÃO OPERACIONAL (TOAST / BANNER) ────────────────────── */}
      {actionFeedback && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs animate-fadeIn ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {actionFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span className="font-medium">{actionFeedback.message}</span>
          </div>
          <button
            onClick={() => setActionFeedback(null)}
            className="text-gray-400 hover:text-white"
          >
            ×
          </button>
        </div>
      )}

      {/* ── SEÇÃO 1: EVENTO ATIVO NA ARENA FÍSICA (DESTAQUE CÊNICO) ──────────── */}
      {currentEvent ? (
        <div className="relative overflow-hidden rounded-3xl border border-emerald-500/40 bg-gradient-to-br from-gray-900/90 via-gray-900/60 to-emerald-950/40 p-6 shadow-xl shadow-emerald-950/20">
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border border-emerald-500/40 bg-emerald-500/20 text-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  EVENTO ATIVO NA ARENA
                </span>
                <span className="text-xs text-gray-400 font-mono">
                  #{currentEvent.id}
                </span>
              </div>

              <h3 className="text-2xl font-black text-white tracking-tight">
                {currentEvent.title}
              </h3>

              <p className="text-xs text-gray-300 leading-relaxed">
                {currentEvent.description || 'Nenhuma descrição detalhada informada.'}
              </p>

              {currentEvent.branding?.tagline && (
                <p className="text-xs text-amber-300 font-medium italic">
                  "{currentEvent.branding.tagline}"
                </p>
              )}

              {currentEvent.scheduledDate && (
                <div className="flex items-center gap-1.5 text-xs text-gray-400 pt-1">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span>
                    Agendado para:{' '}
                    {new Date(currentEvent.scheduledDate).toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              )}
            </div>

            {/* Ações e Visualizador Cromático do Evento Ativo */}
            <div className="w-full lg:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-4 shrink-0">
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 flex items-center gap-3">
                <div
                  className="w-7 h-7 rounded-full border border-white/20 shadow-md"
                  style={{ backgroundColor: currentEvent.branding?.primaryColor || '#d90429' }}
                  title="Cor Primária do Palco"
                />
                <div
                  className="w-7 h-7 rounded-full border border-white/20 shadow-md"
                  style={{ backgroundColor: currentEvent.branding?.secondaryColor || '#ffd166' }}
                  title="Cor Secundária do Palco"
                />
                <div className="text-[11px] text-gray-400 pr-2">
                  <span className="block text-white font-semibold">Branding Ativo</span>
                  <span>{currentEvent.branding?.primaryColor} / {currentEvent.branding?.secondaryColor}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenEdit(currentEvent)}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold transition-colors"
                >
                  Editar
                </button>

                <button
                  onClick={() => handleRequestFinish(currentEvent)}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span>Encerrar Evento</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-6 rounded-3xl border border-dashed border-white/10 bg-gray-900/30 text-center space-y-2">
          <p className="text-sm font-semibold text-gray-300">Nenhum evento ativo na arena no momento.</p>
          <p className="text-xs text-gray-500">Selecione um evento abaixo e clique em "Ativar no Palco" para carregar a ambientação e startups.</p>
        </div>
      )}

      {/* ── SEÇÃO 2: CATÁLOGO DE EVENTOS & FILTROS ───────────────────────────── */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Catálogo de Eventos ({filteredEvents.length})
            </h3>
          </div>

          {/* Abas / Filtros por Status */}
          <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/5 text-xs overflow-x-auto">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                activeFilter === 'all'
                  ? 'bg-amber-500 text-gray-950 font-bold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Todos ({counts.all})
            </button>
            <button
              onClick={() => setActiveFilter('active')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                activeFilter === 'active'
                  ? 'bg-emerald-500 text-gray-950 font-bold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Ativo ({counts.active})
            </button>
            <button
              onClick={() => setActiveFilter('ready')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                activeFilter === 'ready'
                  ? 'bg-amber-400 text-gray-950 font-bold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Prontos ({counts.ready})
            </button>
            <button
              onClick={() => setActiveFilter('draft')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                activeFilter === 'draft'
                  ? 'bg-gray-400 text-gray-950 font-bold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Rascunhos ({counts.draft})
            </button>
            <button
              onClick={() => setActiveFilter('finished')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                activeFilter === 'finished'
                  ? 'bg-blue-400 text-gray-950 font-bold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Encerrados ({counts.finished})
            </button>
            <button
              onClick={() => setActiveFilter('archived')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                activeFilter === 'archived'
                  ? 'bg-purple-400 text-gray-950 font-bold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Arquivados ({counts.archived})
            </button>
          </div>
        </div>

        {/* Grade de Cards de Eventos */}
        {filteredEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredEvents.map((evt) => {
              const isActive = currentEvent?.id === evt.id;
              return (
                <EventCard
                  key={evt.id}
                  event={evt}
                  isActive={isActive}
                  onActivate={handleRequestActivate}
                  onEdit={handleOpenEdit}
                  onDuplicate={handleDuplicate}
                  onFinish={handleRequestFinish}
                  onArchive={handleRequestArchive}
                />
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center rounded-2xl border border-white/5 bg-gray-900/30 space-y-2">
            <p className="text-sm font-semibold text-gray-300">
              Nenhum evento encontrado para o filtro selecionado.
            </p>
            <p className="text-xs text-gray-500">
              Crie um novo evento ou selecione outra categoria acima.
            </p>
          </div>
        )}
      </div>

      {/* ── MODAIS E DIÁLOGOS DE CONFIRMAÇÃO ─────────────────────────────────── */}

      {/* Modal de Criação / Edição */}
      <EventModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleModalSubmit}
        initialEvent={editingEvent}
        isSubmitting={isSubmitting}
      />

      {/* Confirmação de Ativação no Palco */}
      <ConfirmDialog
        isOpen={activateConfirm.isOpen}
        title="Ativar Evento no Palco da Arena"
        message={`Deseja projetar o evento "${activateConfirm.event?.title}" na arena física? O evento atualmente ativo retornará para o status "Pronto", o branding do telão 3D será imediatamente reconfigurado e as 5 cadeiras serão neutralizadas para 0°.`}
        confirmLabel="Sim, Ativar no Palco"
        cancelLabel="Cancelar"
        isLoading={isSubmitting}
        onConfirm={handleConfirmActivate}
        onCancel={() => setActivateConfirm({ isOpen: false, event: null })}
      />

      {/* Confirmação de Encerramento (Finish) */}
      <ConfirmDialog
        isOpen={finishConfirm.isOpen}
        title="Encerrar Evento Formalmente"
        message={`Deseja encerrar o evento "${finishConfirm.event?.title}"? O status será alterado para "Encerrado" (Finished), marcando a conclusão oficial das apresentações.`}
        confirmLabel="Sim, Encerrar Evento"
        cancelLabel="Cancelar"
        isDestructive={false}
        isLoading={isSubmitting}
        onConfirm={handleConfirmFinish}
        onCancel={() => setFinishConfirm({ isOpen: false, event: null })}
      />

      {/* Confirmação de Arquivamento */}
      <ConfirmDialog
        isOpen={archiveConfirm.isOpen}
        title="Arquivar Evento no Histórico"
        message={`Deseja arquivar o evento "${archiveConfirm.event?.title}"? Ele será preservado exclusivamente para histórico e auditoria.`}
        confirmLabel="Arquivar Evento"
        cancelLabel="Cancelar"
        isDestructive={true}
        isLoading={isSubmitting}
        onConfirm={handleConfirmArchive}
        onCancel={() => setArchiveConfirm({ isOpen: false, event: null })}
      />
    </div>
  );
}
