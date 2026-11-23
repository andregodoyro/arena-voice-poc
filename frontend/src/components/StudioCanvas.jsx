import React, { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import { EffectComposer, Bloom, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import * as THREE from 'three';
import { StudioScene } from './StudioScene';

/**
 * StudioCanvas — R3F Canvas container da Arena Voice.
 * Configura renderizador (sRGB, sombras suaves), câmera institucional de keynote,
 * controles de visualização e atmosfera de profundidade cênica.
 * 
 * Milestone 2D.4: Dynamic Theming & Reactive Stage Experience.
 * Integra branding dinâmico reativo e iluminação cênica aprimorada.
 * 
 * Milestone 5A & 5B: Live Show Experience & Immersive Stage (ADR-026 & ADR-027).
 * - Pipeline de postprocessing: EffectComposer + Bloom seletivo + ToneMapping ACES Filmic;
 * - Propagação autoritativa de pitchState para reatividade cênica sincronizada ao show.
 */
export function StudioCanvas({
  chairs = [],
  branding = {},
  pitchState = null,
  currentProject = null,
  currentEvent = null,
}) {
  // Configuração dinâmica de enquadramento institucional
  const cameraConfig = useMemo(() => {
    let viewMode = 'frontal';
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      viewMode = params.get('view') || 'frontal';
    }

    switch (viewMode) {
      case 'left':
        return {
          position: [-9.5, 5.0, 15.0],
          target: [0, 3.0, -3.2],
          fov: 48,
        };
      case 'right':
        return {
          position: [9.5, 5.0, 15.0],
          target: [0, 3.0, -3.2],
          fov: 48,
        };
      case 'wide':
        return {
          position: [0, 7.5, 22.0],
          target: [0, 3.0, -3.2],
          fov: 52,
        };
      case 'frontal':
      default:
        return {
          position: [0, 4.6, 17.5],
          target: [0, 3.2, -3.2],
          fov: 48,
        };
    }
  }, []);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse at center top, #241b14 0%, #0c0907 65%, #050403 100%)',
      }}
    >
      <Canvas
        shadows="soft"
        dpr={[1, 2]} // pixel ratio responsivo para telas HD e 4K
        camera={{
          position: cameraConfig.position,
          fov: cameraConfig.fov,
          near: 0.1,
          far: 140,
        }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          outputColorSpace: THREE.SRGBColorSpace,
          // toneMapping delegado ao EffectComposer (ToneMapping ACES Filmic effect)
          toneMapping: THREE.NoToneMapping,
          toneMappingExposure: 1.25,
          preserveDrawingBuffer: true,
        }}
        onCreated={({ gl }) => {
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
        }}
      >
        {/* Cor de fundo cênica profunda em tons quentes de grafite/ébano */}
        <color attach="background" args={['#0a0807']} />

        {/* Neblina atmosférica quente com gradiente suave */}
        <fog attach="fog" args={['#0a0807', 28, 80]} />

        {/* ── Controles de Câmera Institucional ───────────────────────────── */}
        <OrbitControls
          makeDefault
          enablePan={false}
          minPolarAngle={Math.PI / 4.8}
          maxPolarAngle={Math.PI / 2.08}
          minDistance={8}
          maxDistance={38}
          rotateSpeed={0.5}
          zoomSpeed={0.7}
          enableDamping
          dampingFactor={0.07}
          target={cameraConfig.target}
        />

        {/* ── Iluminação Ambiente Indireta Quente (3000K Arquitetural) ───── */}
        <hemisphereLight skyColor="#4d3725" groundColor="#140f0b" intensity={0.82} />

        {/* ── Cena Principal dentro de Suspense ───────────────────────────── */}
        <Suspense fallback={null}>
          <StudioScene
            chairs={chairs}
            branding={branding}
            pitchState={pitchState}
            currentProject={currentProject}
            currentEvent={currentEvent}
          />

          {/* Sombra de contato suave no piso nobre da arena */}
          <ContactShadows
            position={[0, -0.01, 0]}
            opacity={0.7}
            scale={36}
            blur={2.4}
            far={10}
            color="#000000"
          />
        </Suspense>

        {/* ── Pipeline de Postprocessing (Milestone 5A, ADR-026) ──────────── */}
        {/* multisampling=0 evita artefatos combinados com postprocessing     */}
        <EffectComposer multisampling={0}>
          {/* Bloom seletivo para realce dos halos arquiteturais e consoles     */}
          <Bloom
            luminanceThreshold={0.88}
            luminanceSmoothing={0.85}
            intensity={1.2}
            mipmapBlur
          />
          {/* ToneMapping ACES Filmic — substitui gl.toneMapping do renderer  */}
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}

export default StudioCanvas;
