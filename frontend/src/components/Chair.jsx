import React, { useRef, useEffect } from 'react';
import { Text } from '@react-three/drei';
import gsap from 'gsap';
import * as THREE from 'three';

/**
 * Chair Component — Individual interactive 3D judge chair.
 *
 * Props:
 *  - id          : number  — unique chair identifier
 *  - name        : string  — coach/technician name label
 *  - isTurned    : boolean — whether chair is rotated 180° toward the singer
 *  - position    : [x,y,z] — world position of this chair
 *  - baseRotY    : number  — initial Y rotation (for arc curvature)
 *  - toggleChair : fn(id)  — parent callback to flip isTurned
 */
export function Chair({ id, name, isTurned, position, baseRotY = 0, toggleChair }) {
  // Refs to Three.js objects for direct GSAP animation (bypassing React render cycle)
  const groupRef       = useRef(); // rotates during GSAP tween
  const spotRef        = useRef(); // spotlight intensity/color
  const buttonMatRef   = useRef(); // red button emissive material
  const seatMatRef     = useRef(); // seat cushion color
  const backMatRef     = useRef(); // backrest color
  const haloRef        = useRef(); // halo ring meshBasicMaterial

  useEffect(() => {
    if (!groupRef.current) return;

    // ── GSAP chair rotation (0 → π = 180° when turned) ───────────────────────
    gsap.to(groupRef.current.rotation, {
      y: isTurned ? Math.PI + baseRotY : baseRotY,
      duration: 1.5,
      ease: 'power2.inOut',
    });

    // ── Spotlight intensity & color transition ─────────────────────────────────
    if (spotRef.current) {
      gsap.to(spotRef.current, {
        intensity: isTurned ? 35 : 5,
        duration: 1.2,
        ease: 'power2.out',
      });
      // Smoothly lerp spotlight color
      const targetColor = new THREE.Color(isTurned ? '#ff1a40' : '#4a78ff');
      gsap.to(spotRef.current.color, {
        r: targetColor.r,
        g: targetColor.g,
        b: targetColor.b,
        duration: 1.2,
      });
    }

    // ── Button emissive glow ──────────────────────────────────────────────────
    if (buttonMatRef.current) {
      const btnTarget = new THREE.Color(isTurned ? '#ff0033' : '#330000');
      gsap.to(buttonMatRef.current.color,     { r: btnTarget.r, g: btnTarget.g, b: btnTarget.b, duration: 0.8 });
      gsap.to(buttonMatRef.current.emissive,  { r: btnTarget.r, g: btnTarget.g, b: btnTarget.b, duration: 0.8 });
      gsap.to(buttonMatRef.current, { emissiveIntensity: isTurned ? 4.0 : 0.2, duration: 0.8 });
    }

    // ── Seat/backrest color shift ─────────────────────────────────────────────
    const leatherOn  = new THREE.Color('#d90429');
    const leatherOff = new THREE.Color('#6b0714');
    [seatMatRef, backMatRef].forEach((ref) => {
      if (!ref.current) return;
      gsap.to(ref.current.color, {
        r: isTurned ? leatherOn.r : leatherOff.r,
        g: isTurned ? leatherOn.g : leatherOff.g,
        b: isTurned ? leatherOn.b : leatherOff.b,
        duration: 1.0,
      });
    });

    // ── Halo ring visibility ──────────────────────────────────────────────────
    if (haloRef.current) {
      const haloTarget = new THREE.Color(isTurned ? '#ff4d6d' : '#220000');
      gsap.to(haloRef.current.color, {
        r: haloTarget.r, g: haloTarget.g, b: haloTarget.b, duration: 0.6,
      });
    }
  }, [isTurned, baseRotY]);

  // ─── Pointer cursor handlers ───────────────────────────────────────────────
  const handlePointerOver = (e) => { if (!toggleChair) return; e.stopPropagation(); document.body.style.cursor = 'pointer'; };
  const handlePointerOut  = ()    => { if (!toggleChair) return; document.body.style.cursor = 'default'; };
  const handleClick       = (e)   => { if (!toggleChair) return; e.stopPropagation(); toggleChair(id); };

  // Colors (initial / reactive via GSAP after mount)
  const leatherColor = isTurned ? '#d90429' : '#6b0714';
  const btnColor     = isTurned ? '#ff0033' : '#330000';

  return (
    <group position={position}>
      {/* ── Per-Chair Overhead Spotlight ───────────────────────────────────── */}
      <spotLight
        ref={spotRef}
        position={[0, 7, 1]}
        angle={0.45}
        penumbra={0.6}
        intensity={5}
        distance={22}
        color="#4a78ff"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0001}
      />

      {/* ── Clickable chair group (GSAP rotates this) ──────────────────────── */}
      <group
        ref={groupRef}
        rotation={[0, baseRotY, 0]}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        {/* BASE PEDESTAL */}
        <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.78, 1.0, 0.44, 32]} />
          <meshStandardMaterial color="#101018" metalness={0.9} roughness={0.18} />
        </mesh>

        {/* CHROME CENTER PILLAR */}
        <mesh position={[0, 0.74, 0]} castShadow>
          <cylinderGeometry args={[0.16, 0.16, 0.6, 24]} />
          <meshStandardMaterial color="#b0b0c8" metalness={0.98} roughness={0.05} />
        </mesh>

        {/* SEAT PLATFORM */}
        <mesh position={[0, 1.18, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.38, 0.22, 1.38]} />
          <meshStandardMaterial color="#0c0c18" roughness={0.5} metalness={0.3} />
        </mesh>

        {/* SEAT CUSHION — color controlled by GSAP */}
        <mesh position={[0, 1.38, 0.06]} castShadow receiveShadow>
          <boxGeometry args={[1.18, 0.24, 1.18]} />
          <meshStandardMaterial
            ref={seatMatRef}
            color={leatherColor}
            roughness={0.28}
            metalness={0.08}
          />
        </mesh>

        {/* HIGH BACKREST OUTER SHELL */}
        <mesh position={[0, 2.42, -0.52]} castShadow receiveShadow>
          <boxGeometry args={[1.38, 2.18, 0.3]} />
          <meshStandardMaterial color="#0a0a14" roughness={0.6} />
        </mesh>

        {/* INNER BACKREST CUSHION — color controlled by GSAP */}
        <mesh position={[0, 2.42, -0.4]} castShadow receiveShadow>
          <boxGeometry args={[1.18, 1.95, 0.14]} />
          <meshStandardMaterial
            ref={backMatRef}
            color={leatherColor}
            roughness={0.3}
          />
        </mesh>

        {/* HEADREST PAD */}
        <mesh position={[0, 3.58, -0.42]} castShadow>
          <boxGeometry args={[0.92, 0.48, 0.2]} />
          <meshStandardMaterial color={leatherColor} roughness={0.3} />
        </mesh>

        {/* LEFT ARMREST */}
        <mesh position={[-0.74, 1.68, 0]} castShadow>
          <boxGeometry args={[0.2, 0.16, 1.28]} />
          <meshStandardMaterial color="#181820" metalness={0.75} roughness={0.25} />
        </mesh>

        {/* RIGHT ARMREST */}
        <mesh position={[0.74, 1.68, 0]} castShadow>
          <boxGeometry args={[0.2, 0.16, 1.28]} />
          <meshStandardMaterial color="#181820" metalness={0.75} roughness={0.25} />
        </mesh>

        {/* ── FRONT CONSOLE (EU QUERO VOCÊ button) ─────────────────────────── */}
        <group position={[0, 0, 0.9]}>
          {/* Console body */}
          <mesh position={[0, 0.58, 0]} castShadow>
            <cylinderGeometry args={[0.44, 0.54, 1.16, 32]} />
            <meshStandardMaterial color="#10101c" metalness={0.85} roughness={0.18} />
          </mesh>

          {/* Big Red GSAP-animated Button */}
          <mesh position={[0, 1.18, 0]} castShadow>
            <cylinderGeometry args={[0.35, 0.35, 0.13, 32]} />
            <meshStandardMaterial
              ref={buttonMatRef}
              color={btnColor}
              emissive={btnColor}
              emissiveIntensity={isTurned ? 4.0 : 0.2}
              roughness={0.18}
              metalness={0.1}
            />
          </mesh>

          {/* Halo ring around button */}
          <mesh position={[0, 1.12, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.35, 0.42, 32]} />
            <meshBasicMaterial
              ref={haloRef}
              color={isTurned ? '#ff4d6d' : '#220000'}
              side={THREE.DoubleSide}
              transparent
              opacity={0.9}
            />
          </mesh>
        </group>

        {/* ── Floating 3D Name & Status Labels ────────────────────────────── */}
        <group position={[0, 4.2, -0.35]}>
          <Text
            fontSize={0.32}
            color={isTurned ? '#ff6b8a' : '#e0e0e0'}
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.04}
            outlineColor="#000000"
          >
            {name}
          </Text>

          <Text
            position={[0, -0.42, 0]}
            fontSize={0.19}
            color={isTurned ? '#ffd166' : '#4a4a6a'}
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.025}
            outlineColor="#000000"
          >
            {isTurned ? '★  EU QUERO VOCÊ  ★' : '— de costas —'}
          </Text>
        </group>
      </group>
    </group>
  );
}
