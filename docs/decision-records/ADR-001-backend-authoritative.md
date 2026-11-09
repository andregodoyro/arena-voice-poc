# ADR-001: Backend Authoritative (O Backend como Única Fonte da Verdade)

## Status
Aceito (Fase 1)

## Contexto
Na arquitetura do Arena Voice, existem múltiplas superfícies e clientes conectados simultaneamente:
1. Botões físicos de hardware (ESP32 via Wi-Fi enviando requisições HTTP).
2. Telões cênicos 3D (`/stage`) projetados para a plateia.
3. Cockpit operacional da mesa técnica (`/operator`).
4. Scripts de simulação e ferramentas de auditoria.

Se o frontend ou qualquer cliente individual pudesse decidir o estado das cadeiras (ex: girar uma cadeira por clique local ou calcular o placar independentemente), inconsistências graves ocorreriam entre o que o operador vê, o que o telão projeta e o que os jurados acionaram no hardware físico.

## Decisão
O backend em C# (.NET 10 Minimal API) é a **única fonte autoritativa de verdade** para o estado da arena:
- Nenhuma transição de estado é aplicada no frontend sem antes ter sido aceita, validada e persistida pelo backend.
- O acionamento de cadeiras (`POST /api/chair-press`) valida a faixa de 1 a 5 e atualiza a verdade do servidor.
- O reset da arena (`POST /api/reset`) zera as cadeiras no servidor e dispara o evento broadcast `ChairsReset`.
- O frontend atua como uma casca de visualização reativa (Display & Control Interface), sincronizando-se com o backend via snapshot HTTP e deltas SignalR.

## Consequências

### Positivas
- **Imunidade a dessincronização:** Telões múltiplos exibem exatamente o mesmo estado em tempo real.
- **Auditoria centralizada:** Logs de IP, hora exata e sequência de votos são centralizados no console e telemetria do backend.
- **Resiliência a reinicializações de interface:** Se um navegador for recarregado ou a aba for fechada e reaberta, o estado oficial é imediatamente recuperado do servidor.

### Negativas / Desafios
- Requer dependência de rede: o frontend não opera em modo desconectado (offline standalone) sem o backend ativo.
