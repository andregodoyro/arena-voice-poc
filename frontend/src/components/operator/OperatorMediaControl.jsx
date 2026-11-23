import React, { useState, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw, Film, Image as ImageIcon, Tv, AlertCircle } from 'lucide-react';
import { useOperatorContext } from '../../contexts/OperatorContext';

/**
 * OperatorMediaControl — Controles de Mídia do Operador no Cockpit (Milestone 5C.4).
 *
 * Permite ao operador controlar o telão LED (Hero Wall) em tempo real:
 * - Play: inicia ou retoma o vídeo ativo
 * - Pause: pausa a reprodução
 * - Restart: reinicia o vídeo do início (00:00)
 * - Indicador da mídia ativa e estado de reprodução
 *
 * Comunicação direta e instantânea com a cena 3D via BroadcastChannel ('arena_media_controls').
 */
export function OperatorMediaControl() {
  const { currentProject, currentEvent, pitchState } = useOperatorContext();

  const [mediaStatus, setMediaStatus] = useState({
    isPlaying: false,
    mediaType: 'image', // 'video' | 'image' | 'canvas'
    currentTime: 0,
    duration: 0,
  });

  const currentStage = pitchState?.stageName || pitchState?.stage || 'Waiting';
  const hasProject = Boolean(currentProject);
  const videoUrl = currentProject?.media?.videoUrl;
  const coverUrl = currentProject?.media?.coverImageUrl;
  const logoUrl = currentProject?.media?.logoUrl;

  // Determinar o estado narrativo atual do Hero Wall
  const wallMode = !hasProject
    ? 'event-idle'
    : currentStage === 'PitchRunning' || currentStage === 'QA'
    ? 'pitch-live'
    : currentStage === 'VotingOpen' || currentStage === 'VotingClosed'
    ? 'voting'
    : currentStage === 'Finished' || currentStage === 'Approved'
    ? 'result'
    : 'waiting';

  const isVideoExpected = wallMode === 'pitch-live' && Boolean(videoUrl);

  // Escuta atualizações de status emitidas pelo componente 3D (HeroShowcaseWall)
  useEffect(() => {
    let channel;
    try {
      channel = new BroadcastChannel('arena_media_controls');
      channel.onmessage = (e) => {
        const data = e.data;
        if (!data || data.type !== 'MEDIA_STATUS') return;
        setMediaStatus((prev) => ({
          ...prev,
          isPlaying: Boolean(data.isPlaying),
          currentTime: typeof data.currentTime === 'number' ? data.currentTime : prev.currentTime,
          duration: typeof data.duration === 'number' ? data.duration : prev.duration,
          mediaType: data.mediaType || prev.mediaType,
        }));
      };
    } catch (err) {
      console.warn('[OperatorMediaControl] BroadcastChannel não disponível:', err);
    }

    return () => {
      if (channel) channel.close();
    };
  }, []);

  const sendMediaAction = useCallback((action) => {
    try {
      const channel = new BroadcastChannel('arena_media_controls');
      channel.postMessage({ action });
      channel.close();

      if (action === 'PLAY') {
        setMediaStatus((prev) => ({ ...prev, isPlaying: true }));
      } else if (action === 'PAUSE') {
        setMediaStatus((prev) => ({ ...prev, isPlaying: false }));
      } else if (action === 'RESTART') {
        setMediaStatus((prev) => ({ ...prev, isPlaying: true, currentTime: 0 }));
      }
    } catch (err) {
      console.error('[OperatorMediaControl] Falha ao enviar comando de mídia:', err);
    }
  }, []);

  // Formatação do tempo de reprodução (MM:SS)
  const formatTime = (secs) => {
    if (!secs || isNaN(secs)) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Metadados visuais do modo narrativo
  const modeBadge = {
    'event-idle': { label: 'Standby Evento', color: 'border-sky-500/30 bg-sky-950/40 text-sky-300' },
    'waiting':    { label: 'Aguardando Apresentação', color: 'border-indigo-500/30 bg-indigo-950/40 text-indigo-300' },
    'pitch-live': { label: 'Pitch ao Vivo', color: 'border-emerald-500/30 bg-emerald-950/40 text-emerald-300' },
    'voting':     { label: 'Votação (Projeto em Destaque)', color: 'border-amber-500/30 bg-amber-950/40 text-amber-300' },
    'result':     { label: 'Resultado (Celebração)', color: 'border-yellow-500/30 bg-yellow-950/40 text-yellow-300' },
  }[wallMode] || { label: wallMode, color: 'border-gray-500/30 bg-gray-900/40 text-gray-300' };

  // Identificação do arquivo ou descrição da mídia
  let mediaTitle = 'Branding Institucional';
  let mediaSubtitle = currentEvent?.title || 'Arena Voice';
  let isVideoActive = false;

  if (wallMode === 'event-idle') {
    mediaTitle = currentEvent?.title || 'Arena Voice';
    mediaSubtitle = currentEvent?.branding?.logoUrl ? 'Logo do Evento' : 'Fallback Institucional';
  } else if (wallMode === 'pitch-live' && videoUrl) {
    mediaTitle = currentProject?.title || 'Pitch do Projeto';
    mediaSubtitle = 'Vídeo do Projeto';
    isVideoActive = true;
  } else if (hasProject) {
    mediaTitle = currentProject?.title || 'Projeto Ativo';
    mediaSubtitle = coverUrl ? 'Capa do Projeto' : logoUrl ? 'Logo do Projeto' : 'Identidade Visual';
  }

  return (
    <div className="glass-panel rounded-2xl p-4 md:p-5 border border-white/10 space-y-4">
      {/* ── Cabeçalho do Card ───────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
            {isVideoActive ? <Film className="w-4 h-4" /> : hasProject ? <ImageIcon className="w-4 h-4" /> : <Tv className="w-4 h-4" />}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-100 flex items-center gap-2">
              Mídia do Telão (Hero Wall)
            </h3>
            <p className="text-[11px] text-gray-400">
              Controle de reprodução e monitoramento da tela principal
            </p>
          </div>
        </div>

        {/* Badge do Estado Narrativo */}
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider ${modeBadge.color}`}>
          {modeBadge.label}
        </span>
      </div>

      {/* ── Status e Mídia Ativa ────────────────────────────────────────── */}
      <div className="bg-black/30 rounded-xl p-3 border border-white/5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
            {isVideoActive ? (
              <Film className="w-5 h-5 text-emerald-400 animate-pulse" />
            ) : hasProject ? (
              <ImageIcon className="w-5 h-5 text-indigo-400" />
            ) : (
              <Tv className="w-5 h-5 text-sky-400" />
            )}
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-200 truncate max-w-xs md:max-w-md">
              {mediaTitle}
            </div>
            <div className="text-[11px] text-gray-400 flex items-center gap-2">
              <span>{mediaSubtitle}</span>
              {isVideoActive && (
                <>
                  <span className="text-gray-600">•</span>
                  <span className="font-mono text-emerald-400">
                    {formatTime(mediaStatus.currentTime)} / {formatTime(mediaStatus.duration)}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Indicador de Status */}
        <div className="flex items-center gap-2 text-xs">
          {isVideoActive ? (
            mediaStatus.isPlaying ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Reproduzindo
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-950/60 text-amber-300 border border-amber-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Pausado
              </span>
            )
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-sky-950/60 text-sky-300 border border-sky-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
              Imagem Estática
            </span>
          )}
        </div>
      </div>

      {/* ── Botões de Controle de Reprodução (Play / Pause / Restart) ────── */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={() => sendMediaAction('PLAY')}
          disabled={!isVideoActive || mediaStatus.isPlaying}
          className={`
            flex-1 px-4 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all duration-200
            ${!isVideoActive || mediaStatus.isPlaying
              ? 'border-white/5 bg-white/[0.02] text-gray-500 cursor-not-allowed opacity-50'
              : 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300 hover:bg-emerald-900/40 hover:border-emerald-500/60 active:scale-95 cursor-pointer shadow-sm'
            }
          `}
          title={!isVideoActive ? 'Controles ativos apenas durante reprodução de vídeo' : 'Iniciar/Retomar Reprodução'}
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Play</span>
        </button>

        <button
          type="button"
          onClick={() => sendMediaAction('PAUSE')}
          disabled={!isVideoActive || !mediaStatus.isPlaying}
          className={`
            flex-1 px-4 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all duration-200
            ${!isVideoActive || !mediaStatus.isPlaying
              ? 'border-white/5 bg-white/[0.02] text-gray-500 cursor-not-allowed opacity-50'
              : 'border-amber-500/40 bg-amber-950/30 text-amber-300 hover:bg-amber-900/40 hover:border-amber-500/60 active:scale-95 cursor-pointer shadow-sm'
            }
          `}
          title={!isVideoActive ? 'Controles ativos apenas durante reprodução de vídeo' : 'Pausar Reprodução'}
        >
          <Pause className="w-3.5 h-3.5 fill-current" />
          <span>Pause</span>
        </button>

        <button
          type="button"
          onClick={() => sendMediaAction('RESTART')}
          disabled={!isVideoActive}
          className={`
            flex-1 px-4 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all duration-200
            ${!isVideoActive
              ? 'border-white/5 bg-white/[0.02] text-gray-500 cursor-not-allowed opacity-50'
              : 'border-white/10 bg-white/5 text-gray-200 hover:bg-white/10 hover:border-white/20 active:scale-95 cursor-pointer shadow-sm'
            }
          `}
          title={!isVideoActive ? 'Controles ativos apenas durante reprodução de vídeo' : 'Reiniciar Vídeo'}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Restart</span>
        </button>
      </div>

      {!isVideoActive && wallMode === 'pitch-live' && (
        <div className="flex items-center gap-2 text-[11px] text-amber-300/80 bg-amber-950/20 border border-amber-500/20 rounded-lg p-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
          <span>Nenhum vídeo cadastrado no projeto. Exibindo imagem de capa como fallback.</span>
        </div>
      )}
    </div>
  );
}

export default OperatorMediaControl;
