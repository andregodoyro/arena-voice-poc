import React, { Suspense, useEffect, useRef, useMemo } from 'react';
import { useTexture, useVideoTexture } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import { HERO_WALL_CONFIG } from './HeroShowcaseWall.constants';
import { useHeroWallMedia } from '../../hooks/useHeroWallMedia';
import { createFallbackTexture } from '../../utils/canvasTextureFallback';

/**
 * ScreenVideo — Subcomponente que renderiza a textura de vídeo via useVideoTexture do Drei.
 * Integração bidirecional com o Cockpit do Operador via BroadcastChannel ('arena_media_controls').
 */
function ScreenVideo({ url }) {
  const texture = useVideoTexture(url, {
    muted: true,
    loop: true,
    start: true,
    crossOrigin: 'Anonymous',
    playsInline: true,
  });

  useEffect(() => {
    const video = texture?.image;
    if (!video) return;

    let channel;
    try {
      channel = new BroadcastChannel('arena_media_controls');

      const handleMessage = (e) => {
        const data = e.data;
        if (!data || !data.action) return;

        if (data.action === 'PLAY') {
          video.play().catch(() => {});
        } else if (data.action === 'PAUSE') {
          video.pause();
        } else if (data.action === 'RESTART') {
          video.currentTime = 0;
          video.play().catch(() => {});
        }
      };

      channel.addEventListener('message', handleMessage);

      const notify = () => {
        channel.postMessage({
          type: 'MEDIA_STATUS',
          isPlaying: !video.paused,
          currentTime: video.currentTime,
          duration: video.duration || 0,
          mediaType: 'video',
        });
      };

      video.addEventListener('play', notify);
      video.addEventListener('pause', notify);
      video.addEventListener('timeupdate', notify);

      notify();

      return () => {
        video.removeEventListener('play', notify);
        video.removeEventListener('pause', notify);
        video.removeEventListener('timeupdate', notify);
        channel.removeEventListener('message', handleMessage);
        channel.close();
      };
    } catch {
      // BroadcastChannel indisponível
    }
  }, [texture]);

  return (
    <meshBasicMaterial
      map={texture}
      side={THREE.FrontSide}
      toneMapped={false}
    />
  );
}

/**
 * ScreenImage — Subcomponente que renderiza textura estática via useTexture do Drei.
 */
function ScreenImage({ url }) {
  const texture = useTexture(url);

  useEffect(() => {
    try {
      const channel = new BroadcastChannel('arena_media_controls');
      channel.postMessage({
        type: 'MEDIA_STATUS',
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        mediaType: 'image',
      });
      channel.close();
    } catch {}
  }, [url]);

  return (
    <meshBasicMaterial
      map={texture}
      side={THREE.FrontSide}
      toneMapped={false}
    />
  );
}

/**
 * ScreenFallback — Subcomponente que renderiza uma CanvasTexture gerada sob demanda.
 */
function ScreenFallback({ label, themeColor }) {
  const texture = useMemo(() => createFallbackTexture(label, themeColor), [label, themeColor]);

  useEffect(() => {
    try {
      const channel = new BroadcastChannel('arena_media_controls');
      channel.postMessage({
        type: 'MEDIA_STATUS',
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        mediaType: 'canvas',
      });
      channel.close();
    } catch {}
  }, [label, themeColor]);

  return (
    <meshBasicMaterial
      map={texture}
      side={THREE.FrontSide}
      toneMapped={false}
    />
  );
}

/**
 * MediaErrorBoundary — Previne que falhas no carregamento de textura quebrem a cena Three.js.
 */
class MediaErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err) {
    console.warn('[HeroShowcaseWall] Falha na mídia Drei, ativando fallback visual:', err);
  }
  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

/**
 * HeroShowcaseWall — Telão LED 3D Monumental da Arena Voice (Arquitetura Declarativa Simplificada).
 *
 * Utiliza Drei useTexture e useVideoTexture sem Dual-Mesh, sem loaders manuais e sem timeouts.
 * Iluminação e ambiência orquestradas reativamente pelo wallMode (5 estados narrativos).
 */
