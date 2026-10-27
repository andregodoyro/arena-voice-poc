import { useEffect, useState, useRef } from 'react';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';

/**
 * useSignalR — Hook dedicado para gerenciamento da conexão WebSocket/SignalR (Milestone 2C.5).
 * 
 * Unifica o transporte em tempo real do Arena Voice:
 * - Ciclo de vida: 'CONECTADO', 'RECONECTANDO', 'RESSINCRONIZANDO', 'DESCONECTADO'
 * - Eventos de Hardware/Cadeiras: ChairTurned, ChairSupported, ChairsReset
 * - Eventos de Gestão/Domínio: CurrentProjectChanged, EventBrandingUpdated
 * - Políticas de reconexão automática com backoff exponencial
 */
export function useSignalR({
  onChairTurned,
  onChairsReset,
  onCurrentProjectChanged,
  onEventBrandingUpdated,
  onReconnecting,
  onReconnected,
  onClose,
  initialBackendUrl,
} = {}) {
  const [backendUrl, setBackendUrl] = useState(() => {
    return (
      localStorage.getItem('arena_poc_backend_url') ||
      initialBackendUrl ||
      import.meta.env.VITE_BACKEND_URL ||
      'http://localhost:5000'
    );
  });
  const [connectionStatus, setConnectionStatus] = useState('DESCONECTADO');
  const [connectionError, setConnectionError] = useState(null);
  const [reconnectVersion, setReconnectVersion] = useState(0);

  const callbacksRef = useRef({
    onChairTurned,
    onChairsReset,
    onCurrentProjectChanged,
    onEventBrandingUpdated,
    onReconnecting,
    onReconnected,
    onClose,
  });

  callbacksRef.current = {
    onChairTurned,
    onChairsReset,
    onCurrentProjectChanged,
    onEventBrandingUpdated,
    onReconnecting,
    onReconnected,
    onClose,
  };

  const handleBackendUrlChange = (url) => {
    const cleaned = url.trim().replace(/\/+$/, '');
    setBackendUrl(cleaned);
    localStorage.setItem('arena_poc_backend_url', cleaned);
  };

  useEffect(() => {
    const hubUrl = `${backendUrl}/hubs/arena-poc`;

    let disposed = false;
    let reconnectTimer = null;

    const LONG_RETRY_DELAY = 5000;

    const connection = new HubConnectionBuilder()
      .withUrl(hubUrl)
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(LogLevel.Warning)
      .build();

    const startConnection = async () => {
      if (disposed) return;

      try {
        await connection.start();

        if (disposed) return;

        console.log(`[SignalR] Conectado com sucesso em: ${hubUrl}`);
        setConnectionStatus('CONECTADO');
        setConnectionError(null);
        setReconnectVersion((version) => version + 1);
      } catch (err) {
        if (disposed) return;

        console.warn(`[SignalR] Falha ao conectar em ${hubUrl}:`, err.message);

        setConnectionStatus('DESCONECTADO');
        setConnectionError(err.message);

        reconnectTimer = setTimeout(startConnection, LONG_RETRY_DELAY);
      }
    };

    // ── Tratamento do ciclo de vida da conexão ─────────────────────────────
    connection.onreconnecting((error) => {
      console.warn('[SignalR] Conexão perdida. Tentando reconectar...', error?.message);
      setConnectionStatus('RECONECTANDO');
      if (callbacksRef.current.onReconnecting) {
        callbacksRef.current.onReconnecting(error);
      }
    });

    connection.onreconnected(async (connectionId) => {
      console.log('[SignalR] Reconectado com sucesso ao backend! Id:', connectionId);
      setConnectionStatus('RESSINCRONIZANDO');
      setConnectionError(null);
      setReconnectVersion((version) => version + 1);

      if (callbacksRef.current.onReconnected) {
        try {
          await callbacksRef.current.onReconnected(connectionId);
        } catch (err) {
          console.error('[SignalR] Erro ao executar callback pós-reconexão:', err);
        }
      }

      if (!disposed) {
        setConnectionStatus('CONECTADO');
      }
    });

    connection.onclose((error) => {
      if (disposed) return;

      console.warn('[SignalR] Conexão fechada. Iniciando tentativas periódicas...', error?.message);
      setConnectionStatus('DESCONECTADO');

      if (callbacksRef.current.onClose) {
        callbacksRef.current.onClose(error);
      }

      reconnectTimer = setTimeout(startConnection, LONG_RETRY_DELAY);
    });

    // ── Listeners de Eventos do Backend ────────────────────────────────────

    // 1. Acionamento de Cadeira (Físico / HTTP)
    connection.on('ChairTurned', (data) => {
      const chairId = Number(data.chairId);
      const source = data.source || 'SIGNALR_POC';
      console.log(`[SignalR Evento] ChairTurned recebido: Cadeira #${chairId}`);
      if (callbacksRef.current.onChairTurned) {
        callbacksRef.current.onChairTurned(chairId, source, data);
      }
    });

    // 2. Retrocompatibilidade: ChairSupported
    connection.on('ChairSupported', (data) => {
      const chairId = Number(data.chairId || data.seatNumber);
      console.log(`[SignalR Evento] ChairSupported recebido: Cadeira #${chairId}`);
      if (callbacksRef.current.onChairTurned) {
        callbacksRef.current.onChairTurned(chairId, 'SIGNALR_COMPAT', data);
      }
    });

    // 3. Reset Global das Cadeiras
    connection.on('ChairsReset', () => {
      console.log('[SignalR Evento] ChairsReset recebido.');
      if (callbacksRef.current.onChairsReset) {
        callbacksRef.current.onChairsReset();
      }
    });

    // 4. Promoção / Troca de Projeto Ativo no Palco (Milestone 2B / 2C.5)
    connection.on('CurrentProjectChanged', (data) => {
      console.log('[SignalR Evento] CurrentProjectChanged recebido:', data?.project?.title);
      if (callbacksRef.current.onCurrentProjectChanged) {
        callbacksRef.current.onCurrentProjectChanged(data);
      }
    });

    // 5. Atualização de Branding e Identidade do Evento (Milestone 2B / 2C.5)
    connection.on('EventBrandingUpdated', (data) => {
      console.log('[SignalR Evento] EventBrandingUpdated recebido para o evento:', data?.eventId);
      if (callbacksRef.current.onEventBrandingUpdated) {
        callbacksRef.current.onEventBrandingUpdated(data);
      }
    });

    // ── Iniciar Conexão ────────────────────────────────────────────────────
    startConnection();

    return () => {
      disposed = true;

      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }

      connection.stop();
    };
  }, [backendUrl]);

  return {
    connectionStatus,
    connectionError,
    backendUrl,
    reconnectVersion,
    setBackendUrl: handleBackendUrlChange,
  };
}

export default useSignalR;
