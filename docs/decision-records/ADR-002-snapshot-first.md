# ADR-002: Snapshot First Architecture (Hidratação Primária via REST e Deltas via SignalR)

## Status
Aceito (Fase 1)

## Contexto
Aplicações orientadas a WebSockets frequentemente enfrentam o problema da "conexão tardia" (late joiner): se um cliente se conecta após o início da dinâmica, ele perde os eventos históricos (`ChairTurned`) transmitidos antes de sua conexão, apresentando a arena vazia ou zerada.

Uma alternativa seria o Hub SignalR retransmitir todo o histórico de eventos para cada nova conexão no método `OnConnectedAsync`. No entanto, isso acopla o protocolo de streaming de eventos com responsabilidades de hidratação de estado inicial, aumentando a complexidade do handshake.

## Decisão
Adotou-se o padrão de **Sincronização Dupla com Primazia do Snapshot (Snapshot First)**:
1. **Hidratação Inicial (Pull):** No carregamento inicial da página (`App.jsx`), o cliente realiza obrigatoriamente um `GET /api/state` via REST para recuperar a fotografia completa do estado corrente (`chairs`, `activeCount`, `currentEvent`, `currentProject`).
2. **Atualização Contínua (Push):** Após hidratar o estado local, o cliente estabelece a conexão WebSocket com o SignalR Hub (`/hubs/arena-poc`) para escutar exclusivamente os eventos incrementais (`ChairTurned`, `ChairsReset`, `CurrentProjectChanged`, `EventBrandingUpdated`).
3. **Resync em Reconexão:** Sempre que o hook `useSignalR` detectar que a conexão WebSocket caiu e foi restabelecida (mudança em `reconnectVersion`), ele dispara novamente o `GET /api/state` para reconciliar quaisquer deltas ocorridos durante a desconexão.

## Consequências

### Positivas
- **Suporte Perfeito a Conexões Tardias:** Qualquer dispositivo que abrir o telão durante um pitch em andamento renderiza imediatamente as cadeiras viradas corretas.
- **Tolerância a Instabilidades de Wi-Fi:** Quedas temporárias de rede não corrompem o estado da interface.
- **Separação de Preocupações:** O SignalR transporta apenas mensagens de evento; o endpoint REST responde pela fotografia estática.

### Negativas / Desafios
- Requer coordenação no ciclo de vida dos componentes React (`useEffect` gerenciando cancelamento de requisições pendentes e listeners).
