import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Film, 
  Image as ImageIcon, 
  Tv, 
  AlertCircle, 
  Volume2, 
  Volume1, 
  VolumeX, 
  FastForward, 
  Rewind,
  Sparkles
} from 'lucide-react';
import { useOperatorContext } from '../../contexts/OperatorContext';

/**
 * OperatorMediaControl — Player Profissional de Mídia e Transporte do Hero Wall (Milestone 5C.4A).
 *
 * Funcionalidades ao vivo:
 * - Áudio do vídeo com controle de volume em tempo real (0% a 100%)
 * - Timeline com scrubbing/seek interativo e display MM:SS / MM:SS
 * - Botões de salto rápido (-10s / +10s) e Restart
 * - Play / Pause com feedback visual imediato
 * - Indicador de status operacional de apresentação ao vivo
 * - Sincronização via BroadcastChannel ('arena_media_controls')
 */
export function OperatorMediaControl() {
  const { currentProject, currentEvent, pitchState } = useOperatorContext();

  // Volume persistido ou 70% inicial
  const [volume, setVolume] = useState(() => {
    try {
      const saved = localStorage.getItem('arena_media_volume');
      return saved !== null ? Math.round(parseFloat(saved) * 100) : 70;
    } catch {
      return 70;
    }
  });

  const [isMuted, setIsMuted] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(70);

  const [mediaStatus, setMediaStatus] = useState({
    isPlaying: false,
    mediaType: 'image', // 'video' | 'image' | 'canvas'
    currentTime: 0,
    duration: 0,
    volume: 0.7,
    isMuted: false,
    isEnded: false,
    isAudioBlocked: false,
  });

  // Estado local para evitar jitter na timeline enquanto o operador arrasta
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubTime, setScrubTime] = useState(0);

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

  const isVideoActive = wallMode === 'pitch-live' && Boolean(videoUrl);

  // Escuta atualizações de status emitidas pelo telão (HeroShowcaseWall)
  useEffect(() => {
    let channel;
    try {
      channel = new BroadcastChannel('arena_media_controls');

      // Solicitar status imediato ao montar
      channel.postMessage({ action: 'REQUEST_STATUS' });

      channel.onmessage = (e) => {
        const data = e.data;
        if (!data || data.type !== 'MEDIA_STATUS') return;

        setMediaStatus((prev) => ({
          ...prev,
          isPlaying: Boolean(data.isPlaying),
          currentTime: typeof data.currentTime === 'number' ? data.currentTime : prev.currentTime,
          duration: typeof data.duration === 'number' ? data.duration : prev.duration,
          volume: typeof data.volume === 'number' ? data.volume : prev.volume,
          isMuted: Boolean(data.isMuted),
          isEnded: Boolean(data.isEnded),
          isAudioBlocked: Boolean(data.isAudioBlocked),
          mediaType: data.mediaType || prev.mediaType,
        }));

        if (typeof data.volume === 'number' && !isScrubbing) {
          const volPercent = Math.round(data.volume * 100);
          setVolume(volPercent);
          setIsMuted(Boolean(data.isMuted) || volPercent === 0);
        }
      };
    } catch (err) {
      console.warn('[OperatorMediaControl] BroadcastChannel não disponível:', err);
    }

    return () => {
      if (channel) channel.close();
    };
  }, [isScrubbing]);

  const sendMediaAction = useCallback((action, payload = {}) => {
    try {
      const channel = new BroadcastChannel('arena_media_controls');
      channel.postMessage({ action, ...payload });
      channel.close();

      if (action === 'PLAY') {
        setMediaStatus((prev) => ({ ...prev, isPlaying: true, isEnded: false }));
      } else if (action === 'PAUSE') {
        setMediaStatus((prev) => ({ ...prev, isPlaying: false }));
      } else if (action === 'RESTART') {
        setMediaStatus((prev) => ({ ...prev, isPlaying: true, currentTime: 0, isEnded: false }));
      } else if (action === 'SEEK') {
        setMediaStatus((prev) => ({ ...prev, currentTime: payload.time || 0 }));
      }
    } catch (err) {
      console.error('[OperatorMediaControl] Falha ao enviar comando de mídia:', err);
    }
  }, []);

  // ── Controle de Volume ────────────────────────────────────────────────────
  const handleVolumeChange = (newVal) => {
    const safeVal = Math.max(0, Math.min(100, newVal));
    setVolume(safeVal);
    setIsMuted(safeVal === 0);
    sendMediaAction('VOLUME', { volume: safeVal / 100 });
  };

  const handleToggleMute = () => {
    if (isMuted || volume === 0) {
      const restore = previousVolume > 0 ? previousVolume : 70;
      setVolume(restore);
      setIsMuted(false);
      sendMediaAction('VOLUME', { volume: restore / 100 });
    } else {
      setPreviousVolume(volume);
      setVolume(0);
      setIsMuted(true);
      sendMediaAction('VOLUME', { volume: 0 });
    }
  };

  const handleUnmuteAudioBlocked = () => {
    sendMediaAction('UNMUTE');
    setMediaStatus((prev) => ({ ...prev, isAudioBlocked: false }));
  };

  // ── Controle de Scrubbing / Timeline ──────────────────────────────────────
  const handleSeekStart = (e) => {
    setIsScrubbing(true);
    setScrubTime(parseFloat(e.target.value));
  };

  const handleSeekMove = (e) => {
    setScrubTime(parseFloat(e.target.value));
  };

  const handleSeekEnd = (e) => {
    const target = parseFloat(e.target.value);
    setIsScrubbing(false);
    sendMediaAction('SEEK', { time: target });
  };

  const handleJump = (delta) => {
    const cur = mediaStatus.currentTime || 0;
    const dur = mediaStatus.duration || 0;
    const target = Math.max(0, Math.min(dur, cur + delta));
    sendMediaAction('SEEK', { time: target });
  };

  // Formatação de tempo (MM:SS)
  const formatTime = (secs) => {
    if (!secs || isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const displayCurrentTime = isScrubbing ? scrubTime : mediaStatus.currentTime;
  const duration = mediaStatus.duration || 0;
  const progressPercent = duration > 0 ? Math.min(100, (displayCurrentTime / duration) * 100) : 0;

  // Metadados visuais do modo narrativo
  const modeBadge = {
    'event-idle': { label: 'Standby Evento', color: 'border-sky-500/30 bg-sky-950/40 text-sky-300' },
    'waiting':    { label: 'Aguardando Apresentação', color: 'border-indigo-500/30 bg-indigo-950/40 text-indigo-300' },
    'pitch-live': { label: 'Pitch ao Vivo', color: 'border-emerald-500/30 bg-emerald-950/40 text-emerald-300' },
    'voting':     { label: 'Votação (Projeto em Destaque)', color: 'border-amber-500/30 bg-amber-950/40 text-amber-300' },
    'result':     { label: 'Resultado (Celebração)', color: 'border-yellow-500/30 bg-yellow-950/40 text-yellow-300' },
  }[wallMode] || { label: wallMode, color: 'border-gray-500/30 bg-gray-900/40 text-gray-300' };

  // Status operacional para apresentação ao vivo
  const renderLiveStatus = () => {
    if (isVideoActive) {
      if (mediaStatus.isEnded) {
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-purple-950/60 text-purple-300 border border-purple-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
            Finalizado
          </span>
        );
      }
      if (mediaStatus.isPlaying) {
        if (isMuted || volume === 0) {
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              Reproduzindo (Mudo)
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/70 text-emerald-200 border border-emerald-500/40 shadow-sm shadow-emerald-950/40">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <Volume2 className="w-3 h-3 text-emerald-400" />
            Reproduzindo com Áudio
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-950/60 text-amber-300 border border-amber-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          Pausado
        </span>
      );
    }

    if (wallMode === 'pitch-live' && !videoUrl) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-950/50 text-amber-300 border border-amber-500/30">
          Fallback (Sem Vídeo)
        </span>
      );
    }

    if (hasProject) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-sky-950/60 text-sky-300 border border-sky-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
          Imagem Estática
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-gray-900/60 text-gray-400 border border-white/10">
        Standby Institucional
      </span>
    );
  };

  // Identificação do arquivo ou descrição da mídia
  let mediaTitle = 'Branding Institucional';
  let mediaSubtitle = currentEvent?.title || 'Arena Voice';

  if (wallMode === 'event-idle') {
    mediaTitle = currentEvent?.title || 'Arena Voice';
    mediaSubtitle = currentEvent?.branding?.logoUrl ? 'Logo do Evento' : 'Fallback Institucional';
  } else if (wallMode === 'pitch-live' && videoUrl) {
    mediaTitle = currentProject?.title || 'Pitch do Projeto';
    mediaSubtitle = 'Vídeo do Pitch (MP4 / WebM)';
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
              Transporte de Mídia do Telão
            </h3>
            <p className="text-[11px] text-gray-400">
              Controle avançado de reprodução, áudio sincronizado e timeline
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
                  <span className="font-mono text-emerald-400 font-medium">
                    {formatTime(displayCurrentTime)} / {formatTime(duration)}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Indicador de Status Operacional */}
        {renderLiveStatus()}
      </div>

      {/* ── Alerta de Áudio Bloqueado pelo Navegador (com 1-clique para desmutar) ── */}
      {isVideoActive && mediaStatus.isAudioBlocked && (
        <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <VolumeX className="w-4 h-4 text-amber-400 shrink-0" />
            <span>O navegador restringiu o autoplay com som. Clique para liberar o áudio do telão.</span>
          </div>
          <button
            type="button"
            onClick={handleUnmuteAudioBlocked}
            className="px-3 py-1 bg-amber-500 text-black font-semibold rounded-lg text-[11px] hover:bg-amber-400 transition-colors shrink-0 cursor-pointer shadow-sm"
          >
            Ativar Áudio
          </button>
        </div>
      )}

      {/* ── Timeline Scrubbing / Barra de Navegação ─────────────────────── */}
      {isVideoActive ? (
        <div className="space-y-1.5 bg-white/[0.02] p-3 rounded-xl border border-white/5">
          <div className="flex items-center justify-between text-[11px] font-mono text-gray-300">
            <span className="text-emerald-400 font-semibold">{formatTime(displayCurrentTime)}</span>
            <span className="text-gray-500">{formatTime(duration)}</span>
          </div>

          <div className="relative flex items-center group">
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.25}
              value={displayCurrentTime}
              onMouseDown={handleSeekStart}
              onTouchStart={handleSeekStart}
              onChange={handleSeekMove}
              onMouseUp={handleSeekEnd}
              onTouchEnd={handleSeekEnd}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-white/10 accent-emerald-500 focus:outline-none transition-all duration-150"
              style={{
                background: `linear-gradient(to right, #10b981 ${progressPercent}%, rgba(255,255,255,0.1) ${progressPercent}%)`
              }}
              title="Arrastar para saltar a qualquer ponto do vídeo"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleJump(-10)}
              className="text-[10px] px-2 py-0.5 rounded border border-white/10 bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 flex items-center gap-1 active:scale-95 cursor-pointer"
              title="Voltar 10 segundos"
            >
              <Rewind className="w-3 h-3" />
              <span>-10s</span>
            </button>
            <button
              type="button"
              onClick={() => handleJump(10)}
              className="text-[10px] px-2 py-0.5 rounded border border-white/10 bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 flex items-center gap-1 active:scale-95 cursor-pointer"
              title="Avançar 10 segundos"
            >
              <span>+10s</span>
              <FastForward className="w-3 h-3" />
            </button>
          </div>
        </div>
      ) : null}

      {/* ── Controles de Volume e Transporte ────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        {/* Painel de Volume */}
        <div className="bg-white/[0.02] p-2.5 rounded-xl border border-white/5 flex items-center gap-3">
          <button
            type="button"
            onClick={handleToggleMute}
            disabled={!isVideoActive}
            className={`
              p-2 rounded-lg border transition-all cursor-pointer
              ${!isVideoActive
                ? 'border-white/5 text-gray-600 cursor-not-allowed opacity-50'
                : isMuted || volume === 0
                ? 'border-amber-500/40 bg-amber-950/30 text-amber-400 hover:bg-amber-900/40'
                : 'border-white/10 bg-white/5 text-gray-200 hover:bg-white/10 hover:text-white'
              }
            `}
            title={isMuted ? 'Desmutar vídeo' : 'Mutar vídeo'}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4" />
            ) : volume < 50 ? (
              <Volume1 className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>

          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-gray-400">Volume</span>
              <span className="font-mono text-gray-200 font-semibold">
                {isMuted || volume === 0 ? 'Mudo' : `${volume}%`}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={isMuted ? 0 : volume}
              disabled={!isVideoActive}
              onChange={(e) => handleVolumeChange(parseInt(e.target.value, 10))}
              className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-white/10 accent-emerald-500 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: `linear-gradient(to right, #10b981 ${isMuted ? 0 : volume}%, rgba(255,255,255,0.1) ${isMuted ? 0 : volume}%)`
              }}
              title="Controle de volume do vídeo no telão"
            />
          </div>
        </div>

        {/* Botões de Transporte (Play / Pause / Restart) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => sendMediaAction('PLAY')}
            disabled={!isVideoActive || mediaStatus.isPlaying}
            className={`
              flex-1 py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all duration-200
              ${!isVideoActive || mediaStatus.isPlaying
                ? 'border-white/5 bg-white/[0.02] text-gray-500 cursor-not-allowed opacity-50'
                : 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300 hover:bg-emerald-900/40 hover:border-emerald-500/60 active:scale-95 cursor-pointer shadow-sm'
              }
            `}
            title={!isVideoActive ? 'Controles ativos apenas durante PitchRunning' : 'Iniciar ou Retomar Vídeo'}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Play</span>
          </button>

          <button
            type="button"
            onClick={() => sendMediaAction('PAUSE')}
            disabled={!isVideoActive || !mediaStatus.isPlaying}
            className={`
              flex-1 py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all duration-200
              ${!isVideoActive || !mediaStatus.isPlaying
                ? 'border-white/5 bg-white/[0.02] text-gray-500 cursor-not-allowed opacity-50'
                : 'border-amber-500/40 bg-amber-950/30 text-amber-300 hover:bg-amber-900/40 hover:border-amber-500/60 active:scale-95 cursor-pointer shadow-sm'
              }
            `}
            title={!isVideoActive ? 'Controles ativos apenas durante PitchRunning' : 'Pausar Vídeo'}
          >
            <Pause className="w-3.5 h-3.5 fill-current" />
            <span>Pause</span>
          </button>

          <button
            type="button"
            onClick={() => sendMediaAction('RESTART')}
            disabled={!isVideoActive}
            className={`
              py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all duration-200
              ${!isVideoActive
                ? 'border-white/5 bg-white/[0.02] text-gray-500 cursor-not-allowed opacity-50'
                : 'border-white/10 bg-white/5 text-gray-200 hover:bg-white/10 hover:border-white/20 active:scale-95 cursor-pointer shadow-sm'
              }
            `}
            title={!isVideoActive ? 'Controles ativos apenas durante PitchRunning' : 'Reiniciar Vídeo do Início'}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reiniciar</span>
          </button>
        </div>
      </div>

      {!isVideoActive && wallMode === 'pitch-live' && (
        <div className="flex items-center gap-2 text-[11px] text-amber-300/80 bg-amber-950/20 border border-amber-500/20 rounded-lg p-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
          <span>Nenhum vídeo cadastrado no projeto. Telão operando em fallback de imagem de capa sem áudio.</span>
        </div>
      )}
    </div>
  );
}

export default OperatorMediaControl;
