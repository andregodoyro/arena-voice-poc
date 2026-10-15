import { useEffect, useState, useRef } from 'react';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';

/**
 * useSignalR — Hook dedicado para gerenciamento da conexão WebSocket/SignalR.
 * 
 * Separa a camada de rede da renderização 3D e do estado dos componentes.
 * Escuta eventos do servidor e despacha para os callbacks fornecidos.
 */
export function useSignalR({ onChairTurned, onChairsReset, initialBackendUrl }) {
  const [backendUrl, setBackendUrl] = useState(() => {
    return localStorage.getItem('arena_poc_backend_url') || initialBackendUrl || 'http://localhost:5000';
  });
  const [connectionStatus, setConnectionStatus] = useState('DESCONECTADO');
  const [connectionError, setConnectionError] = useState(null);

  const callbacksRef = useRef({ onChairTurned, onChairsReset });
  callbacksRef.current = { onChairTurned, onChairsReset };

  const handleBackendUrlChange = (url) => {
    const cleaned = url.trim().replace(/\/+$/, '');
    setBackendUrl(cleaned);
    localStorage.setItem('arena_poc_backend_url', cleaned);
  };

  useEffect(() => {
    const hubUrl = `${backendUrl}/hubs/arena-poc`;

    const connection = new HubConnectionBuilder()
      .withUrl(hubUrl)
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(LogLevel.Warning)
      .build();

    // ── Tratamento do ciclo de vida da conexão ─────────────────────────────
    connection.onreconnecting(() => {
      console.warn('[SignalR] Conexão perdida. Tentando reconectar...');
      setConnectionStatus('RECONECTANDO');
    });

    connection.onreconnected(() => {
      console.log('[SignalR] Reconectado com sucesso ao backend!');
      setConnectionStatus('CONECTADO');
      setConnectionError(null);
    });

    connection.onclose(() => {
      console.log('[SignalR] Conexão encerrada.');
      setConnectionStatus('DESCONECTADO');
    });

    // ── Listeners de Eventos do Backend ────────────────────────────────────
    
    // Evento padrão da POC: ChairTurned { chairId, timestamp, source }
    connection.on('ChairTurned', (data) => {
      const chairId = Number(data.chairId);
      const source = data.source || 'SIGNALR_POC';
      console.log(`[SignalR Evento] ChairTurned recebido: Cadeira #${chairId}`);
      if (callbacksRef.current.onChairTurned) {
        callbacksRef.current.onChairTurned(chairId, source);
      }
    });

    // Evento retrocompatível do teste: ChairSupported { seatNumber, chairId }
    connection.on('ChairSupported', (data) => {
      const chairId = Number(data.chairId || data.seatNumber);
      console.log(`[SignalR Evento] ChairSupported recebido: Cadeira #${chairId}`);
      if (callbacksRef.current.onChairTurned) {
        callbacksRef.current.onChairTurned(chairId, 'SIGNALR_COMPAT');
      }
    });

    // Evento de reset global
    connection.on('ChairsReset', () => {
      console.log('[SignalR Evento] ChairsReset recebido.');
      if (callbacksRef.current.onChairsReset) {
        callbacksRef.current.onChairsReset();
      }
    });

    // ── Iniciar Conexão ────────────────────────────────────────────────────
    connection
      .start()
      .then(() => {
        console.log(`[SignalR] Conectado com sucesso em: ${hubUrl}`);
        setConnectionStatus('CONECTADO');
        setConnectionError(null);
      })
      .catch((err) => {
        console.warn(`[SignalR] Falha ao conectar em ${hubUrl}:`, err.message);
        setConnectionStatus('DESCONECTADO');
        setConnectionError(err.message);
      });

    return () => {
      connection.stop();
    };
  }, [backendUrl]);

  return {
    connectionStatus,
    connectionError,
    backendUrl,
    setBackendUrl: handleBackendUrlChange,
  };
}
