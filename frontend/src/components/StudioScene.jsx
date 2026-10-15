import React, { Suspense, useRef } from 'react';
import { useGLTF, Text, Float, Preload } from '@react-three/drei';
import { Chair } from './Chair';
import * as THREE from 'three';

/**
 * Tries to load /studio.glb if present.
 * Wrapped in Suspense+ErrorBoundary so it fails silently when the file isn't
 * available, falling back to the procedural scene.
 */
function GLTFStudio() {
  const { scene } = useGLTF('/studio.glb');
  // Scale and position may need adjustment based on actual model
  scene.traverse((obj) => {
    if (obj.isMesh) {
      obj.receiveShadow = true;
      obj.castShadow    = true;
    }
  });
  return <primitive object={scene} position={[0, 0, 0]} />;
}
// Pre-warm the loader
useGLTF.preload('/studio.glb');

/** Silent fallback wrapper */
class GLTFErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}

/** ─── Procedural Stage Geometry ─────────────────────────────────────────── */
function ProceduralStage() {
  return (
    <group>
      {/* Main platform disc */}
      <mesh position={[0, -0.08, 0]} receiveShadow>
        <cylinderGeometry args={[14, 14.5, 0.38, 80]} />
        <meshStandardMaterial color="#080810" roughness={0.14} metalness={0.88} envMapIntensity={1.2} />
      </mesh>

      {/* Outer accent ring */}
      <mesh position={[0, 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[13.4, 13.85, 80]} />
        <meshBasicMaterial color="#ef233c" side={THREE.DoubleSide} />
      </mesh>

      {/* Singer platform */}
      <mesh position={[0, 0.1, -2.5]} receiveShadow>
        <cylinderGeometry args={[3.6, 3.6, 0.14, 64]} />
        <meshStandardMaterial color="#0d0d1e" metalness={0.92} roughness={0.08} />
      </mesh>
      {/* Singer ring highlight */}
      <mesh position={[0, 0.18, -2.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.42, 3.62, 64]} />
        <meshBasicMaterial color="#ffd166" side={THREE.DoubleSide} />
      </mesh>

      {/* Microphone stand */}
      <group position={[0, 0.15, -2.5]}>
        <mesh position={[0, 0.05, 0]}>
          <cylinderGeometry args={[0.34, 0.34, 0.09, 24]} />
          <meshStandardMaterial color="#1a1a2a" metalness={0.8} />
        </mesh>
        <mesh position={[0, 1.25, 0]}>
          <cylinderGeometry args={[0.022, 0.022, 2.3, 16]} />
          <meshStandardMaterial color="#d0d0e0" metalness={0.98} roughness={0.04} />
        </mesh>
        <mesh position={[0, 2.38, 0]}>
          <sphereGeometry args={[0.09, 16, 16]} />
          <meshStandardMaterial color="#2a2a3a" metalness={0.92} roughness={0.18} />
        </mesh>
      </group>

      {/* Curved back-wall */}
      <mesh position={[0, 6.5, -12]}>
        <cylinderGeometry args={[20, 20, 14, 64, 1, true, Math.PI * 0.72, Math.PI * 0.56]} />
        <meshStandardMaterial color="#04040c" roughness={0.5} side={THREE.BackSide} />
      </mesh>

      {/* Vertical LED tubes */}
      {[-10, -7, -4, 4, 7, 10].map((x, i) => (
        <group key={i} position={[x, 5.8, -11]}>
          <mesh>
            <cylinderGeometry args={[0.06, 0.06, 9.5, 16]} />
            <meshBasicMaterial color={i % 2 === 0 ? '#ef233c' : '#3a86ff'} />
          </mesh>
          <pointLight
            position={[0, 0, 0]}
            intensity={i % 2 === 0 ? 4 : 3}
            color={i % 2 === 0 ? '#ef233c' : '#3a86ff'}
            distance={8}
          />
        </group>
      ))}

      {/* Floor grid lines */}
      {[-8, -5.5, -3, -0.5, 2, 4.5, 7, 9.5].map((z, i) => (
        <mesh key={`grid-${i}`} position={[0, 0.02, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[28, 0.02]} />
          <meshBasicMaterial color="#1a1a36" transparent opacity={0.5} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * THE VOICE animated title floating above the stage
 */
function StudioTitle() {
  return (
    <Float speed={1.5} rotationIntensity={0.06} floatIntensity={0.18}>
      <group position={[0, 10.4, -9.5]}>
        {/* Glow plane behind text */}
        <mesh position={[0, 0, -0.3]}>
          <planeGeometry args={[11, 3.2]} />
          <meshBasicMaterial color="#ef233c" transparent opacity={0.06} />
        </mesh>

        <Text
          fontSize={2.0}
          color="#ef233c"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.1}
          outlineColor="#ffffff"
        >
          THE VOICE
        </Text>

        <Text
          position={[0, -1.45, 0]}
          fontSize={0.56}
          color="#ffd166"
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.22}
        >
          ESTÚDIO INTERATIVO 3D
        </Text>
      </group>
    </Float>
  );
}

/**
 * StudioScene — orchestrates lights, stage geometry, GLTF model, and chairs.
 */
export function StudioScene({ chairs, toggleChair }) {
  /**
   * Semi-circular arc positions for 5 chairs.
   * baseRotY is the initial Y rotation so each chair faces slightly inward.
   */
  const ARC_RADIUS  = 6.8;
  const ARC_Z_BASE  = 4.6;
  const chairDefs   = chairs.map((chair, i) => {
    // Distribute from -2 to +2 index
    const t        = (i - 2) / 2;                // [-1, -0.5, 0, 0.5, 1]
    const x        = t * ARC_RADIUS;
    const z        = ARC_Z_BASE + Math.abs(t) * 0.9;
    const baseRotY = -t * 0.28;                  // slight inward angle
    return { ...chair, pos: [x, 0, z], baseRotY };
  });

  return (
    <>
      {/* ── Global Studio Lighting ──────────────────────────────────────────── */}
      <ambientLight intensity={0.5} color="#1a1e38" />

      {/* Key light from upper-front */}
      <directionalLight
        position={[8, 18, 10]}
        intensity={1.6}
        color="#ffffff"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={1}
        shadow-camera-far={60}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />

      {/* Stage fill — red tint from below */}
      <pointLight position={[0, 1.5, -2.5]} intensity={6} color="#ef233c" distance={18} />

      {/* Side ambience — blue left */}
      <pointLight position={[-14, 7, -4]} intensity={3.5} color="#3a86ff" distance={28} />
      {/* Side ambience — red/pink right */}
      <pointLight position={[14, 7, -4]}  intensity={3.5} color="#ff006e" distance={28} />

      {/* Rim light from rear */}
      <pointLight position={[0, 5, -14]} intensity={5} color="#a020f0" distance={24} />

      {/* ── Geometry ────────────────────────────────────────────────────────── */}
      <ProceduralStage />
      <StudioTitle />

      {/* ── GLTF Model (silent fail if not present) ─────────────────────────── */}
      <Suspense fallback={null}>
        <GLTFErrorBoundary>
          <GLTFStudio />
        </GLTFErrorBoundary>
      </Suspense>

      {/* ── Five Judge Chairs ────────────────────────────────────────────────── */}
      {chairDefs.map((c) => (
        <Chair
          key={c.id}
          id={c.id}
          name={c.name}
          isTurned={c.isTurned}
          position={c.pos}
          baseRotY={c.baseRotY}
          toggleChair={toggleChair}
        />
      ))}

      <Preload all />
    </>
  );
}
