import React, { useState, useEffect, useRef, useCallback } from 'react';
import gsap from 'gsap';
import * as THREE from 'three';
import { HERO_WALL_CONFIG } from './HeroShowcaseWall.constants';
import { useHeroWallMedia } from '../../hooks/useHeroWallMedia';
import { createFallbackTexture } from '../../utils/canvasTextureFallback';

/**
 * HeroShowcaseWall — LED Screen 3D Nativo da Arena Voice.
 *
 * Implementação 100% Three.js Nativa (Sem Drei <Html>, sem DOM, sem CSS).
 *
 * Arquitetura Phase 5C.3 + 5C.4:
 * - State Machine Narrativa via useHeroWallMedia (6 modos: event-idle, waiting,
 *   pitch-live, voting, result, transition)
 * - Media Crossfade Engine: Dual-Mesh A/B com GSAP opacity — sem frame preto
 * - VideoTexture nativa via THREE.VideoTexture para pitch-live
 * - CanvasTexture fallback garante telão nunca negro
 * - Iluminação reativa por wallMode via HERO_WALL_CONFIG.COVE_COLOR/.LIGHT_INTENSITY
 * - Ponto de extensão para Phase 5C.5 (Gallery) declarado mas não implementado
 */

// ── Helpers assíncronos (fora do componente — sem re-criação por render) ──────

/**
 * Carrega uma textura de imagem via THREE.TextureLoader.
 * Retorna null se cancelado ou em caso de erro.
 *
 * @param {string}   url
 * @param {Function} isCancelled - () => boolean
 * @returns {Promise<THREE.Texture|null>}
 */
async function loadImageTexture(url, isCancelled) {
  return new Promise((resolve) => {
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    loader.load(
      url,
      (tex) => {
        if (isCancelled()) {
          tex.dispose();
          resolve(null);
          return;
        }
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS     = THREE.ClampToEdgeWrapping;
        tex.wrapT     = THREE.ClampToEdgeWrapping;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.generateMipmaps = true;
        tex.needsUpdate = true;
        resolve(tex);
      },
      undefined,
      () => resolve(null),
    );
  });
}

/**
 * Carrega um vídeo e retorna uma THREE.VideoTexture pronta para reprodução.
 * Aguarda 'canplaythrough' ou VIDEO_LOAD_TIMEOUT_MS antes de desistir.
 * Em caso de falha, retorna null (cabe ao chamador aplicar fallback).
 *
 * @param {string}             url
 * @param {React.MutableRefObject} activeVideoRef - ref para limpeza no unmount
 * @param {Function}           isCancelled - () => boolean
 * @returns {Promise<THREE.VideoTexture|null>}
 */
async function loadVideoTexture(url, activeVideoRef, isCancelled) {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.muted      = true;
    video.loop       = true;
    video.playsInline = true;
    video.preload    = 'auto';
    video.crossOrigin = 'anonymous';

    let settled = false;

    const timeoutId = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(null);
      }
    }, HERO_WALL_CONFIG.VIDEO_LOAD_TIMEOUT_MS);

    video.oncanplaythrough = () => {
      if (settled || isCancelled()) {
        clearTimeout(timeoutId);
        video.pause();
        video.src = '';
        resolve(null);
        return;
      }
      settled = true;
      clearTimeout(timeoutId);

      // Registra o vídeo ativo na ref para cleanup no unmount/troca
      activeVideoRef.current = video;

      const videoTexture = new THREE.VideoTexture(video);
      videoTexture.colorSpace = THREE.SRGBColorSpace;
      videoTexture.minFilter  = THREE.LinearFilter;
      videoTexture.magFilter  = THREE.LinearFilter;

      video.play().catch(() => {
        // Autoplay bloqueado — retorna null, o chamador usa coverImage como fallback
        videoTexture.dispose();
        video.pause();
        video.src = '';
        activeVideoRef.current = null;
        resolve(null);
      });

      resolve(videoTexture);
    };

    video.onerror = () => {
      if (!settled) {
        settled = true;
        clearTimeout(timeoutId);
        resolve(null);
      }
    };

    video.src = url;
    video.load();
  });
}

