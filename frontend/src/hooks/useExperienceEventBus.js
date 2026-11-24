import { useEffect, useRef } from 'react';
import { experienceEventBus } from '../services/experienceEventBus';

/**
 * Hook declarativo para consumir eventos do ExperienceEventBus em componentes React / R3F.
 *
 * @param {Record<string, (event: { type: string, payload: any, emittedAt: number }) => void>} handlers
 */
export function useExperienceEventBus(handlers = {}) {
  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  const eventKeys = Object.keys(handlers).sort().join('|');

  useEffect(() => {
    const keys = eventKeys ? eventKeys.split('|') : [];
    if (keys.length === 0) return undefined;

    const unsubscribers = keys.map((eventType) =>
      experienceEventBus.subscribe(eventType, (envelope) => {
        const fn = handlersRef.current?.[eventType];
        if (typeof fn === 'function') {
          fn(envelope);
        }
      })
    );

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [eventKeys]);
}

export default useExperienceEventBus;
