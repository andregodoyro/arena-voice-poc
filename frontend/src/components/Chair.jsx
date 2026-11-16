import React, { useRef, useEffect } from 'react';
import { Text } from '@react-three/drei';
import gsap from 'gsap';
import * as THREE from 'three';

/**
 * Chair Component — Individual interactive 3D judge chair.
 * 
 * Milestone 2D.4: Dynamic Theming & Reactive Stage Experience.
 * Milestone 5B: Audio & Visual Event Synchronization (ADR-027).
 * - Conectado ao branding dinâmico do evento (primaryColor e secondaryColor);
 * - Glow reativo ao status de votação (isVotingOpen): botão em pulso contínuo convidando o voto;
 * - Resposta audiovisual sincronizada (ChairTurned):
 *   * Flare luminoso cênico no botão (emissiveIntensity de pico 9.0 -> 4.8);
 *   * Spotlight individual de sobrecarga (intensidade de pico 75 -> 48);
 *   * Halo ring com flare de escala e opacidade;
 *   * Rotação fluida de 180° com curva power2.inOut;
 * - Materiais PBR calibrados (metalness 0.92, roughness suave, alto contraste).
 *
 * Props:
 *  - id          : number  — unique chair identifier (1..5)
 *  - name        : string  — evaluator/judge name label
 *  - isTurned    : boolean — whether chair is rotated 180° toward the stage/pitch
 *  - isVotingOpen: boolean — whether voting stage is currently open for judging
 *  - position    : [x,y,z] — world position of this chair
 *  - baseRotY    : number  — initial Y rotation (for arc curvature)
 *  - branding    : object  — { primaryColor, secondaryColor }
 */