/**
 * Executa o crossfade Dual-Mesh A→B via GSAP opacity.
 * Sequência:
 *  1. Nova textura entra no Mesh B (opacity=0)
 *  2. GSAP: Mesh B opacity 0→1 em CROSSFADE_DURATION_MS
 *  3. onComplete: promove textura B para A, reseta B opacity=0
 *
 * @param {THREE.Texture}          newTexture
 * @param {React.MutableRefObject} meshAMatRef
 * @param {React.MutableRefObject} meshBMatRef
 * @param {React.MutableRefObject} isCrossfadingRef
 * @param {Function}               setMeshATexture
 * @param {Function}               setMeshBTexture
 * @param {React.MutableRefObject} disposeQueueRef - texturas pendentes de dispose
 */
function executeCrossfade(
  newTexture,
  meshAMatRef,
  meshBMatRef,
  isCrossfadingRef,
  setMeshATexture,
  setMeshBTexture,
  disposeQueueRef,
) {
  if (!meshBMatRef.current) return;

  isCrossfadingRef.current = true;
  setMeshBTexture(newTexture);

  // Aguarda um frame para que R3F aplique o map ao material do Mesh B
  requestAnimationFrame(() => {
    if (!meshBMatRef.current) {
      isCrossfadingRef.current = false;
      return;
    }

    meshBMatRef.current.opacity = 0;

    gsap.to(meshBMatRef.current, {
      opacity: 1,
      duration: HERO_WALL_CONFIG.CROSSFADE_DURATION_MS / 1000,
      ease: HERO_WALL_CONFIG.CROSSFADE_EASE,
      onComplete: () => {
        // Promover: B torna-se A
        setMeshATexture(newTexture);
        setMeshBTexture(null);

        if (meshBMatRef.current) {
          meshBMatRef.current.opacity = 0;
        }

        // Dispor texturas descartadas da fila
        while (disposeQueueRef.current.length > 0) {
          const old = disposeQueueRef.current.shift();
          if (old) old.dispose();
        }

        isCrossfadingRef.current = false;
      },
    });
  });
}

// ── Componente ────────────────────────────────────────────────────────────────

/**
 * @param {Object|null}   props.currentProject
 * @param {Object|null}   props.currentEvent
 * @param {Object|null}   props.pitchState
 * @param {Object}        props.branding
 */
