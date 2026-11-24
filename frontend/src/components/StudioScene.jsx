import React, { useRef, useEffect, useMemo } from 'react';
import { Chair } from './Chair';
import { HeroShowcaseWall } from './stage/HeroShowcaseWall';
import gsap from 'gsap';
import * as THREE from 'three';

/**
 * ArchitecturalFloor — Piso nobre da arena corporativa de inovação.
 * 
 * Phase 5C.1:
 * - Substituição do piso frio e linhas técnicas por assoalho amadeirado escuro;
 * - Anéis concêntricos de circulação em latão/bronze arquitetural suave;
 * - Material PBR com reflexão sutil dos halos do teto e do pódio central.
 */
function ArchitecturalFloor() {
  const guideRings = [9.5, 12.0, 15.0, 18.5, 22.0];

  return (
    <group position={[0, 0, 0]}>
      {/* Placa circular principal da arena */}
      <mesh position={[0, -0.1, 0]} receiveShadow>
        <cylinderGeometry args={[28, 28.5, 0.2, 64]} />
        <meshStandardMaterial
          color="#16120e"
          roughness={0.45}
          metalness={0.18}
        />
      </mesh>

      {/* Frisos circulares embutidos em latão fosco (circulação e zoneamento) */}
      {guideRings.map((radius, i) => (
        <mesh
          key={`floor-ring-${i}`}
          position={[0, 0.005, -3.2]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[radius, radius + 0.035, 64]} />
          <meshBasicMaterial
            color="#c49a6c"
            transparent
            opacity={0.25}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

/**
 * TieredPitchStage — Pódio Central Circular Escalonado (Dois Níveis).
 * 
 * Phase 5C.1:
 * - Diretamente inspirado na arquitetura circular da arena de referência;
 * - Nível 1 (Plataforma Base): Raio 5.8m, altura 0.22m, acabamento em nogueira;
 * - Nível 2 (Pódio do Orador): Raio 3.5m, altura 0.22m (Y total 0.44m), carvalho nobre;
 * - Fita de luz indireta (cove halo) embutida na base de cada degrau (2900K - 3100K);
 * - Inlay circular de alinhamento do orador em latão nobre;
 * - Reatividade cênica preservada via GSAP:
 *   * isVotingOpen: respiração luminosa suave no rodapé do palco;
 *   * isUrgent: pulso sutil em tom âmbar nos últimos 15s;
 *   * isVotingClosed: afunilamento intimista do spotlight;
 *   * isUnanimous: celebração em ouro âmbar arquitetural (5 de 5 cadeiras).
 */
function TieredPitchStage({
  primaryColor = '#ef233c',
  secondaryColor = '#d4a373',
  isUnanimous = false,
  isVotingOpen = false,
  isUrgent = false,
  isVotingClosed = false,
}) {
  const stageCoveMatRef = useRef();
  const podiumCoveMatRef = useRef();
  const keynoteInlayMatRef = useRef();
  const spotLightRef = useRef();
  const unanimityAuraRef = useRef();
  const unanimityMatRef = useRef();

  // Transição reativa de cores e intensidades via GSAP
  useEffect(() => {
    const targetPrimary = new THREE.Color(primaryColor);
    const targetSecondary = new THREE.Color(secondaryColor);

    if (stageCoveMatRef.current) {
      gsap.to(stageCoveMatRef.current.color, {
        r: targetSecondary.r,
        g: targetSecondary.g,
        b: targetSecondary.b,
        duration: 1.2,
        ease: 'power2.out',
      });
    }

    if (podiumCoveMatRef.current) {
      gsap.to(podiumCoveMatRef.current.color, {
        r: targetSecondary.r,
        g: targetSecondary.g,
        b: targetSecondary.b,
        duration: 1.2,
        ease: 'power2.out',
      });
    }

    if (keynoteInlayMatRef.current) {
      gsap.to(keynoteInlayMatRef.current.color, {
        r: targetSecondary.r,
        g: targetSecondary.g,
        b: targetSecondary.b,
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

  // Efeito Cênico de Unanimidade e Foco de Iluminação
  useEffect(() => {
    let pulseTween = null;

    if (spotLightRef.current) {
      const targetIntensity = isUnanimous ? 9.5 : (isVotingClosed ? 7.6 : (isVotingOpen ? 7.0 : 6.4));
      gsap.to(spotLightRef.current, {
        intensity: targetIntensity,
        duration: 1.2,
        ease: 'power2.out',
      });
    }

    if (unanimityMatRef.current && unanimityAuraRef.current) {
      if (isUnanimous) {
        gsap.to(unanimityMatRef.current, {
          opacity: 0.6,
          duration: 0.8,
          ease: 'power2.out',
          onComplete: () => {
            pulseTween = gsap.to(unanimityMatRef.current, {
              opacity: 0.85,
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
  }, [isUnanimous, isVotingOpen, isVotingClosed]);

  // Efeito Visual de Urgência nos últimos 15 segundos
  useEffect(() => {
    let urgencyTween = null;

    if (isUrgent && keynoteInlayMatRef.current && stageCoveMatRef.current) {
      const alertColor = new THREE.Color('#ff9f43');
      urgencyTween = gsap.to([keynoteInlayMatRef.current.color, stageCoveMatRef.current.color], {
        r: alertColor.r,
        g: alertColor.g,
        b: alertColor.b,
        repeat: -1,
        yoyo: true,
        duration: 0.55,
        ease: 'sine.inOut',
      });
    } else {
      const targetSecondary = new THREE.Color(secondaryColor);
      if (keynoteInlayMatRef.current) {
        gsap.to(keynoteInlayMatRef.current.color, {
          r: targetSecondary.r,
          g: targetSecondary.g,
          b: targetSecondary.b,
          duration: 0.8,
        });
      }
      if (stageCoveMatRef.current) {
        gsap.to(stageCoveMatRef.current.color, {
          r: targetSecondary.r,
          g: targetSecondary.g,
          b: targetSecondary.b,
          duration: 0.8,
        });
      }
    }

    return () => {
      if (urgencyTween) urgencyTween.kill();
    };
  }, [isUrgent, secondaryColor]);

  return (
    <group position={[0, 0, -3.2]}>
      {/* ── NÍVEL 1: Plataforma Inferior do Palco (Raio 5.8m) ─────────────── */}
      <group position={[0, 0, 0]}>
        {/* Corpo cilíndrico do degrau inferior em nogueira nobre */}
        <mesh position={[0, 0.11, 0]} receiveShadow>
          <cylinderGeometry args={[5.8, 5.95, 0.22, 64]} />
          <meshStandardMaterial
            color="#281e16"
            roughness={0.4}
            metalness={0.16}
          />
        </mesh>

        {/* Superfície do degrau 1 com friso perimetral em latão escovado */}
        <mesh position={[0, 0.221, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[5.68, 5.8, 64]} />
          <meshStandardMaterial color="#4a3726" roughness={0.35} metalness={0.65} />
        </mesh>

        {/* Fita de luz indireta inferior (Under-step Cove Light — 2900K) */}
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[5.75, 5.92, 64]} />
          <meshBasicMaterial
            ref={stageCoveMatRef}
            color={secondaryColor}
            transparent
            opacity={0.85}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Aura de Unanimidade arquitetural (Pulso de prestígio no pódio) */}
        <mesh
          ref={unanimityAuraRef}
          position={[0, 0.223, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[3.6, 5.7, 64]} />
          <meshBasicMaterial
            ref={unanimityMatRef}
            color={primaryColor}
            side={THREE.DoubleSide}
            transparent
            opacity={0}
          />
        </mesh>
      </group>

      {/* ── NÍVEL 2: Pódio Superior do Orador (Raio 3.5m, Y = +0.22m) ───────── */}
      <group position={[0, 0.22, 0]}>
        {/* Corpo cilíndrico do pódio do orador em carvalho arquitetural */}
        <mesh position={[0, 0.11, 0]} receiveShadow castShadow>
          <cylinderGeometry args={[3.48, 3.58, 0.22, 64]} />
          <meshStandardMaterial
            color="#3a2a1d"
            roughness={0.34}
            metalness={0.14}
          />
        </mesh>

        {/* Piso de oratória do orador (superfície madeira nobre tratada) */}
        <mesh position={[0, 0.222, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[3.46, 64]} />
          <meshStandardMaterial
            color="#463323"
            roughness={0.32}
            metalness={0.12}
          />
        </mesh>

        {/* Fita de luz indireta do pódio central (Under-step Cove Light — 3100K) */}
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[3.45, 3.56, 64]} />
          <meshBasicMaterial
            ref={podiumCoveMatRef}
            color={secondaryColor}
            transparent
            opacity={0.9}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Inlay sutil em latão para orientação do orador na arena */}
        <mesh position={[0, 0.224, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.4, 1.45, 48]} />
          <meshBasicMaterial
            ref={keynoteInlayMatRef}
            color={secondaryColor}
            transparent
            opacity={0.5}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      {/* ── Refletor Zenital Arquitetural Focalizado no Pódio ─────────────── */}
      <spotLight
        ref={spotLightRef}
        position={[0, 13.5, 0.5]}
        target-position={[0, 0.44, -3.2]}
        intensity={isUnanimous ? 9.5 : (isVotingClosed ? 7.6 : 6.4)}
        angle={isVotingClosed ? Math.PI / 6.5 : Math.PI / 5.5}
        penumbra={0.65}
        color="#fff6ed"
        distance={28}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
    </group>
  );
}

/**
 * AcousticCanopy — Cúpula Arquitetural Zenital do Auditório.
 * 
 * Phase 5C.1:
 * - Inspirada na magnífica cúpula circular com anel de luz da referência visual;
 * - Estrutura superior em disco côncavo de madeira com aletas acústicas radiais;
 * - Dois anéis concêntricos de iluminação indireta (cove halo) banhando a arena;
 * - Óculo central com projetores de palco integrados.
 */
function AcousticCanopy({ secondaryColor = '#ffd8a8' }) {
  const outerHaloMatRef = useRef();
  const innerHaloMatRef = useRef();

  // 32 aletas acústicas radiais posicionadas na cúpula
  const radialFins = useMemo(() => {
    const fins = [];
    const count = 32;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      fins.push({ angle, id: i });
    }
    return fins;
  }, []);

  return (
    <group position={[0, 13.5, -3.2]}>
      {/* Disco côncavo principal da cúpula de forro em madeira nobre */}
      <mesh position={[0, 0.2, 0]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[12.2, 10.8, 0.8, 64, 1, true]} />
        <meshStandardMaterial
          color="#281e16"
          roughness={0.5}
          metalness={0.12}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Forro de fechamento superior da cúpula */}
      <mesh position={[0, 0.6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[4.2, 12.2, 64]} />
        <meshStandardMaterial
          color="#201711"
          roughness={0.6}
          metalness={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Anel de luz indireta externo (Cove Halo 2800K — 10.4m) */}
      <mesh position={[0, -0.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[10.2, 10.55, 64]} />
        <meshBasicMaterial
          ref={outerHaloMatRef}
          color="#ffcca0"
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Anel de luz indireta interno (Cove Halo 3100K — 4.5m) */}
      <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[4.35, 4.65, 64]} />
        <meshBasicMaterial
          ref={innerHaloMatRef}
          color="#ffe4cc"
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Óculo central com carcaça dos refletores de teto em bronze escovado */}
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[4.2, 4.2, 0.4, 32]} />
        <meshStandardMaterial color="#1a1410" roughness={0.35} metalness={0.7} />
      </mesh>

      {/* Aletas acústicas radiais esculpidas sob a cúpula */}
      {radialFins.map((fin) => (
        <group key={`canopy-fin-${fin.id}`} rotation={[0, fin.angle, 0]}>
          <mesh position={[7.2, 0.1, 0]}>
            <boxGeometry args={[5.2, 0.28, 0.06]} />
            <meshStandardMaterial color="#3a2a1d" roughness={0.45} metalness={0.15} />
          </mesh>
        </group>
      ))}

      {/* Luz ambiente zenital difusa projetada pela cúpula */}
      <pointLight position={[0, -0.5, 0]} intensity={2.8} color="#ffe8cc" distance={22} />
    </group>
  );
}

/**
 * AcousticTimberWalls — Paredes e Painéis de Ripas Acústicas da Arena.
 * 
 * Phase 5C.1:
 * - Linguagem arquitetural baseada em "Acoustic Timber Slats";
 * - Estrutura semicircular monumental que abraça a arena e o anfiteatro;
 * - Ripas de madeira vertical distribuídas ao longo do raio perimetral;
 * - Banho de luz rasante vertical (linear grazing) que valoriza a textura da madeira.
 */
function AcousticTimberWalls() {
  const radius = 23.0;

  // Ripas acústicas nas alas laterais (Left Wing e Right Wing) emoldurando o telão panorâmico
  const slats = useMemo(() => {
    const list = [];
    const slatsPerWing = 22;

    // Ala Esquerda: da lateral externa até o início do telão
    const leftStart = Math.PI * 0.58;
    const leftEnd = Math.PI * 0.74;
    for (let i = 0; i < slatsPerWing; i++) {
      const t = i / (slatsPerWing - 1);
      const angle = leftStart + t * (leftEnd - leftStart);
      const x = Math.sin(angle) * radius;
      const z = Math.cos(angle) * radius - 3.2;
      const rotY = angle + Math.PI;
      list.push({ id: `left-${i}`, pos: [x, 7.0, z], rotY });
    }

    // Ala Direita: do fim do telão até a lateral externa
    const rightStart = Math.PI * 1.26;
    const rightEnd = Math.PI * 1.42;
    for (let i = 0; i < slatsPerWing; i++) {
      const t = i / (slatsPerWing - 1);
      const angle = rightStart + t * (rightEnd - rightStart);
      const x = Math.sin(angle) * radius;
      const z = Math.cos(angle) * radius - 3.2;
      const rotY = angle + Math.PI;
      list.push({ id: `right-${i}`, pos: [x, 7.0, z], rotY });
    }

    return list;
  }, []);

  return (
    <group position={[0, 0, 0]}>
      {/* Alvenaria de fundo acústico escuro contínua */}
      <mesh position={[0, 7.0, -3.2]}>
        <cylinderGeometry
          args={[radius + 0.3, radius + 0.3, 14.5, 48, 1, true, Math.PI * 0.55, Math.PI * 0.90]}
        />
        <meshStandardMaterial
          color="#120e0a"
          roughness={0.7}
          metalness={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Ripas verticais de madeira nobre nas alas laterais de emolduramento */}
      {slats.map((slat) => (
        <mesh
          key={`slat-${slat.id}`}
          position={slat.pos}
          rotation={[0, slat.rotY, 0]}
          receiveShadow
        >
          <boxGeometry args={[0.22, 14.0, 0.16]} />
          <meshStandardMaterial
            color="#3a2a1c"
            roughness={0.46}
            metalness={0.12}
          />
        </mesh>
      ))}

      {/* Escadas e portais arquiteturais laterais iluminados (Conceito Visual Callout 03) */}
      <group position={[-18.5, 3.5, -16.5]} rotation={[0, 0.65, 0]}>
        {[0, 1, 2, 3].map((stepIdx) => (
          <mesh key={`step-l-${stepIdx}`} position={[stepIdx * 0.45, stepIdx * 0.5, 0]}>
            <boxGeometry args={[1.6, 0.45, 3.2]} />
            <meshStandardMaterial color="#261c14" roughness={0.4} metalness={0.2} />
          </mesh>
        ))}
      </group>
      <group position={[18.5, 3.5, -16.5]} rotation={[0, -0.65, 0]}>
        {[0, 1, 2, 3].map((stepIdx) => (
          <mesh key={`step-r-${stepIdx}`} position={[-stepIdx * 0.45, stepIdx * 0.5, 0]}>
            <boxGeometry args={[1.6, 0.45, 3.2]} />
            <meshStandardMaterial color="#261c14" roughness={0.4} metalness={0.2} />
          </mesh>
        ))}
      </group>

      {/* Iluminação rasante (grazing lights) nas ripas de madeira e escadas laterais */}
      <pointLight position={[-18, 6.0, -14]} intensity={2.4} color="#ffd4a8" distance={22} />
      <pointLight position={[18, 6.0, -14]} intensity={2.4} color="#ffd4a8" distance={22} />
      <pointLight position={[0, 7.5, -23]} intensity={1.8} color="#ffe2c4" distance={20} />
    </group>
  );
}

/**
 * StudioScene — Orquestrador Cênico 3D da Arena Voice.
 * 
 * Phase 5C.1: Architectural Arena Redesign.
 * - Integra a nova arquitetura de auditório e keynote arena de alto nível;
 * - Palco central circular escalonado de dois níveis com iluminação indireta;
 * - Cúpula arquitetural zenital inspirada na referência visual;
 * - Paredes com ripas acústicas de madeira nobre (Acoustic Timber Slats);
 * - Nicho estrutural reservado para o Telão Monumental (Phase 5C.2);
 * - As 5 cadeiras da banca preservadas em semicírculo com materiais PBR nobres;
 * - Preservação estrita dos gatilhos de áudio cênico e SignalR (ADR-027 / ADR-028).
 */
export function StudioScene({
  chairs = [],
  branding = {},
  pitchState = null,
  currentProject = null,
  currentEvent = null,
}) {
  const ambientLightRef = useRef();

  const primaryColor = branding?.primaryColor || '#ef233c';
  const secondaryColor = branding?.secondaryColor || '#d4a373'; // âmbar/bronze quente padrão

  const turnedCount = chairs.filter((c) => c.isTurned).length;
  const isUnanimous = chairs.length === 5 && turnedCount === 5;

  // Análise dos estados cênicos para acionamento visual coordenado
  const stageName = pitchState?.stage || pitchState?.stageName || 'Waiting';
  const isVotingOpen = stageName === 'VotingOpen' || Boolean(pitchState?.isVotingAllowed);
  const isTimedStage = ['PitchRunning', 'QA', 'VotingOpen'].includes(stageName);
  const remSec = typeof pitchState?.remainingSeconds === 'number'
    ? Math.round(pitchState.remainingSeconds)
    : null;
  const isUrgent = isTimedStage && !pitchState?.isPaused && remSec !== null && remSec > 0 && remSec <= 15;
  const isVotingClosed = ['VotingClosed', 'Finished'].includes(stageName);

  // Interpolação suave da iluminação global ambiente
  useEffect(() => {
    if (ambientLightRef.current) {
      const targetAmbient = isUnanimous ? 1.0 : (isVotingClosed ? 0.65 : 0.78);
      gsap.to(ambientLightRef.current, {
        intensity: targetAmbient,
        duration: 1.2,
        ease: 'power2.out',
      });
    }
  }, [isUnanimous, isVotingClosed]);

  /**
   * Distribuição em arco semicircular para as 5 cadeiras da banca de jurados.
   * Posicionadas no piso nobre da arena (Y = 0), voltadas para o pódio central.
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
      {/* ── Iluminação Global da Arena (3000K Arquitetural Quente) ─────────── */}
      <ambientLight ref={ambientLightRef} intensity={0.78} color="#2e2219" />

      {/* Luz principal superior frontal com projeção de sombras suaves */}
      <directionalLight
        position={[8, 22, 16]}
        intensity={2.3}
        color="#fff6ed"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={1}
        shadow-camera-far={65}
        shadow-camera-left={-22}
        shadow-camera-right={22}
        shadow-camera-top={22}
        shadow-camera-bottom={-22}
      />

      {/* Luz de preenchimento frontal suave em tom âmbar quente */}
      <directionalLight position={[-8, 14, 15]} intensity={1.05} color="#e2d2c2" />

      {/* Luzes de recorte lateral para silhueta elegante das cadeiras */}
      <pointLight position={[-9, 2.5, 5]} intensity={2.0} color="#d4a373" distance={16} />
      <pointLight position={[9, 2.5, 5]} intensity={2.0} color="#d4a373" distance={16} />

      {/* ── Arquitetura Cênica da Arena (Phase 5C.1) ───────────────────────── */}
      <ArchitecturalFloor />
      <TieredPitchStage
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
        isUnanimous={isUnanimous}
        isVotingOpen={isVotingOpen}
        isUrgent={isUrgent}
        isVotingClosed={isVotingClosed}
      />
      <AcousticCanopy secondaryColor={secondaryColor} />
      <AcousticTimberWalls />
      <HeroShowcaseWall
        currentProject={currentProject}
        currentEvent={currentEvent}
        pitchState={pitchState}
        branding={branding}
      />

      {/* ── As 5 Cadeiras da Banca de Avaliação ─────────────────────────────── */}
      {chairDefs.map((c) => (
        <Chair
          key={c.id}
          id={c.id}
          name={c.name}
          isTurned={c.isTurned}
          isVotingOpen={isVotingOpen}
          position={c.pos}
          baseRotY={c.baseRotY}
          branding={{
            primaryColor,
            secondaryColor,
          }}
        />
      ))}
    </>
  );
}

export default StudioScene;