export function Chair({
  id,
  name,
  isTurned,
  isVotingOpen = false,
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
  const haloGroupRef    = useRef(); // grupo do anel de luz do console para scale pulse
  const haloMatRef      = useRef(); // material do halo do botão
  const pedestalHaloRef = useRef(); // anel de realce cênico no pedestal

  useEffect(() => {
    if (!groupRef.current) return;

    let pulseTween = null;
    let haloPulseTween = null;

    // ── 1. Rotação GSAP da Cadeira (0 → π = 180° quando acionada) ─────────────
    gsap.to(groupRef.current.rotation, {
      y: isTurned ? Math.PI + baseRotY : baseRotY,
      duration: 1.5,
      ease: 'power2.inOut',
    });

    // ── 2. Spotlight Individual: Flare Dinâmico no Acionamento ─────────────────
    if (spotRef.current) {
      const targetSpotColor = new THREE.Color(isTurned ? primaryColor : '#4a78ff');
      gsap.to(spotRef.current.color, {
        r: targetSpotColor.r,
        g: targetSpotColor.g,
        b: targetSpotColor.b,
        duration: 1.0,
        ease: 'power2.out',
      });

      if (isTurned) {
        // Flare cênico súbito (75) com desaceleração suave para 48 (Milestone 5B)
        gsap.timeline()
          .to(spotRef.current, { intensity: 75, duration: 0.22, ease: 'power3.out' })
          .to(spotRef.current, { intensity: 48, duration: 0.85, ease: 'power2.out' });
      } else {
        // Em repouso: se votação aberta ganha iluminação de atenção (14), se fechada repousa em 6
        gsap.to(spotRef.current, {
          intensity: isVotingOpen ? 14 : 6,
          duration: 0.9,
          ease: 'power2.out',
        });
      }
    }

    // ── 3. Botão de Apoio: Glow Emissivo Reativo e Flare de Acionamento ───────
    if (buttonMatRef.current) {
      const btnTarget = new THREE.Color(isTurned ? primaryColor : (isVotingOpen ? primaryColor : '#251018'));
      gsap.to(buttonMatRef.current.color, {
        r: btnTarget.r,
        g: btnTarget.g,
        b: btnTarget.b,
        duration: 0.7,
      });
      gsap.to(buttonMatRef.current.emissive, {
        r: btnTarget.r,
        g: btnTarget.g,
        b: btnTarget.b,
        duration: 0.7,
      });

      if (isTurned) {
        // Flash emissivo espetacular de virada (de pico 9.0 para 4.8)
        gsap.timeline()
          .to(buttonMatRef.current, { emissiveIntensity: 9.0, duration: 0.18, ease: 'power3.out' })
          .to(buttonMatRef.current, { emissiveIntensity: 4.8, duration: 0.75, ease: 'power2.out' });
      } else if (isVotingOpen) {
        // Pulso contínuo convidando o jurado a virar a cadeira durante a votação
        pulseTween = gsap.to(buttonMatRef.current, {
          emissiveIntensity: 2.4,
          duration: 0.85,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });
      } else {
        // Repouso apagado
        gsap.to(buttonMatRef.current, {
          emissiveIntensity: 0.2,
          duration: 0.6,
        });
      }
    }

    // ── 4. Halo do Console: Realce com a Cor Secundária & Pulso de Escala ─────
    if (haloMatRef.current) {
      const haloTarget = new THREE.Color(isTurned ? secondaryColor : '#1e2436');
      gsap.to(haloMatRef.current.color, {
        r: haloTarget.r,
        g: haloTarget.g,
        b: haloTarget.b,
        duration: 0.8,
      });

      if (isTurned) {
        gsap.to(haloMatRef.current, { opacity: 1.0, duration: 0.5 });
        if (haloGroupRef.current) {
          gsap.timeline()
            .to(haloGroupRef.current.scale, { x: 1.35, y: 1.35, z: 1.35, duration: 0.2, ease: 'power2.out' })
            .to(haloGroupRef.current.scale, { x: 1.0, y: 1.0, z: 1.0, duration: 0.6, ease: 'power2.out' });
        }
      } else if (isVotingOpen) {
        haloPulseTween = gsap.to(haloMatRef.current, {
          opacity: 0.75,
          duration: 0.85,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });
      } else {
        gsap.to(haloMatRef.current, { opacity: 0.25, duration: 0.6 });
      }
    }

    // ── 5. Estofamento em Couro: Transição Harmonizada ao Branding ───────────
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
        opacity: isTurned ? 0.95 : (isVotingOpen ? 0.45 : 0.15),
        duration: 0.9,
      });
    }

    return () => {
      if (pulseTween) pulseTween.kill();
      if (haloPulseTween) haloPulseTween.kill();
    };
  }, [isTurned, isVotingOpen, baseRotY, primaryColor, secondaryColor]);

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
        intensity={isTurned ? 48 : (isVotingOpen ? 14 : 6)}
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
          <meshStandardMaterial color="#0e1018" metalness={0.92} roughness={0.16} />
        </mesh>

        {/* Anel de realce de apoio no topo do pedestal */}
        <mesh position={[0, 0.442, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.72, 0.82, 32]} />
          <meshBasicMaterial
            ref={pedestalHaloRef}
            color={isTurned ? primaryColor : '#101422'}
            transparent
            opacity={isTurned ? 0.95 : 0.15}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* PILAR CENTRAL CROMADO */}
        <mesh position={[0, 0.74, 0]} castShadow>
          <cylinderGeometry args={[0.16, 0.16, 0.6, 24]} />
          <meshStandardMaterial color="#b4b4d0" metalness={0.98} roughness={0.04} />
        </mesh>

        {/* PLATAFORMA DO ASSENTO */}
        <mesh position={[0, 1.18, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.38, 0.22, 1.38]} />
          <meshStandardMaterial color="#0c0c18" roughness={0.45} metalness={0.35} />
        </mesh>

        {/* ALMOFADA DO ASSENTO — Cor interpolada via GSAP */}
        <mesh position={[0, 1.38, 0.06]} castShadow receiveShadow>
          <boxGeometry args={[1.18, 0.24, 1.18]} />
          <meshStandardMaterial
            ref={seatMatRef}
            color={leatherInitialColor}
            roughness={0.26}
            metalness={0.08}
          />
        </mesh>

        {/* CASCA EXTERNA DO ENCOSTO */}
        <mesh position={[0, 2.42, -0.52]} castShadow receiveShadow>
          <boxGeometry args={[1.38, 2.18, 0.3]} />
          <meshStandardMaterial color="#080812" roughness={0.55} metalness={0.2} />
        </mesh>

        {/* ALMOFADA DO ENCOSTO — Cor interpolada via GSAP */}
        <mesh position={[0, 2.42, -0.4]} castShadow receiveShadow>
          <boxGeometry args={[1.18, 1.95, 0.14]} />
          <meshStandardMaterial
            ref={backMatRef}
            color={leatherInitialColor}
            roughness={0.26}
          />
        </mesh>

        {/* APOIO DE CABEÇA */}
        <mesh position={[0, 3.58, -0.42]} castShadow>
          <boxGeometry args={[0.92, 0.48, 0.2]} />
          <meshStandardMaterial color={leatherInitialColor} roughness={0.28} />
        </mesh>

        {/* BRAÇO ESQUERDO */}
        <mesh position={[-0.74, 1.68, 0]} castShadow>
          <boxGeometry args={[0.2, 0.16, 1.28]} />
          <meshStandardMaterial color="#161622" metalness={0.8} roughness={0.2} />
        </mesh>

        {/* BRAÇO DIREITO */}
        <mesh position={[0.74, 1.68, 0]} castShadow>
          <boxGeometry args={[0.2, 0.16, 1.28]} />
          <meshStandardMaterial color="#161622" metalness={0.8} roughness={0.2} />
        </mesh>

        {/* ── CONSOLE FRONTAL (Botão de Apoio da Banca) ─────────────────────── */}
        <group position={[0, 0, 0.9]}>
          {/* Corpo do console */}
          <mesh position={[0, 0.58, 0]} castShadow>
            <cylinderGeometry args={[0.44, 0.54, 1.16, 32]} />
            <meshStandardMaterial color="#0e0e1a" metalness={0.88} roughness={0.16} />
          </mesh>

          {/* Botão de Apoio Animado com GSAP */}
          <mesh position={[0, 1.18, 0]} castShadow>
            <cylinderGeometry args={[0.35, 0.35, 0.13, 32]} />
            <meshStandardMaterial
              ref={buttonMatRef}
              color={btnInitialColor}
              emissive={btnInitialColor}
              emissiveIntensity={isTurned ? 4.8 : 0.2}
              roughness={0.14}
              metalness={0.18}
            />
          </mesh>

          {/* Halo luminoso ao redor do botão com scale pulse */}
          <group ref={haloGroupRef} position={[0, 1.12, 0]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.35, 0.42, 32]} />
              <meshBasicMaterial
                ref={haloMatRef}
                color={isTurned ? secondaryColor : '#1e2436'}
                side={THREE.DoubleSide}
                transparent
                opacity={isTurned ? 1.0 : 0.25}
              />
            </mesh>
          </group>
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
            color={isTurned ? primaryColor : (isVotingOpen ? '#ffb703' : '#4a4a6a')}
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.025}
            outlineColor="#000000"
          >
            {isTurned ? '★  APOIADO  ★' : (isVotingOpen ? '●  VOTAÇÃO ABERTA  ●' : '— EM AVALIAÇÃO —')}
          </Text>
        </group>
      </group>
    </group>
  );
}

export default Chair;
