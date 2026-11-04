import React, { useRef, useEffect } from 'react';
import { Text } from '@react-three/drei';
import gsap from 'gsap';
import * as THREE from 'three';

/**
 * Chair Component — Individual interactive 3D judge chair.
 * 
 * Milestone 2D.4: Dynamic Theming & Reactive Stage Experience.
 * - Conectado ao branding dinâmico do evento (primaryColor e secondaryColor);
 * - Protagonismo visual no acionamento (spotlight reforçado, halo emissivo, console glow);
 * - Interpolação fluida com GSAP (1.0s - 1.2s) em trocas de branding em tempo real;
 * - Preservação da cinemática de rotação e inscrições institucionais da banca.
 *
 * Props:
 *  - id          : number  — unique chair identifier (1..5)
 *  - name        : string  — evaluator/judge name label
 *  - isTurned    : boolean — whether chair is rotated 180° toward the stage/pitch
 *  - position    : [x,y,z] — world position of this chair
 *  - baseRotY    : number  — initial Y rotation (for arc curvature)
 *  - branding    : object  — { primaryColor, secondaryColor }
 */
export function Chair({
  id,
  name,
  isTurned,
  position,
  baseRotY = 0,
  branding = {},
}) {
  const primaryColor = branding?.primaryColor || '#ef233c';
  const secondaryColor = branding?.secondaryColor || '#3a86ff';

  // Refs para objetos Three.js manipulados diretamente via GSAP
  const groupRef        = useRef(); // rotação da cadeira
  const spotRef         = useRef(); // spotlight individual da cadeira
  const buttonMatRef    = useRef(); // material emissivo do botão de apoio
  const seatMatRef      = useRef(); // estofamento do assento
  const backMatRef      = useRef(); // estofamento do encosto
  const haloRef         = useRef(); // anel de luz do console do botão
  const pedestalHaloRef = useRef(); // anel de realce cênico no pedestal

  useEffect(() => {
    if (!groupRef.current) return;

    // ── 1. Rotação GSAP da Cadeira (0 → π = 180° quando acionada) ─────────────
    gsap.to(groupRef.current.rotation, {
      y: isTurned ? Math.PI + baseRotY : baseRotY,
      duration: 1.5,
      ease: 'power2.inOut',
    });

    // ── 2. Spotlight Individual: Intensidade e Cor do Branding ───────────────
    if (spotRef.current) {
      // Quando apoiada, ganha protagonismo com 45 de intensidade; em repouso mantém 6
      gsap.to(spotRef.current, {
        intensity: isTurned ? 45 : 6,
        duration: 1.2,
        ease: 'power2.out',
      });

      const targetSpotColor = new THREE.Color(isTurned ? primaryColor : '#4a78ff');
      gsap.to(spotRef.current.color, {
        r: targetSpotColor.r,
        g: targetSpotColor.g,
        b: targetSpotColor.b,
        duration: 1.2,
        ease: 'power2.out',
      });
    }

    // ── 3. Botão de Apoio: Glow Emissivo com a Cor Primária ───────────────────
    if (buttonMatRef.current) {
      const btnTarget = new THREE.Color(isTurned ? primaryColor : '#251018');
      gsap.to(buttonMatRef.current.color, {
        r: btnTarget.r,
        g: btnTarget.g,
        b: btnTarget.b,
        duration: 0.9,
      });
      gsap.to(buttonMatRef.current.emissive, {
        r: btnTarget.r,
        g: btnTarget.g,
        b: btnTarget.b,
        duration: 0.9,
      });
      gsap.to(buttonMatRef.current, {
        emissiveIntensity: isTurned ? 4.5 : 0.2,
        duration: 0.9,
      });
    }

    // ── 4. Estofamento em Couro: Transição Harmonizada ao Branding ───────────
    const leatherOn = new THREE.Color(primaryColor);
    const leatherOff = new THREE.Color('#1c2030');
    [seatMatRef, backMatRef].forEach((ref) => {
      if (!ref.current) return;
      gsap.to(ref.current.color, {
        r: isTurned ? leatherOn.r : leatherOff.r,
        g: isTurned ? leatherOn.g : leatherOff.g,
        b: isTurned ? leatherOn.b : leatherOff.b,
        duration: 1.1,
        ease: 'power2.out',
      });
    });

    // ── 5. Halo do Console: Realce com a Cor Secundária ───────────────────────
    if (haloRef.current) {
      const haloTarget = new THREE.Color(isTurned ? secondaryColor : '#1e2436');
      gsap.to(haloRef.current.color, {
        r: haloTarget.r,
        g: haloTarget.g,
        b: haloTarget.b,
        duration: 0.8,
      });
      gsap.to(haloRef.current, {
        opacity: isTurned ? 1.0 : 0.25,
        duration: 0.8,
      });
    }

    // ── 6. Anel de Destaque no Pedestal ───────────────────────────────────────
    if (pedestalHaloRef.current) {
      const pedTarget = new THREE.Color(isTurned ? primaryColor : '#101422');
      gsap.to(pedestalHaloRef.current.color, {
        r: pedTarget.r,
        g: pedTarget.g,
        b: pedTarget.b,
        duration: 1.0,
      });
      gsap.to(pedestalHaloRef.current, {
        opacity: isTurned ? 0.9 : 0.15,
        duration: 1.0,
      });
    }
  }, [isTurned, baseRotY, primaryColor, secondaryColor]);

  const leatherInitialColor = isTurned ? primaryColor : '#1c2030';
  const btnInitialColor = isTurned ? primaryColor : '#251018';

  return (
    <group position={position}>
      {/* ── Per-Chair Overhead Spotlight Cênico ─────────────────────────────── */}
      <spotLight
        ref={spotRef}
        position={[0, 7.5, 1]}
        angle={0.48}
        penumbra={0.65}
        intensity={isTurned ? 45 : 6}
        distance={24}
        color={isTurned ? primaryColor : '#4a78ff'}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0001}
      />

      {/* ── Grupo Giratório da Cadeira (GSAP anima a rotação) ──────────────── */}
      <group ref={groupRef} rotation={[0, baseRotY, 0]}>
        {/* BASE PEDESTAL */}
        <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.78, 1.0, 0.44, 32]} />
          <meshStandardMaterial color="#101018" metalness={0.9} roughness={0.18} />
        </mesh>

        {/* Anel de realce de apoio no topo do pedestal */}
        <mesh position={[0, 0.442, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.72, 0.82, 32]} />
          <meshBasicMaterial
            ref={pedestalHaloRef}
            color={isTurned ? primaryColor : '#101422'}
            transparent
            opacity={isTurned ? 0.9 : 0.15}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* PILAR CENTRAL CROMADO */}
        <mesh position={[0, 0.74, 0]} castShadow>
          <cylinderGeometry args={[0.16, 0.16, 0.6, 24]} />
          <meshStandardMaterial color="#b0b0c8" metalness={0.98} roughness={0.05} />
        </mesh>

        {/* PLATAFORMA DO ASSENTO */}
        <mesh position={[0, 1.18, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.38, 0.22, 1.38]} />
          <meshStandardMaterial color="#0c0c18" roughness={0.5} metalness={0.3} />
        </mesh>

        {/* ALMOFADA DO ASSENTO — Cor interpolada via GSAP */}
        <mesh position={[0, 1.38, 0.06]} castShadow receiveShadow>
          <boxGeometry args={[1.18, 0.24, 1.18]} />
          <meshStandardMaterial
            ref={seatMatRef}
            color={leatherInitialColor}
            roughness={0.28}
            metalness={0.08}
          />
        </mesh>

        {/* CASCA EXTERNA DO ENCOSTO */}
        <mesh position={[0, 2.42, -0.52]} castShadow receiveShadow>
          <boxGeometry args={[1.38, 2.18, 0.3]} />
          <meshStandardMaterial color="#0a0a14" roughness={0.6} />
        </mesh>

        {/* ALMOFADA DO ENCOSTO — Cor interpolada via GSAP */}
        <mesh position={[0, 2.42, -0.4]} castShadow receiveShadow>
          <boxGeometry args={[1.18, 1.95, 0.14]} />
          <meshStandardMaterial
            ref={backMatRef}
            color={leatherInitialColor}
            roughness={0.3}
          />
        </mesh>

        {/* APOIO DE CABEÇA */}
        <mesh position={[0, 3.58, -0.42]} castShadow>
          <boxGeometry args={[0.92, 0.48, 0.2]} />
          <meshStandardMaterial color={leatherInitialColor} roughness={0.3} />
        </mesh>

        {/* BRAÇO ESQUERDO */}
        <mesh position={[-0.74, 1.68, 0]} castShadow>
          <boxGeometry args={[0.2, 0.16, 1.28]} />
          <meshStandardMaterial color="#181820" metalness={0.75} roughness={0.25} />
        </mesh>

        {/* BRAÇO DIREITO */}
        <mesh position={[0.74, 1.68, 0]} castShadow>
          <boxGeometry args={[0.2, 0.16, 1.28]} />
          <meshStandardMaterial color="#181820" metalness={0.75} roughness={0.25} />
        </mesh>

        {/* ── CONSOLE FRONTAL (Botão de Apoio da Banca) ─────────────────────── */}
        <group position={[0, 0, 0.9]}>
          {/* Corpo do console */}
          <mesh position={[0, 0.58, 0]} castShadow>
            <cylinderGeometry args={[0.44, 0.54, 1.16, 32]} />
            <meshStandardMaterial color="#10101c" metalness={0.85} roughness={0.18} />
          </mesh>

          {/* Botão de Apoio Animado com GSAP */}
          <mesh position={[0, 1.18, 0]} castShadow>
            <cylinderGeometry args={[0.35, 0.35, 0.13, 32]} />
            <meshStandardMaterial
              ref={buttonMatRef}
              color={btnInitialColor}
              emissive={btnInitialColor}
              emissiveIntensity={isTurned ? 4.5 : 0.2}
              roughness={0.18}
              metalness={0.1}
            />
          </mesh>

          {/* Halo luminoso ao redor do botão */}
          <mesh position={[0, 1.12, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.35, 0.42, 32]} />
            <meshBasicMaterial
              ref={haloRef}
              color={isTurned ? secondaryColor : '#1e2436'}
              side={THREE.DoubleSide}
              transparent
              opacity={isTurned ? 1.0 : 0.25}
            />
          </mesh>
        </group>

        {/* ── Labels 3D Flutuantes (Avaliador e Status) ────────────────────── */}
        <group position={[0, 4.2, -0.35]}>
          <Text
            fontSize={0.32}
            color={isTurned ? '#ffffff' : '#e0e0e0'}
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
            color={isTurned ? primaryColor : '#4a4a6a'}
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.025}
            outlineColor="#000000"
          >
            {isTurned ? '★  APOIADO  ★' : '— EM AVALIAÇÃO —'}
          </Text>
        </group>
      </group>
    </group>
  );
}

export default Chair;
