import React, { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { StudioScene } from './StudioScene';

/**
 * StudioCanvas — R3F Canvas container da Arena Voice.
 * Configura renderizador (sRGB, sombras suaves), câmera institucional de keynote,
 * controles de visualização e atmosfera de profundidade cênica.
 * 
 * Milestone 2D.3 (Ajuste de Composição):
 * Suporta visualização institucional padrão e calibrações de enquadramento
 * via query parameter (?view=frontal|left|right|wide) para inspeção e validação visual cênica.
 */
export function StudioCanvas({ chairs = [] }) {
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
          position: [-7.8, 5.2, 14.2],
          target: [0, 1.4, -1.5],
          fov: 46,
        };
      case 'right':
        return {
          position: [7.8, 5.2, 14.2],
          target: [0, 1.4, -1.5],
          fov: 46,
        };
      case 'wide':
        return {
          position: [0, 9.2, 21.5],
          target: [0, 1.8, -2.5],
          fov: 48,
        };
      case 'frontal':
      default:
        return {
          position: [0, 5.2, 15.8],
          target: [0, 1.4, -1.0],
          fov: 46,
        };
    }
  }, []);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse at center top, #141a33 0%, #05060d 65%)',
      }}
    >
      <Canvas
        shadows="soft"
        dpr={[1, 2]} // pixel ratio responsivo para telas HD e 4K
        camera={{
          position: cameraConfig.position,
          fov: cameraConfig.fov,
          near: 0.1,
          far: 120,
        }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          outputColorSpace: THREE.SRGBColorSpace,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.3,
          preserveDrawingBuffer: true,
        }}
        onCreated={({ gl }) => {
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
        }}
      >
        {/* Cor de fundo cênica profunda */}
        <color attach="background" args={['#060812']} />

        {/* Neblina atmosférica expandida com gradiente suave */}
        <fog attach="fog" args={['#060812', 26, 65]} />

        {/* ── Controles de Câmera Institucional ───────────────────────────── */}
        <OrbitControls
          makeDefault
          enablePan={false}
          minPolarAngle={Math.PI / 4.5}
          maxPolarAngle={Math.PI / 2.1}
          minDistance={7}
          maxDistance={35}
          rotateSpeed={0.55}
          zoomSpeed={0.7}
          enableDamping
          dampingFactor={0.07}
          target={cameraConfig.target}
        />

        {/* ── Ambiente & Iluminação Cênica Integrada ─────────────────────── */}
        <hemisphereLight skyColor="#242c4c" groundColor="#080912" intensity={0.75} />

        {/* ── Cena Principal dentro de Suspense ───────────────────────────── */}
        <Suspense fallback={null}>
          <StudioScene chairs={chairs} />

          {/* Sombra de contato no piso da arena */}
          <ContactShadows
            position={[0, -0.01, 0]}
            opacity={0.65}
            scale={32}
            blur={2.2}
            far={8}
            color="#000000"
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

export default StudioCanvas;
