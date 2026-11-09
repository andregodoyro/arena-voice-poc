# ADR-004: Rich SignalR Payloads (Envio de Objetos Completos em Eventos em Tempo Real)

## Status
Aceito (Fase 2, Milestone 2B)

## Contexto
Ao disparar eventos de alteração de estado no SignalR (`CurrentProjectChanged`, `EventBrandingUpdated`), existiam duas alternativas arquiteturais para o formato da mensagem transmitida:
1. **Thin Payload (Apenas IDs):** Transmitir apenas identificadores (`{ "projectId": "proj-02" }`), forçando os clientes a executarem uma chamada HTTP `GET /api/projects/proj-02` para obter os dados.
2. **Rich Payload (Objeto Completo):** Transmitir o objeto completo do projeto ou do branding diretamente no corpo do evento.

## Decisão
Adotou-se a transmissão de **Rich Payloads (Objetos Completos)** em todos os eventos SignalR de negócio da Fase 2:
- `CurrentProjectChanged`:
  ```json
  {
    "project": {
      "id": "proj-ecolog-02",
      "title": "EcoLog",
      "pitchLeader": "Lucas Rocha",
      "track": "Sustentabilidade",
      "status": 1,
      "media": { "logoUrl": "...", "coverImageUrl": "..." },
      "presentationStartedAt": "2026-10-26T14:50:00Z"
    },
    "previousProjectId": "proj-neurosync-01",
    "timestamp": "2026-10-26T14:50:00Z"
  }
  ```
- `EventBrandingUpdated`:
  ```json
  {
    "eventId": "evt-demo-day-2026",
    "branding": {
      "primaryColor": "#b7094c",
      "secondaryColor": "#ffb703",
      "logoUrl": "...",
      "tagline": "..."
    },
    "timestamp": "2026-10-26T14:51:00Z"
  }
  ```

## Consequências

### Positivas
- **Zero Latência no Telão:** O telão `/stage` e o cockpit `/operator` atualizam o título da startup, o nome do líder e as cores dos neons instantaneamente no frame em que o frame WebSocket é deserializado, sem atraso de round-trip HTTP.
- **Eliminação do Efeito *Thundering Herd*:** Se 10 telões e mesas estiverem conectados, uma mudança de pitch não dispara 10 requisições `GET /api/projects/{id}` simultâneas contra o servidor.
- **Auto-suficiência dos Clientes:** Interfaces puramente contemplativas não precisam instanciar clientes HTTP complexos para reagir a deltas.

### Negativas / Desafios
- Ligeiro aumento no tráfego de dados por mensagem (~1 KB), valor completamente desprezível para redes locais e conexões de eventos.
