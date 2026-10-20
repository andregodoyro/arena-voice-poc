import React from 'react';
import { RotateCcw, RotateCw, Flame, Mic2, Radio, Wrench, Wifi } from 'lucide-react';

/**
 * Individual Chair Button component in the HUD
 */
function ChairButton({ chair, onClick, isDevMode }) {
  const { name, isTurned } = chair;

  return (
    <button
      onClick={() => onClick(chair.id)}
      disabled={!isDevMode}
      className={`
        btn-tactile pointer-events-auto relative flex flex-col items-center justify-center
        gap-1 rounded-2xl py-3 px-2 transition-all duration-300 overflow-hidden border
        ${isTurned
          ? 'bg-gradient-to-b from-red-700 via-red-800 to-red-950 border-red-500/90 text-white neon-red scale-[1.04] pulse-ring'
          : isDevMode
            ? 'bg-gray-950/70 hover:bg-gray-900/90 border-white/10 hover:border-gray-600/60 text-gray-300'
            : 'bg-gray-950/40 border-white/5 text-gray-600 cursor-not-allowed'
        }
      `}
      title={
        !isDevMode
          ? 'Modo Dev desativado (aguardando botão físico)'
          : isTurned
            ? `${name} virou a cadeira!`
            : `Clicar para virar a cadeira de ${name}`
      }
    >
      {/* Status icon */}
      <span className="text-lg leading-none">
        {isTurned ? '🔥' : '💺'}
      </span>

      {/* Coach name */}
      <span className="text-[11px] font-bold uppercase tracking-wide leading-none">
        {name}
      </span>

      {/* Status text */}
      <span className={`text-[9px] font-semibold uppercase tracking-wider leading-none ${isTurned ? 'text-yellow-300' : 'text-gray-500'}`}>
        {isTurned ? 'VIRADA' : 'de costas'}
      </span>

      {/* Glowing active overlay */}
      {isTurned && (
        <span
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 50% 0%, rgba(239,68,68,0.25) 0%, transparent 70%)',
          }}
        />
      )}
    </button>
  );
}

/**
 * HUD — 2D overlay fixed on screen.
 */
