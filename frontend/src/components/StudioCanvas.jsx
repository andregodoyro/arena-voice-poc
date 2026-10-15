import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { StudioScene } from './StudioScene';

/**
 * StudioCanvas — R3F Canvas container.
 * Configures renderer (sRGB, shadows), camera, orbit controls, and environment.
 */
export function StudioCanvas({ chairs, toggleChair }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse at center top, #0d0018 0%, #040408 65%)',
      }}
    >
      <Canvas
        shadows="soft"
        dpr={[1, 2]}                       // responsive pixel ratio
        camera={{ position: [0, 5.8, 17.5], fov: 44, near: 0.1, far: 100 }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          outputColorSpace: THREE.SRGBColorSpace,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.15,
        }}
        onCreated={({ gl }) => {
          gl.shadowMap.enabled = true;
          gl.shadowMap.type    = THREE.PCFSoftShadowMap;
        }}
      >
        {/* Scene background color */}
        <color attach="background" args={['#040408']} />

        {/* Atmospheric depth fog */}
        <fog attach="fog" args={['#040408', 16, 38]} />

        {/* ── Camera Controls ─────────────────────────────────────────────── */}
        <OrbitControls
          makeDefault
          enablePan={false}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 2.2}
          minDistance={9}
          maxDistance={26}
          rotateSpeed={0.55}
          zoomSpeed={0.7}
          enableDamping
          dampingFactor={0.07}
          target={[0, 2.5, 0]}
        />

        {/* ── Environment & Postprocessing Lighting ───────────────────────── */}
        <Suspense fallback={null}>
          <Environment preset="night" environmentIntensity={0.5} />

          {/* ── Main Scene ────────────────────────────────────────────────── */}
          <StudioScene chairs={chairs} toggleChair={toggleChair} />

          {/* ── Contact shadows on floor plane ────────────────────────────── */}
          <ContactShadows
            position={[0, -0.02, 0]}
            opacity={0.65}
            scale={30}
            blur={2.5}
            far={8}
            color="#000000"
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
