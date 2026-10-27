import React, { useState, useEffect } from 'react';
import { Sparkles, Flame, Radio } from 'lucide-react';
import { StageProjectBanner } from './StageProjectBanner';

/**
 * StageHUD — Camada 2D cênica e pública do Telão 3D.
 * 
 * Milestone 2D.1: Infraestrutura de Dados, Contexto e HUD Cênico.
 * 
 * Foco estrito na experiência do público e da plateia:
 * - Identidade visual do evento ativo (CurrentEvent: título, tagline, logo e branding);
 * - Ficha cênica do projeto em apresentação no palco (StageProjectBanner);
 * - Placar consolidado de cadeiras viradas ("X / 5") com feedback luminoso;
 * - Sem botões interativos, sem Modo Dev, sem termos técnicos ou controles de rede (ADR-009).
 */
export function StageHUD({ chairs = [], currentProject = null, currentEvent = null }) {
  const [eventLogoFailed, setEventLogoFailed] = useState(false);

  // Reseta o estado do logo caso o evento mude
  useEffect(() => {
    setEventLogoFailed(false);
  }, [currentEvent?.id, currentEvent?.branding?.logoUrl]);

  const turnedCount = chairs.filter((c) => c.isTurned).length;
  const allTurned = chairs.length > 0 && turnedCount === chairs.length;

  const eventTitle = currentEvent?.title || 'ARENA VOICE';
  const eventTagline = currentEvent?.branding?.tagline || 'Telão 3D';
  const eventLogoUrl = currentEvent?.branding?.logoUrl;
  const primaryColor = currentEvent?.branding?.primaryColor || '#d90429';

  const hasValidEventLogo = eventLogoUrl && !eventLogoFailed;

  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-4 md:p-8 select-none overflow-hidden">
      {/* ── TOP BAR CÊNICA: Identidade Institucional + Placar ────────────────── */}
      <header className="flex items-start justify-between gap-4 w-full">
        {/* Identidade Visual do Evento Ativo */}
        <div
          className="glass-panel rounded-2xl px-4 py-3 md:px-5 md:py-3.5 flex items-center gap-3.5 border shadow-2xl backdrop-blur-xl"
          style={{
            borderColor: `${primaryColor}30`,
            boxShadow: `0 15px 35px rgba(0, 0, 0, 0.6), 0 0 20px ${primaryColor}15`,
          }}
        >
          {/* Logo do Evento com Fallback Elegante */}
          {hasValidEventLogo ? (
            <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-black/40 border border-white/10 p-1.5 flex items-center justify-center flex-shrink-0 shadow-lg overflow-hidden">
              <img
                src={eventLogoUrl}
                alt={eventTitle}
                onError={() => setEventLogoFailed(true)}
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div
              className="w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0"
              style={{
                background: `linear-gradient(135deg, ${primaryColor} 0%, #b7094c 100%)`,
                boxShadow: `0 0 15px ${primaryColor}60`,
              }}
            >
              <Sparkles className="w-5 h-5 text-white" />
            </div>
          )}

          <div className="text-left">
            <h1 className="font-display text-xl md:text-2xl leading-none text-white tracking-wide truncate max-w-xs md:max-w-md">
              {eventTitle}
            </h1>
            <p className="text-[10px] md:text-xs text-gray-400 font-medium uppercase tracking-widest mt-0.5 truncate max-w-xs">
              {eventTagline}
            </p>
          </div>
        </div>

        {/* Placar Cênico Consolidado da Arena */}
        <div
          className="glass-panel rounded-2xl px-5 py-3 md:px-6 md:py-3.5 flex items-center gap-3.5 border shadow-2xl backdrop-blur-xl"
          style={{
            borderColor: turnedCount > 0 ? `${primaryColor}40` : 'rgba(255, 255, 255, 0.1)',
            boxShadow: turnedCount > 0 ? `0 15px 35px rgba(0, 0, 0, 0.6), 0 0 25px ${primaryColor}20` : '0 15px 35px rgba(0,0,0,0.6)',
          }}
        >
          <div className="text-right">
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
              Apoio da Banca
            </p>
            <p className="font-display text-3xl md:text-4xl leading-none mt-0.5">
              <span
                style={{
                  color: turnedCount > 0 ? primaryColor : '#6b7280',
                  textShadow: turnedCount > 0 ? `0 0 15px ${primaryColor}90` : 'none',
                }}
              >
                {turnedCount}
              </span>
              <span className="text-gray-600 text-lg md:text-xl"> / {chairs.length}</span>
            </p>
          </div>

          <div
            className={`
              w-11 h-11 md:w-12 md:h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-500
              ${allTurned
                ? 'shadow-lg scale-110'
                : turnedCount > 0
                  ? 'border'
                  : 'bg-gray-900/80 border border-gray-800'
              }
            `}
            style={{
              backgroundColor: allTurned
                ? primaryColor
                : turnedCount > 0
                  ? `${primaryColor}25`
                  : undefined,
              borderColor: turnedCount > 0 ? `${primaryColor}60` : undefined,
              boxShadow: allTurned ? `0 0 25px ${primaryColor}80` : undefined,
            }}
          >
            {allTurned ? (
              <Flame className="w-6 h-6 text-yellow-300 animate-bounce" />
            ) : (
              <Radio
                className="w-5 h-5 transition-colors duration-300"
                style={{ color: turnedCount > 0 ? primaryColor : '#6b7280' }}
              />
            )}
          </div>
        </div>
      </header>

      {/* ── FOOTER CÊNICO: Banner do Projeto Atual no Palco ──────────────────── */}
      <footer className="w-full flex items-end justify-between">
        <StageProjectBanner project={currentProject} branding={currentEvent?.branding} />
      </footer>
    </div>
  );
}

export default StageHUD;