export function HeroShowcaseWall({
  currentProject = null,
  currentEvent = null,
  pitchState = null,
  branding = null,
  onWallModeChange = null,
}) {
  const topCoveLightRef = useRef(null);
  const bottomCoveLightRef = useRef(null);
  const stageAmbientLightRef = useRef(null);

  const secondaryColor = branding?.secondaryColor ?? '#d90429';

  // State machine narrativa simplificada
  const { wallMode, mediaCandidate } = useHeroWallMedia({
    currentProject,
    currentEvent,
    pitchState,
    onWallModeChange,
  });

  // Iluminação cênica reativa aos 5 estados narrativos
  useEffect(() => {
    const rawCoveColor = HERO_WALL_CONFIG.COVE_COLOR[wallMode] ?? secondaryColor;
    const coveColor = new THREE.Color(rawCoveColor);

    // Ajustar Cove Lights
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

    // Ajustar Spot/Point Light do palco com pulso em Voting
    if (stageAmbientLightRef.current) {
      gsap.killTweensOf(stageAmbientLightRef.current);

      if (wallMode === 'voting') {
        gsap.to(stageAmbientLightRef.current, {
          intensity: 2.8,
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

  const fallbackView = (
    <ScreenFallback
      label={mediaCandidate.label}
      themeColor={mediaCandidate.themeColor}
    />
  );

  return (
    <group position={[0, 6.6, -20.6]} rotation={[0, 0, 0]}>
      {/* ── 1. Caixa Arquitetural do Telão (Shadow Box Monumental) ──────────── */}
      <mesh position={[0, 0, -0.4]}>
        <boxGeometry args={[34.4, 12.2, 0.7]} />
        <meshStandardMaterial color="#14100c" roughness={0.48} metalness={0.25} />
      </mesh>

      {/* ── 2. Moldura Chanfrada Superior e Inferior em Bronze ──────────────── */}
      <mesh position={[0, 5.92, -0.05]}>
        <boxGeometry args={[34.0, 0.35, 0.28]} />
        <meshStandardMaterial color="#2d2218" roughness={0.32} metalness={0.65} />
      </mesh>
      <mesh position={[0, -5.92, -0.05]}>
        <boxGeometry args={[34.0, 0.35, 0.28]} />
        <meshStandardMaterial color="#2d2218" roughness={0.32} metalness={0.65} />
      </mesh>

      {/* ── 3. Pilastras de Transição Lateral ───────────────────────────────── */}
      <mesh position={[-16.9, 0, -0.02]}>
        <boxGeometry args={[0.38, 12.1, 0.32]} />
        <meshStandardMaterial color="#3a2a1c" roughness={0.4} metalness={0.3} />
      </mesh>
      <mesh position={[16.9, 0, -0.02]}>
        <boxGeometry args={[0.38, 12.1, 0.32]} />
        <meshStandardMaterial color="#3a2a1c" roughness={0.4} metalness={0.3} />
      </mesh>

      {/* ── 4. Painel de Fundo em Vidro Temperado Escuro ────────────────────── */}
      <mesh position={[0, 0, 0.04]}>
        <planeGeometry args={[33.8, 11.6]} />
        <meshStandardMaterial color="#06080d" roughness={0.22} metalness={0.8} />
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

      {/* ── 6. HERO LED SCREEN (Malha Única Declarativa com Drei) ───────────── */}
      <mesh position={[0, 0, HERO_WALL_CONFIG.SCREEN_Z]} renderOrder={1}>
        <planeGeometry args={[HERO_WALL_CONFIG.LED_WALL_WIDTH, HERO_WALL_CONFIG.LED_WALL_HEIGHT]} />
        <MediaErrorBoundary resetKey={mediaCandidate.url || wallMode} fallback={fallbackView}>
          <Suspense fallback={fallbackView}>
            {mediaCandidate.type === 'video' && mediaCandidate.url ? (
              <ScreenVideo url={mediaCandidate.url} />
            ) : mediaCandidate.type === 'image' && mediaCandidate.url ? (
              <ScreenImage url={mediaCandidate.url} />
            ) : (
              fallbackView
            )}
          </Suspense>
        </MediaErrorBoundary>
      </mesh>
    </group>
  );
}

export default HeroShowcaseWall;
