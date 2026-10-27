import React from 'react';
import { Chair } from './Chair';
import * as THREE from 'three';

/**
 * ArenaFloor — Piso geral da arena/auditório corporativo.
 * 
 * Milestone 2D.3 (Ajuste de Composição):
 * Cria a distinção hierárquica "Arena Geral > Palco da Startup > Pódio do Pitch".
 * O piso geral é um plano escuro, amplo e com contraste arquitetural sobre o qual
 * repousam as cadeiras da banca, as vias de circulação e a fundação da arquibancada.
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
 * CentralPitchStage — Palco delimitado da startup e Pódio elevado do orador.
 * 
 * Milestone 2D.3 (Ajuste de Composição):
 * - Palco da Startup: Ilha circular laqueada elevada (raio 6.0, altura 0.18m);
 * - Pódio do Pitch: Plataforma tecnológica adicional elevada (raio 2.8, altura 0.16m, topo em Y=0.34m);
 * - Destaque visual cristalino de apresentação institucional de keynote / demo day;
 * - Spot dedicado focalizado no centro do pódio.
 */
function CentralPitchStage() {
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

        {/* Fita de luz de piso do palco da startup */}
        <mesh position={[0, 0.182, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[5.65, 5.75, 64]} />
          <meshBasicMaterial color="#64748b" side={THREE.DoubleSide} />
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

        {/* Anel de demarcação de keynote do orador */}
        <mesh position={[0, 0.165, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2.45, 2.55, 64]} />
          <meshBasicMaterial color="#94a3b8" side={THREE.DoubleSide} />
        </mesh>

        {/* Retícula central de alinhamento institucional */}
        <mesh position={[0, 0.165, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.7, 0.75, 32]} />
          <meshBasicMaterial color="#64748b" side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* Refletor spot cênico focado exatamente no centro do pódio */}
      <spotLight
        position={[0, 11, 2]}
        target-position={[0, 0.34, -3.2]}
        intensity={6.0}
        angle={Math.PI / 6.0}
        penumbra={0.65}
        color="#f1f5f9"
        distance={24}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
    </group>
  );
}

/**
 * AmphitheaterTiers — Arquibancada semicircular procedural de auditório corporativo.
 * 
 * Milestone 2D.3 (Ajuste de Composição):
 * - Orientação paramétrica estritamente corrigida: centralizada em theta = PI (fundo da cena / -Z);
 * - Amplitude angular: thetaStart = 0.61*PI, thetaLength = 0.78*PI;
 * - Nenhuma parte da geometria projeta-se em direção à câmera ou obstrui cadeiras/palco;
 * - 4 patamares escalonados em altura com balizamento luminoso de segurança;
 * - Fundo monumental limpo e harmônico.
 */
function AmphitheaterTiers() {
  const tiers = [
    { inner: 11.5, outer: 13.5, y: 0.45, stepH: 0.45 },
    { inner: 13.8, outer: 15.8, y: 1.05, stepH: 0.60 },
    { inner: 16.1, outer: 18.1, y: 1.75, stepH: 0.70 },
    { inner: 18.4, outer: 20.4, y: 2.55, stepH: 0.80 },
  ];

  // Ângulos cilíndricos (CylinderGeometry): centrados em PI (fundo -Z)
  // theta varia de 0.61*PI a 1.39*PI -> cos(theta) < 0 sempre (estritamente -Z)
  const cylThetaStart = Math.PI * 0.61;
  const cylThetaLength = Math.PI * 0.78;

  // Ângulos planares (RingGeometry com rotation=[-PI/2, 0, 0]):
  // alpha varia de 0.11*PI a 0.89*PI -> sin(alpha) > 0 sempre (z' = -r*sin(alpha) < 0 sempre)
  const ringAlphaStart = Math.PI * 0.11;
  const ringAlphaLength = Math.PI * 0.78;

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

            {/* Friso luminoso de balizamento de segurança no rodapé */}
            <mesh position={[0, tier.y + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[tier.inner, tier.inner + 0.08, 48, 1, ringAlphaStart, ringAlphaLength]} />
              <meshBasicMaterial color="#475569" side={THREE.DoubleSide} />
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
 * ScenicArches — Arcos cênicos de grande escala e portal de fundo de keynote corporativo.
 * 
 * Milestone 2D.3:
 * - 3 arcos concêntricos em perspectiva profunda atrás do palco;
 * - Guarnições de iluminação linear arquitetural embutidas;
 * - Painel acústico curvo ao fundo (corporate slat wall).
 */
function ScenicArches() {
  const arches = [
    { radius: 8.6, tube: 0.12, z: -8.0, heightOffset: 0.2 },
    { radius: 10.4, tube: 0.14, z: -10.4, heightOffset: 0.6 },
    { radius: 12.2, tube: 0.16, z: -12.8, heightOffset: 1.0 },
  ];

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

          {/* Friso luminoso interno do arco */}
          <mesh position={[0, 0, 0]}>
            <torusGeometry args={[arch.radius - 0.2, arch.tube * 0.45, 12, 64, Math.PI]} />
            <meshBasicMaterial color="#94a3b8" />
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
      <pointLight position={[0, 10.5, -11.5]} intensity={3.5} color="#475569" distance={24} />
      <pointLight position={[-9, 5.5, -9.5]} intensity={2.5} color="#64748b" distance={20} />
      <pointLight position={[9, 5.5, -9.5]} intensity={2.5} color="#64748b" distance={20} />
    </group>
  );
}

/**
 * StudioScene — Orquestrador cênico 3D da Arena Voice.
 * Reúne a arena corporativa, o auditório/anfiteatro, os arcos cênicos e as 5 cadeiras da banca.
 */
export function StudioScene({ chairs = [] }) {
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
      {/* ── Iluminação Global da Arena ─────────────────────────────────────── */}
      <ambientLight intensity={0.65} color="#222842" />

      {/* Luz principal superior frontal com projeção de sombras suaves */}
      <directionalLight
        position={[8, 22, 16]}
        intensity={2.2}
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
      <directionalLight position={[-8, 14, 15]} intensity={0.9} color="#cbd5e1" />

      {/* Luzes de recorte lateral para silhueta das cadeiras da banca */}
      <pointLight position={[-9, 2.5, 5]} intensity={2.2} color="#94a3b8" distance={16} />
      <pointLight position={[9, 2.5, 5]} intensity={2.2} color="#94a3b8" distance={16} />

      {/* ── Arquitetura Cênica da Arena (Milestone 2D.3) ─────────────────── */}
      <ArenaFloor />
      <CentralPitchStage />
      <AmphitheaterTiers />
      <ScenicArches />

      {/* ── As 5 Cadeiras da Banca de Avaliação ────────────────────────────── */}
      {chairDefs.map((c) => (
        <Chair
          key={c.id}
          id={c.id}
          name={c.name}
          isTurned={c.isTurned}
          position={c.pos}
          baseRotY={c.baseRotY}
        />
      ))}
    </>
  );
}

export default StudioScene;
