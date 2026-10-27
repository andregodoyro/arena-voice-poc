import React, { useState, useEffect } from 'react';
import {
  Sliders,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  X,
  Loader2,
  Info,
} from 'lucide-react';
import { useOperatorContext } from '../../contexts/OperatorContext';
import { eventsApi } from '../../api/eventsApi';
import { EventForm } from '../../components/operator/EventForm';
import { ColorPreviewCard } from '../../components/operator/ColorPreviewCard';

/**
 * OperatorEventTab — Aba de Gestão Operacional e Identidade Visual do Evento (/operator/event).
 * 
 * Milestone 2C.4: Área de edição operacional completa das configurações e branding do evento:
 * - Edição institucional: título, descrição, tagline, logo (relativo ou absoluto)
 * - Edição de iluminação cênica: cores primária e secundária dos neons do palco
 * - Preview visual ao vivo sem necessidade de salvar
 * - Feedback operacional (loading, sucesso, erro) e re-hidratação autoritativa via refresh()
 */
export function OperatorEventTab() {
  const { currentEvent, loading, error, refresh } = useOperatorContext();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null);
  const [livePreviewData, setLivePreviewData] = useState(null);

  // Auto-dismiss do banner de feedback após 5 segundos
  useEffect(() => {
    if (!actionFeedback) return;
    const timer = setTimeout(() => {
      setActionFeedback(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [actionFeedback]);

  // Atualiza os dados de preview ao carregar ou atualizar o evento
  useEffect(() => {
    if (currentEvent) {
      setLivePreviewData({
        title: currentEvent.title || '',
        tagline: currentEvent.branding?.tagline || '',
        logoUrl: currentEvent.branding?.logoUrl || '',
        primaryColor: currentEvent.branding?.primaryColor || '#d90429',
        secondaryColor: currentEvent.branding?.secondaryColor || '#00ffff',
      });
    }
  }, [currentEvent]);

  const handleSubmitEvent = async (payload) => {
    setIsSubmitting(true);
    try {
      await eventsApi.updateCurrentEvent(payload);
      setActionFeedback({
        type: 'success',
        message: 'Configurações e identidade visual do evento atualizadas com sucesso!',
      });
      await refresh();
    } catch (err) {
      console.error('[OperatorEventTab] Falha ao atualizar evento:', err);
      setActionFeedback({
        type: 'error',
        message: err.message || 'Falha ao salvar as alterações do evento no servidor.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col space-y-6">
      {/* ── BARRA SUPERIOR DA ABA ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-amber-500" />
            <span>Gestão e Identidade do Evento</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Controle operacional dos metadados, branding e ambientação cênica do palco.
          </p>
        </div>

        <button
          onClick={refresh}
          disabled={loading || isSubmitting}
          className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
          title="Recarregar dados do backend"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          <span className="hidden sm:inline">Atualizar</span>
        </button>
      </div>

      {/* ── FEEDBACK DE AÇÃO OPERACIONAL (TOAST / BANNER) ────────────────────── */}
      {actionFeedback && (
        <div
          className={`glass-panel rounded-xl p-3.5 border text-xs flex items-center justify-between gap-3 animate-fade-in ${
            actionFeedback.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-950/30 text-emerald-300'
              : 'border-red-500/30 bg-red-950/30 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{actionFeedback.message}</span>
          </div>

          <button
            onClick={() => setActionFeedback(null)}
            className="text-gray-400 hover:text-white p-1 rounded transition-colors shrink-0"
            title="Dispensar aviso"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── FEEDBACK DE ERRO GERAL DO CONTEXTO ───────────────────────────────── */}
      {error && (
        <div className="glass-panel rounded-xl p-4 border border-red-500/30 bg-red-950/20 text-red-400 flex items-start justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={refresh}
            className="underline font-semibold hover:text-white shrink-0"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* ── CONTEÚDO PRINCIPAL: FORMULÁRIO E PREVIEW CÊNICO ──────────────────── */}
      {loading && !currentEvent ? (
        <div className="glass-panel rounded-2xl p-12 border border-white/10 flex flex-col items-center justify-center space-y-3 min-h-[300px]">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          <p className="text-xs text-gray-400">Carregando dados do evento ativo...</p>
        </div>
      ) : !currentEvent ? (
        <div className="glass-panel rounded-2xl p-10 border border-white/10 flex flex-col items-center justify-center text-center space-y-3 min-h-[300px]">
          <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-gray-500">
            <Info className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-semibold text-gray-300">Nenhum evento ativo localizado</h4>
          <p className="text-xs text-gray-500 max-w-sm">
            O backend não retornou um evento ativo no snapshot. Verifique a conectividade da API.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Formulário Operacional */}
          <EventForm
            event={currentEvent}
            isSubmitting={isSubmitting}
            onSubmit={handleSubmitEvent}
            onLiveChange={setLivePreviewData}
          />

          {/* Preview Cênico em Tempo Real */}
          <ColorPreviewCard
            title={livePreviewData?.title || currentEvent.title}
            tagline={livePreviewData?.tagline || currentEvent.branding?.tagline}
            logoUrl={livePreviewData?.logoUrl ?? currentEvent.branding?.logoUrl}
            primaryColor={livePreviewData?.primaryColor || currentEvent.branding?.primaryColor}
            secondaryColor={livePreviewData?.secondaryColor || currentEvent.branding?.secondaryColor}
          />
        </div>
      )}
    </div>
  );
}

export default OperatorEventTab;
