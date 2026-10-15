import React, { useState } from 'react';
import { StudioCanvas } from './components/StudioCanvas';
import { HUD } from './components/HUD';

/**
 * App — Root component.
 * Owns the canonical state of all 5 judge chairs.
 * Passes state + callbacks down to Canvas (3D) and HUD (2D overlay).
 */
export default function App() {
  // ── Global Chair State ───────────────────────────────────────────────────
  const [chairs, setChairs] = useState([
    { id: 1, name: 'Técnico 1', isTurned: false },
    { id: 2, name: 'Técnico 2', isTurned: false },
    { id: 3, name: 'Técnico 3', isTurned: false },
    { id: 4, name: 'Técnico 4', isTurned: false },
    { id: 5, name: 'Técnico 5', isTurned: false },
  ]);

  /**
   * toggleChair — flips the isTurned state of a single chair by id.
   * Both the 3D mesh (onClick) and the HUD button call this same function,
   * keeping a single source of truth.
   */
  const toggleChair = (id) => {
    setChairs((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isTurned: !c.isTurned } : c))
    );
  };

  /**
   * turnAll — if every chair is already turned, reset all to false.
   * Otherwise turn all to true simultaneously.
   */
  const turnAll = () => {
    setChairs((prev) => {
      const allTurned = prev.every((c) => c.isTurned);
      return prev.map((c) => ({ ...c, isTurned: !allTurned }));
    });
  };

  return (
    <main style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* 3D Canvas Layer (fills the entire viewport) */}
      <StudioCanvas chairs={chairs} toggleChair={toggleChair} />

      {/* 2D HUD Layer (absolute overlay, pointer-events-none on container) */}
      <HUD chairs={chairs} toggleChair={toggleChair} turnAll={turnAll} />
    </main>
  );
}
