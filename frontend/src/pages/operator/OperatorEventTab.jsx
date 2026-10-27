import React from 'react';
import {
  Sliders,
  Palette,
  RefreshCw,
  AlertCircle,
  Calendar,
  Sparkles,
  Info,
  Loader2,
  Image as ImageIcon,
} from 'lucide-react';
import { useOperatorContext } from '../../contexts/OperatorContext';

/**
 * OperatorEventTab — Aba de Configurações e Branding do Evento (/operator/event).
 * 
 * Milestone 2C.2: Visualização dos dados do evento ativo em modo READ-ONLY.
 * Consome o OperatorContext, exibindo metadados e paleta de iluminação cênica.
 */
export function OperatorEventTab() {
  const { currentEvent, loading, error, refresh } = useOperatorContext();

  const formattedDate = currentEvent?.scheduledDate
    ? new Date(currentEvent.scheduledDate).toLocaleString('pt-BR', {
        dateStyle: 'long',
        timeStyle: 'short',
      })
    : 'Data não informada';

  const primaryColor = currentEvent?.branding?.primaryColor || '#ff0055';
  const secondaryColor = currentEvent?.branding?.secondaryColor || '#00ffff';

  return (
    <div className="flex-1 flex flex-col space-y-6">
      {/* ── BARRA SUPERIOR DA ABA ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-amber-500" />
            <span>Configurações e Identidade do Evento</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Visualização dos metadados e parâmetros cênicos do evento ativo.
          </p>
        </div>

        <button
          onClick={refresh}
          disabled={loading}
          className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
          title="Recarregar dados do backend"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          <span className="hidden sm:inline">Atualizar</span>
        </button>
      </div>

      {/* ── FEEDBACK DE ERRO ─────────────────────────────────────────────────── */}
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

      {/* ── FEEDBACK DE CARREGAMENTO INICIAL ─────────────────────────────────── */}
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ── PAINEL: INFORMAÇÕES GERAIS DO EVENTO ──────────────────────────── */}
          <div className="glass-panel rounded-2xl p-6 border border-white/10 bg-white/[0.02] space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Info className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Dados do Evento</h3>
                  <p className="text-[11px] text-gray-400">Metadados institucionais</p>
                </div>
              </div>

              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/[0.04] text-gray-400 border border-white/10">
                ID: {currentEvent.id}
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                  Título do Evento
                </label>
                <p className="text-base font-semibold text-white mt-0.5">
                  {currentEvent.title}
                </p>
              </div>

              <div>
                <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                  Descrição
                </label>
                <p className="text-xs text-gray-300 leading-relaxed mt-0.5 whitespace-pre-line">
                  {currentEvent.description || 'Nenhuma descrição detalhada informada.'}
                </p>
              </div>

              <div>
                <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                  Data Prevista de Realização
                </label>
                <p className="text-xs text-gray-200 flex items-center gap-1.5 mt-1 font-mono">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  <span>{formattedDate}</span>
                </p>
              </div>
            </div>
          </div>

          {/* ── PAINEL: BRANDING & ILUMINAÇÃO CÊNICA ──────────────────────────── */}
          <div className="glass-panel rounded-2xl p-6 border border-white/10 bg-white/[0.02] space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                  <Palette className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Identidade Visual & Cênica</h3>
                  <p className="text-[11px] text-gray-400">Neons e ambientação do palco</p>
                </div>
              </div>

              <span className="text-[11px] text-gray-500 font-mono">
                Modo Somente Leitura
              </span>
            </div>

            <div className="space-y-4">
              {/* Tagline */}
              <div>
                <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                  Tagline / Frase Cênica
                </label>
                <p className="text-xs text-gray-200 italic mt-0.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>"{currentEvent.branding?.tagline || 'Apresente sua ideia. Conquiste as cadeiras.'}"</span>
                </p>
              </div>

              {/* Cores Cênicas */}
              <div>
                <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wider block mb-2">
                  Paleta de Cores dos Neons
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Cor Primária */}
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-lg border border-white/20 shadow-md shrink-0"
                      style={{
                        backgroundColor: primaryColor,
                        boxShadow: `0 0 16px ${primaryColor}55`,
                      }}
                    />
                    <div className="min-w-0">
                      <span className="block text-[10px] text-gray-400 uppercase font-medium">
                        Cor Primária
                      </span>
                      <span className="text-xs font-mono font-bold text-white uppercase">
                        {primaryColor}
                      </span>
                    </div>
                  </div>

                  {/* Cor Secundária */}
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-lg border border-white/20 shadow-md shrink-0"
                      style={{
                        backgroundColor: secondaryColor,
                        boxShadow: `0 0 16px ${secondaryColor}55`,
                      }}
                    />
                    <div className="min-w-0">
                      <span className="block text-[10px] text-gray-400 uppercase font-medium">
                        Cor Secundária
                      </span>
                      <span className="text-xs font-mono font-bold text-white uppercase">
                        {secondaryColor}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Logo URL */}
              <div>
                <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                  Logotipo Cênico
                </label>
                <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
                  <ImageIcon className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                  <span className="truncate">
                    {currentEvent.branding?.logoUrl || 'Nenhum logotipo externo definido (usando identidade padrão do sistema)'}
                  </span>
                </div>
              </div>

              {/* Nota Informativa sobre o 2C.4 */}
              <div className="pt-2">
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-gray-500 flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-500/70 shrink-0 mt-0.5" />
                  <span>
                    A edição de título, descrição e seleção dinâmica de cores via ColorPicker será ativada no Milestone <strong>2C.4</strong>.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OperatorEventTab;