export function HUD({
  chairs,
  toggleChair,
  turnAll,
  resetAll,
  isDevMode,
  setIsDevMode,
  connectionStatus,
  connectionError,
  lastEvent,
  backendUrl,
}) {
  const turnedCount = chairs.filter((c) => c.isTurned).length;
  const allTurned   = turnedCount === chairs.length;

  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-4 md:p-5 select-none">

      {/* ── TOP BAR ──────────────────────────────────────────────────────── */}
      <header className="flex items-start justify-between gap-3">

        {/* Brand / Title */}
        <div className="glass-panel rounded-2xl px-4 py-3 flex items-center gap-3 pointer-events-auto">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-amber-500 flex items-center justify-center shadow-lg shadow-red-500/40 flex-shrink-0">
            <Mic2 className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <p className="font-display text-xl md:text-2xl leading-none text-white tracking-wide">
              ARENA VOICE
            </p>
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest mt-0.5">
              POC Físico-Digital · Telão 3D
            </p>
          </div>
        </div>

        {/* Status / Dev Mode / Counter Group */}
        <div className="flex items-center gap-3 pointer-events-auto">

          {/* Dev Mode Toggle */}
          <button
            onClick={() => setIsDevMode(!isDevMode)}
            className={`glass-panel rounded-2xl px-3 py-2.5 flex items-center gap-2 border text-xs font-semibold transition-all ${
              isDevMode
                ? 'border-amber-500/50 bg-amber-950/40 text-amber-300'
                : 'border-emerald-500/50 bg-emerald-950/40 text-emerald-300'
            }`}
            title="Alternar entre modo manual (clique) e modo físico (ESP32 exclusivo)"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>{isDevMode ? 'MODO DEV: ATIVO' : 'MODO HARDWARE: EXCLUSIVO'}</span>
          </button>

          {/* SignalR Connection Status Badge */}
          <div
            className={`glass-panel rounded-2xl px-3 py-2.5 flex items-center gap-2 border text-xs font-semibold ${
              connectionStatus === 'CONECTADO'
                ? 'border-emerald-500/40 text-emerald-400'
                : connectionStatus === 'RECONECTANDO'
                  ? 'border-amber-500/40 text-amber-400'
                  : 'border-red-500/30 text-gray-400'
            }`}
            title={`Backend SignalR: ${backendUrl || 'http://localhost:5000'}${connectionError ? ` (Erro: ${connectionError})` : ''}`}
          >
            <Wifi className="w-3.5 h-3.5" />
            <span>SignalR: {connectionStatus}</span>
          </div>

          {/* Live counter */}
          <div className="glass-panel rounded-2xl px-4 py-3 flex items-center gap-3">
            <div className="text-right">
              <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
                Cadeiras Viradas
              </p>
              <p className="font-display text-3xl leading-none mt-0.5">
                <span className={turnedCount > 0 ? 'neon-text-red' : 'text-gray-500'}>
                  {turnedCount}
                </span>
                <span className="text-gray-600 text-lg"> / {chairs.length}</span>
              </p>
            </div>

            <div
              className={`
                w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-500
                ${allTurned
                  ? 'bg-gradient-to-r from-red-600 to-amber-500 shadow-lg shadow-red-500/50 scale-110'
                  : turnedCount > 0
                    ? 'bg-red-950/80 border border-red-500/40'
                    : 'bg-gray-900/80 border border-gray-800'
                }
              `}
            >
              {allTurned
                ? <Flame className="w-6 h-6 text-yellow-300 animate-bounce" />
                : <Radio  className={`w-5 h-5 ${turnedCount > 0 ? 'text-red-400' : 'text-gray-600'}`} />
              }
            </div>
          </div>
        </div>
      </header>

      {/* ── LAST EVENT AUDIT BANNER (IF ACTIVE) ───────────────────────────── */}
      {lastEvent && (
        <div className="self-center glass-panel rounded-full px-5 py-1.5 border border-red-500/30 text-xs text-gray-300 flex items-center gap-2 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-red-500"></span>
          <span>
            Último acionamento: <strong>Cadeira #{lastEvent.chairId}</strong> via{' '}
            <code className="text-amber-300 font-mono text-[11px]">[{lastEvent.source}]</code> às {lastEvent.time}
          </span>
        </div>
      )}

      {/* ── BOTTOM PANEL ─────────────────────────────────────────────────── */}
      <footer className="flex flex-col items-center gap-2.5">

        {/* Tip hint */}
        <div className="glass-panel rounded-full px-4 py-1.5 text-[11px] text-gray-400/90 border border-white/5">
          {isDevMode
            ? '💡 Modo Dev: Clique nas cadeiras 3D ou use os botões abaixo para testar'
            : '🔒 Modo Hardware: Acionamento permitido apenas via botão físico / SignalR'}
        </div>

        {/* Main controls card */}
        <div className="glass-panel rounded-3xl p-3 md:p-4 w-full max-w-3xl flex flex-col sm:flex-row items-center gap-3 border border-white/[0.09]">

          {/* 5 Chair Buttons Grid */}
          <div className="grid grid-cols-5 gap-2 w-full sm:flex-1">
            {chairs.map((chair) => (
              <ChairButton key={chair.id} chair={chair} onClick={toggleChair} isDevMode={isDevMode} />
            ))}
          </div>

          {/* Divider */}
          <div className="hidden sm:block w-px self-stretch bg-white/10 mx-1" />

          {/* Reset All button */}
          <button
            onClick={resetAll}
            className="btn-tactile pointer-events-auto w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-4 rounded-2xl font-bold text-xs tracking-wide transition-all duration-300 border bg-gradient-to-r from-gray-800 to-gray-700 border-gray-600 text-gray-200 hover:from-gray-700 hover:to-gray-600"
            title="Retornar todas as cadeiras para de costas"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="whitespace-nowrap">Resetar</span>
          </button>
        </div>

        {/* Keyboard shortcut hint */}
        <p className="text-[10px] text-gray-600 font-mono">
          Arraste para orbitar · Scroll para zoom
        </p>
      </footer>
    </div>
  );
}
