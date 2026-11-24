import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';
import * as THREE from 'three';

/**
 * Chair Component — Individual interactive 3D judge chair.
 * 
 * Milestone 2D.4: Dynamic Theming & Reactive Stage Experience.
 * Milestone 5B: Audio & Visual Event Synchronization (ADR-027).
 * Phase 5C.1: Architectural Arena Redesign — Premium PBR Materials & Clean Silhouette.
 * - Conectado ao branding dinâmico do evento (primaryColor e secondaryColor);
 * - Rotação física fluida de 180° com curva power2.inOut ao apoiar o pitch;
 * - Resposta audiovisual sincronizada com áudio cênico e hardware ESP32 (FW-01);
 * - Eliminação de textos flutuantes 3D sobre o encosto (sem poluição de dashboard);
 * - Materiais PBR arquiteturais de alta fidelidade: couro preto acetinado,
 *   casca em madeira nogueira escura, base em bronze escovado/titânio.
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
  id: _id,
  name: _name,
  isTurned,
  isVotingOpen = false,
  position,
  baseRotY = 0,
  branding = {},
}) {
  const primaryColor = branding?.primaryColor || '#ef233c';
  const secondaryColor = branding?.secondaryColor || '#d4a373'; // tom quente âmbar/bronze padrão

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

    // ── 2. Spotlight Individual: Iluminação Arquitetural Focal ─────────────────
    if (spotRef.current) {
      const targetSpotColor = new THREE.Color(isTurned ? primaryColor : '#ffe8cc');
      gsap.to(spotRef.current.color, {
        r: targetSpotColor.r,
        g: targetSpotColor.g,
        b: targetSpotColor.b,
        duration: 1.0,
        ease: 'power2.out',
      });

      if (isTurned) {
        // Flare cênico súbito de virada com desaceleração elegante
        gsap.timeline()
          .to(spotRef.current, { intensity: 65, duration: 0.22, ease: 'power3.out' })
          .to(spotRef.current, { intensity: 42, duration: 0.85, ease: 'power2.out' });
      } else {
        // Repouso arquitetural com temperatura quente (3000K)
        gsap.to(spotRef.current, {
          intensity: isVotingOpen ? 12 : 5,
          duration: 0.9,
          ease: 'power2.out',
        });
      }
    }

    // ── 3. Botão de Apoio: Glow Emissivo Arquitetural ──────────────────────────
    if (buttonMatRef.current) {
      const btnTarget = new THREE.Color(isTurned ? primaryColor : (isVotingOpen ? primaryColor : '#1f1614'));
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
        // Flash emissivo da virada da cadeira
        gsap.timeline()
          .to(buttonMatRef.current, { emissiveIntensity: 7.5, duration: 0.18, ease: 'power3.out' })
          .to(buttonMatRef.current, { emissiveIntensity: 4.2, duration: 0.75, ease: 'power2.out' });
      } else if (isVotingOpen) {
        // Pulso contínuo convidando o jurado a votar
        pulseTween = gsap.to(buttonMatRef.current, {
          emissiveIntensity: 2.2,
          duration: 0.85,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });
      } else {
        // Repouso sóbrio
        gsap.to(buttonMatRef.current, {
          emissiveIntensity: 0.15,
          duration: 0.6,
        });
      }
    }

    // ── 4. Halo do Console: Realce com Bronze/Secundária & Pulso de Escala ─────
    if (haloMatRef.current) {
      const haloTarget = new THREE.Color(isTurned ? secondaryColor : '#2c221a');
      gsap.to(haloMatRef.current.color, {
        r: haloTarget.r,
        g: haloTarget.g,
        b: haloTarget.b,
        duration: 0.8,
      });

      if (isTurned) {
        gsap.to(haloMatRef.current, { opacity: 0.95, duration: 0.5 });
        if (haloGroupRef.current) {
          gsap.timeline()
            .to(haloGroupRef.current.scale, { x: 1.3, y: 1.3, z: 1.3, duration: 0.2, ease: 'power2.out' })
            .to(haloGroupRef.current.scale, { x: 1.0, y: 1.0, z: 1.0, duration: 0.6, ease: 'power2.out' });
        }
      } else if (isVotingOpen) {
        haloPulseTween = gsap.to(haloMatRef.current, {
          opacity: 0.7,
          duration: 0.85,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });
      } else {
        gsap.to(haloMatRef.current, { opacity: 0.2, duration: 0.6 });
      }
    }

    // ── 5. Estofamento em Couro: Transição Harmonizada ao Branding ───────────
    const leatherOn = new THREE.Color(primaryColor);
    const leatherOff = new THREE.Color('#141416');
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
      const pedTarget = new THREE.Color(isTurned ? primaryColor : '#1a1410');
      gsap.to(pedestalHaloRef.current.color, {
        r: pedTarget.r,
        g: pedTarget.g,
        b: pedTarget.b,
        duration: 1.0,
      });
      gsap.to(pedestalHaloRef.current, {
        opacity: isTurned ? 0.9 : (isVotingOpen ? 0.4 : 0.12),
        duration: 0.9,
      });
    }

    return () => {
      if (pulseTween) pulseTween.kill();
      if (haloPulseTween) haloPulseTween.kill();
    };
  }, [isTurned, isVotingOpen, baseRotY, primaryColor, secondaryColor]);

  const leatherInitialColor = isTurned ? primaryColor : '#141416';
  const btnInitialColor = isTurned ? primaryColor : '#1f1614';

  return (
    <group position={position}>
      {/* ── Per-Chair Overhead Spotlight Arquitetural ────────────────────────── */}
      <spotLight
        ref={spotRef}
        position={[0, 7.5, 1]}
        angle={0.48}
        penumbra={0.65}
        intensity={isTurned ? 42 : (isVotingOpen ? 12 : 5)}
        distance={24}
        color={isTurned ? primaryColor : '#ffe8cc'}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0001}
      />

      {/* ── Grupo Giratório da Cadeira (GSAP anima a rotação) ──────────────── */}
      <group ref={groupRef} rotation={[0, baseRotY, 0]}>
        {/* BASE PEDESTAL — Bronze escovado e titânio acetinado */}
        <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.78, 1.0, 0.44, 32]} />
          <meshStandardMaterial color="#221e1b" metalness={0.88} roughness={0.24} />
        </mesh>

        {/* Anel de realce de apoio no topo do pedestal */}
        <mesh position={[0, 0.442, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.72, 0.82, 32]} />
          <meshBasicMaterial
            ref={pedestalHaloRef}
            color={isTurned ? primaryColor : '#1a1410'}
            transparent
            opacity={isTurned ? 0.9 : 0.12}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* PILAR CENTRAL EM METAL ANODIZADO */}
        <mesh position={[0, 0.74, 0]} castShadow>
          <cylinderGeometry args={[0.16, 0.16, 0.6, 24]} />
          <meshStandardMaterial color="#8c827a" metalness={0.92} roughness={0.12} />
        </mesh>

        {/* PLATAFORMA DO ASSENTO */}
        <mesh position={[0, 1.18, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.38, 0.22, 1.38]} />
          <meshStandardMaterial color="#181412" roughness={0.4} metalness={0.25} />
        </mesh>

        {/* ALMOFADA DO ASSENTO — Couro PBR premium */}
        <mesh position={[0, 1.38, 0.06]} castShadow receiveShadow>
          <boxGeometry args={[1.18, 0.24, 1.18]} />
          <meshStandardMaterial
            ref={seatMatRef}
            color={leatherInitialColor}
            roughness={0.3}
            metalness={0.08}
          />
        </mesh>

        {/* CASCA EXTERNA DO ENCOSTO — Nogueira arquitetural escura */}
        <mesh position={[0, 2.42, -0.52]} castShadow receiveShadow>
          <boxGeometry args={[1.38, 2.18, 0.3]} />
          <meshStandardMaterial color="#1e1814" roughness={0.45} metalness={0.15} />
        </mesh>

        {/* ALMOFADA DO ENCOSTO — Couro PBR premium */}
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
          <meshStandardMaterial color={leatherInitialColor} roughness={0.32} />
        </mesh>

        {/* BRAÇO ESQUERDO */}
        <mesh position={[-0.74, 1.68, 0]} castShadow>
          <boxGeometry args={[0.2, 0.16, 1.28]} />
          <meshStandardMaterial color="#1a1512" metalness={0.65} roughness={0.28} />
        </mesh>

        {/* BRAÇO DIREITO */}
        <mesh position={[0.74, 1.68, 0]} castShadow>
          <boxGeometry args={[0.2, 0.16, 1.28]} />
          <meshStandardMaterial color="#1a1512" metalness={0.65} roughness={0.28} />
        </mesh>

        {/* ── CONSOLE FRONTAL (Botão de Apoio da Banca) ─────────────────────── */}
        <group position={[0, 0, 0.9]}>
          {/* Corpo do console cilíndrico */}
          <mesh position={[0, 0.58, 0]} castShadow>
            <cylinderGeometry args={[0.44, 0.54, 1.16, 32]} />
            <meshStandardMaterial color="#1c1714" metalness={0.82} roughness={0.22} />
          </mesh>

          {/* Botão de Apoio Animado com GSAP */}
          <mesh position={[0, 1.18, 0]} castShadow>
            <cylinderGeometry args={[0.35, 0.35, 0.13, 32]} />
            <meshStandardMaterial
              ref={buttonMatRef}
              color={btnInitialColor}
              emissive={btnInitialColor}
              emissiveIntensity={isTurned ? 4.2 : 0.15}
              roughness={0.16}
              metalness={0.22}
            />
          </mesh>

          {/* Halo luminoso ao redor do botão com scale pulse */}
          <group ref={haloGroupRef} position={[0, 1.12, 0]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.35, 0.42, 32]} />
              <meshBasicMaterial
                ref={haloMatRef}
                color={isTurned ? secondaryColor : '#2c221a'}
                side={THREE.DoubleSide}
                transparent
                opacity={isTurned ? 0.95 : 0.2}
              />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
}

export default Chair;
