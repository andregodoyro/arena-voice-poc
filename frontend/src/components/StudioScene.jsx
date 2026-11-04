import React, { useRef, useEffect } from 'react';
import { Chair } from './Chair';
import gsap from 'gsap';
import * as THREE from 'three';

/**
 * ArenaFloor — Piso geral da arena/auditório corporativo.
 * Preserva o piso amplo e escuro no nível Y = 0 estabelecido no Milestone 2D.3.
 */
function ArenaFloor() {
  return (
    <group position={[0, 0, 0]}>
      {/* Base geral da arena */}
      <mesh position={[0, -0.1, 0]} receiveShadow>
        <cylinderGeometry args={[26, 26.5, 0.2, 64]} />
        <meshStandardMaterial
          color="#161928"
          roughness={0.45}
          metalness={0.5}
        />
      </mesh>

      {/* Linhas de piso técnico / circulação do auditório */}
      {[-6, -3, 0, 3, 6, 9].map((z, i) => (
        <mesh key={`floor-line-${i}`} position={[0, 0.005, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[28, 0.02]} />
          <meshBasicMaterial color="#334155" transparent opacity={0.55} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * CentralPitchStage — Palco delimitado da startup e Pódio de pitch.
 * 
 * Milestone 2D.4:
 * - Fita de luz do palco da startup reativa a primaryColor;
 * - Anel de demarcação do pódio reativo a secondaryColor;
 * - Retícula central institucional reativa a primaryColor;
 * - Aura e pulso cênico institucional de Unanimidade (5 de 5 cadeiras);
 * - Interpolação suave de cores e intensidades via GSAP (0.8s - 1.2s).
 */
function CentralPitchStage({
  primaryColor = '#ef233c',
  secondaryColor = '#3a86ff',
  isUnanimous = false,
}) {
  const stageRingMatRef = useRef();
  const podiumRingMatRef = useRef();
  const reticleMatRef = useRef();
  const spotLightRef = useRef();
  const unanimityAuraRef = useRef();
  const unanimityMatRef = useRef();

  // Transição reativa de cores de branding via GSAP
  useEffect(() => {
    const targetPrimary = new THREE.Color(primaryColor);
    const targetSecondary = new THREE.Color(secondaryColor);

    if (stageRingMatRef.current) {
      gsap.to(stageRingMatRef.current.color, {
        r: targetPrimary.r,
        g: targetPrimary.g,
        b: targetPrimary.b,
        duration: 1.2,
        ease: 'power2.out',
      });
    }

    if (podiumRingMatRef.current) {
      gsap.to(podiumRingMatRef.current.color, {
        r: targetSecondary.r,
        g: targetSecondary.g,
        b: targetSecondary.b,
        duration: 1.2,
        ease: 'power2.out',
      });
    }

    if (reticleMatRef.current) {
      gsap.to(reticleMatRef.current.color, {
        r: targetPrimary.r,
        g: targetPrimary.g,
        b: targetPrimary.b,
        duration: 1.2,
        ease: 'power2.out',
      });
    }

    if (unanimityMatRef.current) {
      gsap.to(unanimityMatRef.current.color, {
        r: targetPrimary.r,
        g: targetPrimary.g,
        b: targetPrimary.b,
        duration: 1.2,
        ease: 'power2.out',
      });
    }
  }, [primaryColor, secondaryColor]);

  // Efeito Cênico Institucional de Unanimidade (5 de 5 cadeiras)
  useEffect(() => {
    let pulseTween = null;

    if (spotLightRef.current) {
      gsap.to(spotLightRef.current, {
        intensity: isUnanimous ? 9.0 : 6.5,
        duration: 1.2,
        ease: 'power2.out',
      });
    }

    if (unanimityMatRef.current && unanimityAuraRef.current) {
      if (isUnanimous) {
        // Pulso luminoso prestigioso no palco da startup
        gsap.to(unanimityMatRef.current, {
          opacity: 0.5,
          duration: 0.8,
          ease: 'power2.out',
          onComplete: () => {
            pulseTween = gsap.to(unanimityMatRef.current, {
              opacity: 0.75,
              repeat: -1,
              yoyo: true,
              duration: 1.4,
              ease: 'sine.inOut',
            });
          },
        });

        gsap.to(unanimityAuraRef.current.scale, {
          x: 1.04,
          y: 1.04,
          z: 1.04,
          repeat: -1,
          yoyo: true,
          duration: 1.4,
          ease: 'sine.inOut',
        });
      } else {
        // Retorno suave ao estado operacional padrão
        gsap.to(unanimityMatRef.current, {
          opacity: 0,
          duration: 0.8,
          ease: 'power2.out',
        });
        gsap.to(unanimityAuraRef.current.scale, {
          x: 1,
          y: 1,
          z: 1,
          duration: 0.8,
          ease: 'power2.out',
        });
      }
    }

    return () => {
      if (pulseTween) pulseTween.kill();
    };
  }, [isUnanimous]);

  return (
    <group position={[0, 0, -3.2]}>
      {/* ── 1. Palco da Startup (Plataforma Circular Intermediária) ────── */}
      <group position={[0, 0, 0]}>
        {/* Base elevada do palco da startup */}
        <mesh position={[0, 0.09, 0]} receiveShadow>
          <cylinderGeometry args={[6.0, 6.2, 0.18, 64]} />
          <meshStandardMaterial
            color="#1c2136"
            roughness={0.2}
            metalness={0.8}
            envMapIntensity={1.3}
          />
        </mesh>

        {/* Chanfro perimetral do palco */}
        <mesh position={[0, 0.181, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[5.85, 6.0, 64]} />
          <meshStandardMaterial color="#334155" roughness={0.3} metalness={0.7} />
        </mesh>

        {/* Fita de luz de piso do palco da startup (Reativa ao Branding) */}
        <mesh position={[0, 0.182, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[5.65, 5.75, 64]} />
          <meshBasicMaterial
            ref={stageRingMatRef}
            color={primaryColor}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Aura Cênica de Unanimidade (Pulse de Prestígio) */}
        <mesh
          ref={unanimityAuraRef}
          position={[0, 0.183, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[2.9, 5.6, 64]} />
          <meshBasicMaterial
            ref={unanimityMatRef}
            color={primaryColor}
            side={THREE.DoubleSide}
            transparent
            opacity={0}
          />
        </mesh>
      </group>

      {/* ── 2. Pódio do Pitch (Área Principal do Apresentador / Startup) ─── */}
      <group position={[0, 0.18, 0]}>
        {/* Base do pódio elevado */}
        <mesh position={[0, 0.08, 0]} receiveShadow castShadow>
          <cylinderGeometry args={[2.75, 2.85, 0.16, 64]} />
          <meshStandardMaterial
            color="#252b45"
            roughness={0.25}
            metalness={0.85}
            envMapIntensity={1.4}
          />
        </mesh>

        {/* Piso técnico de oratória (disco superior de pitch) */}
        <mesh position={[0, 0.162, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[2.7, 64]} />
          <meshStandardMaterial
            color="#2d3452"
            roughness={0.4}
            metalness={0.5}
          />
        </mesh>

        {/* Anel de demarcação de keynote do orador (Reativo à Cor Secundária) */}
        <mesh position={[0, 0.165, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2.45, 2.55, 64]} />
          <meshBasicMaterial
            ref={podiumRingMatRef}
            color={secondaryColor}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Retícula central de alinhamento institucional (Reativa à Cor Primária) */}
        <mesh position={[0, 0.165, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.7, 0.75, 32]} />
          <meshBasicMaterial
            ref={reticleMatRef}
            color={primaryColor}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      {/* Refletor spot cênico focalizado no pódio com suporte a Unanimidade */}
      <spotLight
        ref={spotLightRef}
        position={[0, 11, 2]}
        target-position={[0, 0.34, -3.2]}
        intensity={6.5}
        angle={Math.PI / 5.8}
        penumbra={0.65}
        color="#f8fafc"
        distance={25}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
    </group>
  );
}

/**
 * AmphitheaterTiers — Arquibancada semicircular procedural de auditório corporativo.
 * 
 * Milestone 2D.4:
 * Balizamento luminoso arquitetural dos degraus reativo à cor secundária do branding.
 */
function AmphitheaterTiers({ secondaryColor = '#3a86ff' }) {
  const stepMatRefs = useRef([]);

  const tiers = [
    { inner: 11.5, outer: 13.5, y: 0.45, stepH: 0.45 },
    { inner: 13.8, outer: 15.8, y: 1.05, stepH: 0.60 },
    { inner: 16.1, outer: 18.1, y: 1.75, stepH: 0.70 },
    { inner: 18.4, outer: 20.4, y: 2.55, stepH: 0.80 },
  ];

  const cylThetaStart = Math.PI * 0.61;
  const cylThetaLength = Math.PI * 0.78;

  const ringAlphaStart = Math.PI * 0.11;
  const ringAlphaLength = Math.PI * 0.78;

  useEffect(() => {
    const targetSecondary = new THREE.Color(secondaryColor);
    stepMatRefs.current.forEach((mat) => {
      if (!mat) return;
      gsap.to(mat.color, {
        r: targetSecondary.r,
        g: targetSecondary.g,
        b: targetSecondary.b,
        duration: 1.2,
        ease: 'power2.out',
      });
    });
  }, [secondaryColor]);

  return (
    <group position={[0, 0, -3.2]}>
      {tiers.map((tier, idx) => {
        const benchRadius = (tier.inner + tier.outer) / 2;
        return (
          <group key={`tier-${idx}`}>
            {/* Piso do patamar da arquibancada */}
            <mesh position={[0, tier.y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[tier.inner, tier.outer, 48, 1, ringAlphaStart, ringAlphaLength]} />
              <meshStandardMaterial
                color="#1a1e33"
                roughness={0.5}
                metalness={0.4}
                side={THREE.DoubleSide}
              />
            </mesh>

            {/* Espelho vertical (riser) frontal do degrau */}
            <mesh position={[0, tier.y - tier.stepH / 2, 0]}>
              <cylinderGeometry
                args={[
                  tier.inner,
                  tier.inner,
                  tier.stepH,
                  48,
                  1,
                  true,
                  cylThetaStart,
                  cylThetaLength,
                ]}
              />
              <meshStandardMaterial
                color="#121524"
                roughness={0.6}
                metalness={0.5}
                side={THREE.DoubleSide}
              />
            </mesh>

            {/* Friso luminoso de balizamento de segurança (Reativo ao Branding) */}
            <mesh position={[0, tier.y + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[tier.inner, tier.inner + 0.08, 48, 1, ringAlphaStart, ringAlphaLength]} />
              <meshBasicMaterial
                ref={(el) => (stepMatRefs.current[idx] = el)}
                color={secondaryColor}
                transparent
                opacity={0.65}
                side={THREE.DoubleSide}
              />
            </mesh>

            {/* Fileira de assentos contínuos estilizados de auditório */}
            <mesh position={[0, tier.y + 0.14, 0]}>
              <cylinderGeometry
                args={[
                  benchRadius,
                  benchRadius,
                  0.28,
                  48,
                  1,
                  true,
                  cylThetaStart,
                  cylThetaLength,
                ]}
              />
              <meshStandardMaterial
                color="#222842"
                roughness={0.4}
                metalness={0.3}
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>
        );
      })}

      {/* Parapeito / Guarda-corpo arquitetural do topo do anfiteatro */}
      <mesh position={[0, 3.25, 0]}>
        <cylinderGeometry
          args={[20.5, 20.5, 0.6, 48, 1, true, cylThetaStart, cylThetaLength]}
        />
        <meshStandardMaterial
          color="#1f253d"
          roughness={0.4}
          metalness={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

/**
 * ScenicArches — Arcos cênicos de grande escala e portal de keynote corporativo.
 * 
 * Milestone 2D.4:
 * - 3 arcos concêntricos com neons embutidos reativos imediatamente ao branding;
 * - Arco 0 (frontal): primaryColor;
 * - Arco 1 (central): secondaryColor;
 * - Arco 2 (traseiro): primaryColor;
 * - Luzes volumétricas cênicas interpolam cores e reforçam intensidade na Unanimidade.
 */
function ScenicArches({
  primaryColor = '#ef233c',
  secondaryColor = '#3a86ff',
  isUnanimous = false,
}) {
  const arch0MatRef = useRef();
  const arch1MatRef = useRef();
  const arch2MatRef = useRef();
  const lightTopRef = useRef();
  const lightLeftRef = useRef();
  const lightRightRef = useRef();

  const arches = [
    { radius: 8.6, tube: 0.12, z: -8.0, heightOffset: 0.2 },
    { radius: 10.4, tube: 0.14, z: -10.4, heightOffset: 0.6 },
    { radius: 12.2, tube: 0.16, z: -12.8, heightOffset: 1.0 },
  ];

  // Interpolação de cores com GSAP
  useEffect(() => {
    const targetPrimary = new THREE.Color(primaryColor);
    const targetSecondary = new THREE.Color(secondaryColor);

    if (arch0MatRef.current) {
      gsap.to(arch0MatRef.current.color, {
        r: targetPrimary.r,
        g: targetPrimary.g,
        b: targetPrimary.b,
        duration: 1.2,
        ease: 'power2.out',
      });
    }

    if (arch1MatRef.current) {
      gsap.to(arch1MatRef.current.color, {
        r: targetSecondary.r,
        g: targetSecondary.g,
        b: targetSecondary.b,
        duration: 1.2,
        ease: 'power2.out',
      });
    }

    if (arch2MatRef.current) {
      gsap.to(arch2MatRef.current.color, {
        r: targetPrimary.r,
        g: targetPrimary.g,
        b: targetPrimary.b,
        duration: 1.2,
        ease: 'power2.out',
      });
    }

    if (lightTopRef.current) {
      gsap.to(lightTopRef.current.color, {
        r: targetSecondary.r,
        g: targetSecondary.g,
        b: targetSecondary.b,
        duration: 1.2,
        ease: 'power2.out',
      });
    }

    if (lightLeftRef.current) {
      gsap.to(lightLeftRef.current.color, {
        r: targetPrimary.r,
        g: targetPrimary.g,
        b: targetPrimary.b,
        duration: 1.2,
        ease: 'power2.out',
      });
    }

    if (lightRightRef.current) {
      gsap.to(lightRightRef.current.color, {
        r: targetPrimary.r,
        g: targetPrimary.g,
        b: targetPrimary.b,
        duration: 1.2,
        ease: 'power2.out',
      });
    }
  }, [primaryColor, secondaryColor]);

  // Efeito de Unanimidade nos Arcos
  useEffect(() => {
    let pulseTween = null;

    if (lightTopRef.current) {
      gsap.to(lightTopRef.current, {
        intensity: isUnanimous ? 7.5 : 3.8,
        duration: 1.2,
        ease: 'power2.out',
      });
    }

    if (lightLeftRef.current && lightRightRef.current) {
      gsap.to([lightLeftRef.current, lightRightRef.current], {
        intensity: isUnanimous ? 5.5 : 2.5,
        duration: 1.2,
        ease: 'power2.out',
        onComplete: () => {
          if (isUnanimous) {
            pulseTween = gsap.to([lightLeftRef.current, lightRightRef.current], {
              intensity: 6.8,
              repeat: -1,
              yoyo: true,
              duration: 1.4,
              ease: 'sine.inOut',
            });
          }
        },
      });
    }

    return () => {
      if (pulseTween) pulseTween.kill();
    };
  }, [isUnanimous]);

  const matRefs = [arch0MatRef, arch1MatRef, arch2MatRef];
  const initialColors = [primaryColor, secondaryColor, primaryColor];

  return (
    <group position={[0, 0, 0]}>
      {arches.map((arch, i) => (
        <group key={`scenic-arch-${i}`} position={[0, arch.heightOffset, arch.z]}>
          {/* Arco tubular semicircular principal */}
          <mesh position={[0, 0, 0]}>
            <torusGeometry args={[arch.radius, arch.tube, 16, 64, Math.PI]} />
            <meshStandardMaterial
              color="#262d47"
              roughness={0.25}
              metalness={0.85}
              envMapIntensity={1.3}
            />
          </mesh>

          {/* Friso luminoso interno do arco (Reativo ao Branding) */}
          <mesh position={[0, 0, 0]}>
            <torusGeometry args={[arch.radius - 0.2, arch.tube * 0.45, 12, 64, Math.PI]} />
            <meshBasicMaterial
              ref={matRefs[i]}
              color={initialColors[i]}
            />
          </mesh>

          {/* Pilares laterais estruturais esquerdos */}
          <mesh position={[-arch.radius, arch.radius / 2 - 0.2, 0]}>
            <cylinderGeometry args={[arch.tube * 1.3, arch.tube * 1.3, arch.radius, 16]} />
            <meshStandardMaterial color="#1c2236" roughness={0.3} metalness={0.8} />
          </mesh>

          {/* Pilares laterais estruturais direitos */}
          <mesh position={[arch.radius, arch.radius / 2 - 0.2, 0]}>
            <cylinderGeometry args={[arch.tube * 1.3, arch.tube * 1.3, arch.radius, 16]} />
            <meshStandardMaterial color="#1c2236" roughness={0.3} metalness={0.8} />
          </mesh>
        </group>
      ))}

      {/* Painel acústico de fundo da arena (curved slat backdrop) */}
      <mesh position={[0, 7.0, -14.8]}>
        <cylinderGeometry
          args={[18, 18, 14, 48, 1, true, Math.PI * 0.65, Math.PI * 0.70]}
        />
        <meshStandardMaterial
          color="#0e111f"
          roughness={0.7}
          metalness={0.2}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Luzes cênicas de contorno e preenchimento dos arcos */}
      <pointLight
        ref={lightTopRef}
        position={[0, 10.5, -11.5]}
        intensity={3.8}
        color={secondaryColor}
        distance={25}
      />
      <pointLight
        ref={lightLeftRef}
        position={[-9, 5.5, -9.5]}
        intensity={2.5}
        color={primaryColor}
        distance={22}
      />
      <pointLight
        ref={lightRightRef}
        position={[9, 5.5, -9.5]}
        intensity={2.5}
        color={primaryColor}
        distance={22}
      />
    </group>
  );
}

/**
 * StudioScene — Orquestrador cênico 3D da Arena Voice.
 * 
 * Milestone 2D.4: Dynamic Theming & Reactive Stage Experience.
 * - Conecta o palco ao branding do evento ativo (primaryColor e secondaryColor);
 * - Orquestra a resposta em tempo real aos eventos SignalR;
 * - Ativa celebração institucional de Unanimidade (5 de 5 cadeiras apoiando);
 * - Iluminação aprimorada para clareza, prestígio e legibilidade cênica.
 */
export function StudioScene({ chairs = [], branding = {} }) {
  const ambientLightRef = useRef();

  const primaryColor = branding?.primaryColor || '#ef233c';
  const secondaryColor = branding?.secondaryColor || '#3a86ff';

  const turnedCount = chairs.filter((c) => c.isTurned).length;
  const isUnanimous = chairs.length === 5 && turnedCount === 5;

  // Interpolação suave da iluminação global na Unanimidade
  useEffect(() => {
    if (ambientLightRef.current) {
      gsap.to(ambientLightRef.current, {
        intensity: isUnanimous ? 1.0 : 0.75,
        duration: 1.2,
        ease: 'power2.out',
      });
    }
  }, [isUnanimous]);

  /**
   * Distribuição em arco semicircular para as 5 cadeiras da banca de jurados.
   * Posicionadas em primeiro plano no piso da arena (Y = 0), orientadas para o pódio de pitch.
   */
  const ARC_RADIUS = 6.4;
  const ARC_Z_BASE = 4.2;
  const chairDefs = chairs.map((chair, i) => {
    const t = (i - 2) / 2; // [-1, -0.5, 0, 0.5, 1]
    const x = t * ARC_RADIUS;
    const z = ARC_Z_BASE + Math.abs(t) * 0.85;
    const baseRotY = -t * 0.32;
    return { ...chair, pos: [x, 0, z], baseRotY };
  });

  return (
    <>
      {/* ── Iluminação Global da Arena (Calibrada para Legibilidade) ──────── */}
      <ambientLight ref={ambientLightRef} intensity={0.75} color="#20263e" />

      {/* Luz principal superior frontal com projeção de sombras suaves */}
      <directionalLight
        position={[8, 22, 16]}
        intensity={2.4}
        color="#f8fafc"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={1}
        shadow-camera-far={65}
        shadow-camera-left={-22}
        shadow-camera-right={22}
        shadow-camera-top={22}
        shadow-camera-bottom={-22}
      />

      {/* Luz de preenchimento frontal suave para a bancada de jurados */}
      <directionalLight position={[-8, 14, 15]} intensity={1.1} color="#cbd5e1" />

      {/* Luzes de recorte lateral para silhueta das cadeiras da banca */}
      <pointLight position={[-9, 2.5, 5]} intensity={2.2} color="#94a3b8" distance={16} />
      <pointLight position={[9, 2.5, 5]} intensity={2.2} color="#94a3b8" distance={16} />

      {/* ── Arquitetura Cênica da Arena (Reativa ao Branding) ─────────────── */}
      <ArenaFloor />
      <CentralPitchStage
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
        isUnanimous={isUnanimous}
      />
      <AmphitheaterTiers secondaryColor={secondaryColor} />
      <ScenicArches
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
        isUnanimous={isUnanimous}
      />

      {/* ── As 5 Cadeiras da Banca de Avaliação (Conectadas ao Branding) ───── */}
      {chairDefs.map((c) => (
        <Chair
          key={c.id}
          id={c.id}
          name={c.name}
          isTurned={c.isTurned}
          position={c.pos}
          baseRotY={c.baseRotY}
          branding={branding}
        />
      ))}
    </>
  );
}

export default StudioScene;
