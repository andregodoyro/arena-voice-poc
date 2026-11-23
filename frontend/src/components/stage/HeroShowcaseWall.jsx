import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import * as THREE from 'three';
import { resolveMediaUrl } from '../../utils/mediaResolver';

/**
 * HeroShowcaseWall — LED Screen 3D Nativo da Arena Voice.
 *
 * Implementação 100% Three.js Nativa (Sem Drei <Html>, sem DOM, sem CSS):
 * - Geometria: PlaneGeometry (33.8m x 11.6m) integrada à arquitetura 3D do palco
 * - Material: MeshBasicMaterial com mapa de textura WebGL
 * - Textura: THREE.TextureLoader assíncrono com sRGBColorSpace e auto-disposal
 * - Renderização puramente em WebGL / GPU
 */
export function HeroShowcaseWall({
  currentProject = null,
  currentEvent = null,
  pitchState = null,
  branding = {},
}) {
  const topCoveLightRef = useRef();
  const bottomCoveLightRef = useRef();
  const stageAmbientLightRef = useRef();
  const activeTextureRef = useRef(null);

  const [texture, setTexture] = useState(null);
  const [loadStatus, setLoadStatus] = useState('idle'); // 'idle' | 'loading' | 'loaded' | 'error'

  const secondaryColor = branding?.secondaryColor || currentEvent?.branding?.secondaryColor || '#d4a373';

  // Resolução da imagem de capa principal com precedência estrita
  const _rawCoverUrl =
    (currentProject?.media?.coverImageUrl || '').trim() ||
    (currentProject?.coverImageUrl || '').trim() ||
    (currentProject?.coverImage || '').trim() ||
    (currentProject?.bannerImage || '').trim() ||
    (currentProject?.bannerUrl || '').trim() ||
    (currentProject?.heroImageUrl || '').trim() ||
    (currentProject?.image || '').trim() ||
    null;
  const coverUrl = resolveMediaUrl(_rawCoverUrl);

  const stageName = pitchState?.stage || pitchState?.stageName || (currentProject ? 'PitchRunning' : 'Waiting');
  const isVotingOpen = stageName === 'VotingOpen' || Boolean(pitchState?.isVotingAllowed);
  const isTimedStage = ['PitchRunning', 'QA', 'VotingOpen'].includes(stageName);
  const remSec = typeof pitchState?.remainingSeconds === 'number'
    ? Math.round(pitchState.remainingSeconds)
    : null;
  const isUrgent = isTimedStage && !pitchState?.isPaused && remSec !== null && remSec > 0 && remSec <= 15;
  const isUnanimous = stageName === 'Approved' || stageName === 'Finished';

  // Sincroniza referência ativa para descarte seguro no unmount
  useEffect(() => {
    activeTextureRef.current = texture;
  }, [texture]);

  // Descarte de textura no encerramento do componente
  useEffect(() => {
    return () => {
      if (activeTextureRef.current) {
        activeTextureRef.current.dispose();
        activeTextureRef.current = null;
      }
    };
  }, []);

  // Carregamento de Textura Nativa via THREE.TextureLoader com ciclo de vida seguro
  useEffect(() => {
    let isCancelled = false;
    let loadedTex = null;

    if (!coverUrl) {
      setTexture((prev) => {
        if (prev) prev.dispose();
        return null;
      });
      setLoadStatus('idle');
      return;
    }

    setLoadStatus('loading');

    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');

    loader.load(
      coverUrl,
      (tex) => {
        if (isCancelled) {
          tex.dispose();
          return;
        }

        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.generateMipmaps = true;
        tex.needsUpdate = true;

        loadedTex = tex;
        setTexture((prev) => {
          if (prev && prev !== tex) {
            prev.dispose();
          }
          return tex;
        });
        setLoadStatus('loaded');
      },
      undefined,
      () => {
        if (isCancelled) return;
        setTexture((prev) => {
          if (prev) prev.dispose();
          return null;
        });
        setLoadStatus('error');
      }
    );

    return () => {
      isCancelled = true;
      if (loadedTex) {
        loadedTex.dispose();
        loadedTex = null;
      }
    };
  }, [coverUrl]);

  // Animação reativa de iluminação indireta da moldura arquitetural via GSAP
  useEffect(() => {
    const targetCoveColor = new THREE.Color(
      isUnanimous ? '#f59e0b' : (isUrgent ? '#ff9f43' : (isVotingOpen ? '#10b981' : secondaryColor))
    );

    if (topCoveLightRef.current) {
      gsap.to(topCoveLightRef.current.color, {
        r: targetCoveColor.r,
        g: targetCoveColor.g,
        b: targetCoveColor.b,
        duration: 0.8,
        ease: 'power2.out',
      });
    }

    if (bottomCoveLightRef.current) {
      gsap.to(bottomCoveLightRef.current.color, {
        r: targetCoveColor.r,
        g: targetCoveColor.g,
        b: targetCoveColor.b,
        duration: 0.8,
        ease: 'power2.out',
      });
    }

    if (stageAmbientLightRef.current) {
      const targetIntensity = isUnanimous ? 3.6 : (isUrgent ? 3.2 : (isVotingOpen ? 2.8 : 2.2));
      gsap.to(stageAmbientLightRef.current, {
        intensity: targetIntensity,
        duration: 0.8,
        ease: 'power2.out',
      });
    }
  }, [isUrgent, isVotingOpen, isUnanimous, secondaryColor]);

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

      {/* ── 5. Fitas de Iluminação Indireta Perimetral (Cove Halos Reativos) ──── */}
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
        intensity={2.4}
        color={secondaryColor}
        distance={28}
      />

      {/* ── 6. HERO LED SCREEN 3D NATIVO (THREE.JS PLANE + TEXTURE) ─────────── */}
      <mesh position={[0, 0, 0.08]}>
        <planeGeometry args={[33.8, 11.6]} />
        {texture ? (
          <meshBasicMaterial
            map={texture}
            side={THREE.FrontSide}
            toneMapped={false}
          />
        ) : (
          <meshStandardMaterial
            color={loadStatus === 'error' ? '#880000' : (loadStatus === 'loading' ? '#221100' : '#0a0d14')}
            roughness={0.35}
            metalness={0.5}
            emissive={loadStatus === 'error' ? '#330000' : '#040609'}
            emissiveIntensity={0.5}
          />
        )}
      </mesh>
    </group>
  );
}

export default HeroShowcaseWall;