export function HeroShowcaseWall({
  currentProject = null,
  currentEvent   = null,
  pitchState     = null,
  branding       = {},
}) {
  // ── Lighting refs (arquitetura preservada) ───────────────────────────────
  const topCoveLightRef    = useRef();
  const bottomCoveLightRef = useRef();
  const stageAmbientLightRef = useRef();

  // ── Dual-Mesh refs & state ───────────────────────────────────────────────
  const meshAMatRef      = useRef();
  const meshBMatRef      = useRef();
  const isCrossfadingRef = useRef(false);
  const [meshATexture, setMeshATexture] = useState(null);
  const [meshBTexture, setMeshBTexture] = useState(null);

  // ── Vídeo ativo (para pause/cleanup) ────────────────────────────────────
  const activeVideoRef = useRef(null);

  // ── Fila de texturas a descartar após crossfade ──────────────────────────
  const disposeQueueRef = useRef([]);

  // ── Textura atual do Mesh A (para disposal seguro) ───────────────────────
  const meshATextureRef = useRef(null);
  useEffect(() => {
    meshATextureRef.current = meshATexture;
  }, [meshATexture]);

  // ── State Machine Narrativa ──────────────────────────────────────────────
  const { wallMode, mediaCandidate } = useHeroWallMedia({
    currentProject,
    currentEvent,
    pitchState,
  });

  // ── Cor secundária para cove lights (branding do evento) ─────────────────
  const secondaryColor = branding?.secondaryColor
    || currentEvent?.branding?.secondaryColor
    || '#d4a373';

  // ── Cleanup global no unmount ────────────────────────────────────────────
  useEffect(() => {
    return () => {
      // Parar vídeo ativo
      if (activeVideoRef.current) {
        activeVideoRef.current.pause();
        activeVideoRef.current.src = '';
        activeVideoRef.current = null;
      }
      // Descartar textura do Mesh A
      if (meshATextureRef.current) {
        meshATextureRef.current.dispose();
        meshATextureRef.current = null;
      }
      // Descartar fila de texturas pendentes
      while (disposeQueueRef.current.length > 0) {
        const old = disposeQueueRef.current.shift();
        if (old) old.dispose();
      }
      // Matar tweens GSAP de qualquer ref de luz
      gsap.killTweensOf([
        stageAmbientLightRef.current,
        topCoveLightRef.current,
        bottomCoveLightRef.current,
      ].filter(Boolean));
    };
  }, []);

  // ── Carregamento e crossfade de mídia ─────────────────────────────────────
  // Disparado sempre que mediaCandidate muda (derivado do wallMode)
  useEffect(() => {
    let cancelled = false;
    const isCancelled = () => cancelled;

    async function loadAndCrossfade() {
      const { type, url, label, themeColor } = mediaCandidate;

      let newTexture = null;

      if (type === 'canvas') {
        // Fallback imediato — nunca deixa o telão preto
        newTexture = createFallbackTexture(label, themeColor);
      } else if (type === 'video' && url) {
        // Parar vídeo anterior antes de carregar novo
        if (activeVideoRef.current) {
          activeVideoRef.current.pause();
          activeVideoRef.current.src = '';
          activeVideoRef.current = null;
        }
        newTexture = await loadVideoTexture(url, activeVideoRef, isCancelled);
        if (isCancelled()) {
          if (newTexture) newTexture.dispose();
          return;
        }
        // Se vídeo falhou, cai para coverImage se disponível
        if (!newTexture) {
          const coverUrl = mediaCandidate.coverFallbackUrl ?? null;
          if (coverUrl) {
            newTexture = await loadImageTexture(coverUrl, isCancelled);
          }
          if (!newTexture && !isCancelled()) {
            newTexture = createFallbackTexture(label, themeColor ?? '#d90429');
          }
        }
      } else if (type === 'image' && url) {
        newTexture = await loadImageTexture(url, isCancelled);
        if (isCancelled()) {
          if (newTexture) newTexture.dispose();
          return;
        }
        if (!newTexture) {
          // URL quebrada — usa canvas fallback
          newTexture = createFallbackTexture(label, themeColor ?? '#d90429');
        }
      }

      if (!newTexture || isCancelled()) return;

      // Enfileirar a textura atual do Mesh A para dispose após o crossfade
      if (meshATextureRef.current && meshATextureRef.current !== newTexture) {
        disposeQueueRef.current.push(meshATextureRef.current);
      }

      executeCrossfade(
        newTexture,
        meshAMatRef,
        meshBMatRef,
        isCrossfadingRef,
        setMeshATexture,
        setMeshBTexture,
        disposeQueueRef,
      );
    }

    loadAndCrossfade();

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaCandidate]);

  // ── Iluminação reativa por wallMode ──────────────────────────────────────
  useEffect(() => {
    const coveColor = new THREE.Color(
      HERO_WALL_CONFIG.COVE_COLOR[wallMode] ?? secondaryColor
    );

    // Atualizar cor das cove lights
    for (const ref of [topCoveLightRef, bottomCoveLightRef]) {
      if (!ref.current) continue;
      gsap.to(ref.current.color, {
        r: coveColor.r,
        g: coveColor.g,
        b: coveColor.b,
        duration: 0.8,
        ease: 'power2.out',
      });
    }

    // Atualizar intensidade do pointLight — com pulso para 'voting'
    if (stageAmbientLightRef.current) {
      gsap.killTweensOf(stageAmbientLightRef.current);

      if (wallMode === 'voting') {
        gsap.to(stageAmbientLightRef.current, {
          intensity: 2.4,
          yoyo: true,
          repeat: -1,
          duration: HERO_WALL_CONFIG.VOTING_LIGHT_PULSE_DURATION_S,
          ease: 'sine.inOut',
        });
      } else {
        gsap.to(stageAmbientLightRef.current, {
          intensity: HERO_WALL_CONFIG.LIGHT_INTENSITY[wallMode] ?? 2.2,
          duration: 0.8,
          ease: 'power2.out',
        });
      }
    }
  }, [wallMode, secondaryColor]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <group position={[0, 6.6, -20.6]} rotation={[0, 0, 0]}>
      {/* ── 1. Caixa Arquitetural do Telão (Shadow Box Monumental em Nogueira) ─ */}
      <mesh position={[0, 0, -0.4]}>
        <boxGeometry args={[34.4, 12.2, 0.7]} />
        <meshStandardMaterial color="#14100c" roughness={0.48} metalness={0.25} />
      </mesh>

      {/* ── 2. Moldura Chanfrada Superior e Inferior em Bronze Nobre ─────────── */}
      <mesh position={[0, 5.92, -0.05]}>
        <boxGeometry args={[34.0, 0.35, 0.28]} />
        <meshStandardMaterial color="#2d2218" roughness={0.32} metalness={0.65} />
      </mesh>
      <mesh position={[0, -5.92, -0.05]}>
        <boxGeometry args={[34.0, 0.35, 0.28]} />
        <meshStandardMaterial color="#2d2218" roughness={0.32} metalness={0.65} />
      </mesh>

      {/* ── 3. Pilastras de Transição Lateral (Portal Arquitetural) ─────────── */}
      <mesh position={[-16.9, 0, -0.02]}>
        <boxGeometry args={[0.38, 12.1, 0.32]} />
        <meshStandardMaterial color="#3a2a1c" roughness={0.4} metalness={0.3} />
      </mesh>
      <mesh position={[16.9, 0, -0.02]}>
        <boxGeometry args={[0.38, 12.1, 0.32]} />
        <meshStandardMaterial color="#3a2a1c" roughness={0.4} metalness={0.3} />
      </mesh>

      {/* ── 4. Painel de Fundo em Vidro Temperado Escuro de Alta Densidade ──── */}
      <mesh position={[0, 0, 0.04]}>
        <planeGeometry args={[33.8, 11.6]} />
        <meshStandardMaterial
          color="#06080d"
          roughness={0.22}
          metalness={0.8}
        />
      </mesh>

      {/* ── 5. Fitas de Iluminação Indireta Perimetral (Cove Halos Reativos) ── */}
      <mesh position={[0, 5.76, 0.06]}>
        <planeGeometry args={[33.6, 0.05]} />
        <meshBasicMaterial ref={topCoveLightRef} color={secondaryColor} transparent opacity={0.85} />
      </mesh>
      <mesh position={[0, -5.76, 0.06]}>
        <planeGeometry args={[33.6, 0.05]} />
        <meshBasicMaterial ref={bottomCoveLightRef} color={secondaryColor} transparent opacity={0.85} />
      </mesh>

      {/* Luz ambiente difusa projetada do telão sobre o palco */}
      <pointLight
        ref={stageAmbientLightRef}
        position={[0, 0, 2.5]}
        intensity={HERO_WALL_CONFIG.LIGHT_INTENSITY['waiting']}
        color={secondaryColor}
        distance={28}
      />

      {/* ── 6. HERO LED SCREEN — Mesh A (textura ativa) ─────────────────────── */}
      <mesh
        position={[0, 0, HERO_WALL_CONFIG.MESH_A_Z]}
        renderOrder={1}
      >
        <planeGeometry args={[HERO_WALL_CONFIG.LED_WALL_WIDTH, HERO_WALL_CONFIG.LED_WALL_HEIGHT]} />
        <meshBasicMaterial
          ref={meshAMatRef}
          map={meshATexture}
          side={THREE.FrontSide}
          toneMapped={false}
          transparent
          depthWrite={false}
          opacity={1}
        />
      </mesh>

      {/* ── 7. HERO LED SCREEN — Mesh B (textura entrante no crossfade) ──────── */}
      <mesh
        position={[0, 0, HERO_WALL_CONFIG.MESH_B_Z]}
        renderOrder={2}
      >
        <planeGeometry args={[HERO_WALL_CONFIG.LED_WALL_WIDTH, HERO_WALL_CONFIG.LED_WALL_HEIGHT]} />
        <meshBasicMaterial
          ref={meshBMatRef}
          map={meshBTexture}
          side={THREE.FrontSide}
          toneMapped={false}
          transparent
          depthWrite={false}
          opacity={0}
        />
      </mesh>
    </group>
  );
}

export default HeroShowcaseWall;
