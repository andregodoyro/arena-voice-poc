import React from 'react';
import { OperatorLayout } from '../components/operator/OperatorLayout';
import { OperatorCockpitTab } from './operator/OperatorCockpitTab';

/**
 * OperatorPage — Entrada da Mesa Técnica / Wrapper de Retrocompatibilidade.
 * No Milestone 2C.1, o roteamento oficial passa a ser gerenciado via OperatorLayout
 * com sub-rotas (/operator/cockpit, /operator/projects, /operator/event).
 */
export function OperatorPage({ chairs = [], connectionStatus, events = [], onResetArena }) {
  return (
    <OperatorLayout connectionStatus={connectionStatus}>
      <OperatorCockpitTab
        chairs={chairs}
        events={events}
        onResetArena={onResetArena}
      />
    </OperatorLayout>
  );
}

export default OperatorPage;
