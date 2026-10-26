# ADR-010: Strict HTTP Content-Type Negotiation & Interoperability (Negociação Estrita de Content-Type em APIs de Mutação)

## Status
Aceito (Fase 2, Auditoria do Milestone 2B)

## Contexto
Durante a homologação técnica do Milestone 2B, verificou-se uma discrepância de comportamento entre clientes HTTP:
- A suíte de testes em Node.js (`test-projects-api.cjs`) executava requisições `POST /api/projects` com êxito (`HTTP 201 Created`).
- Chamadas de teste realizadas via terminal PowerShell (`Invoke-RestMethod` / `Invoke-WebRequest`) retornavam `HTTP 400 Bad Request`, mesmo com um corpo aparentemente compatível com o DTO esperado.

A investigação comprovou que:
1. No PowerShell, ao enviar um objeto ou string via `-Body` sem especificar explicitamente `-ContentType`, o cliente envia por padrão o cabeçalho `Content-Type: application/x-www-form-urlencoded`.
2. As Minimal APIs do ASP.NET Core utilizam por padrão a convenção de deserialização JSON estrita para DTOs tipados nos parâmetros dos endpoints (`app.MapPost("/api/projects", (CreateProjectDto dto) => ...)`).
3. Ao receber um `Content-Type` diferente de `application/json`, o middleware de model binding do ASP.NET Core rejeita a requisição imediatamente antes de chamar o delegate da API, retornando `HTTP 400 Bad Request` com o erro de framework `"Failed to read parameter CreateProjectDto from request body."`

## Decisão
1. **Obrigatoriedade de `Content-Type: application/json`:**
   Todos os endpoints de mutação (`POST`, `PUT`) do Arena Voice exigem estritamente que a requisição forneça o cabeçalho:
   `Content-Type: application/json` (ou `application/json; charset=utf-8`).
2. **Rejeição Precoce de Form-UrlEncoded:**
   Não será habilitado suporte a `application/x-www-form-urlencoded` nem parsing manual de formulários, mantendo os contratos REST limpos e orientados a JSON estruturado.
3. **Padrão de Chamada em Scripts e Linha de Comando:**
   Qualquer ferramenta externa, script PowerShell ou chamada cURL deve obrigatoriamente especificar o tipo de conteúdo:
   - **PowerShell:**
     ```powershell
     Invoke-RestMethod -Uri "http://localhost:5000/api/projects" `
       -Method Post `
       -ContentType "application/json; charset=utf-8" `
       -Body ($payload | ConvertTo-Json)
     ```
   - **cURL:**
     ```bash
     curl -X POST http://localhost:5000/api/projects \
       -H "Content-Type: application/json" \
       -d '{"title":"...","pitchLeader":"...","track":"..."}'
     ```
   - **JavaScript / Fetch:**
     ```javascript
     fetch('/api/projects', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify(payload)
     });
     ```

## Consequências

### Positivas
- **Segurança e Rigor nos Contratos:** Prevenção de corrupção de tipos e dados malformados na deserialização.
- **Previsibilidade no Frontend:** O cliente de API central (`apiClient.js`) configurará automaticamente `Content-Type: application/json` em todas as requisições de escrita, eliminando erros silenciosos.
- **Diagnóstico Claro:** Estabelece uma regra canônica de integração para qualquer ferramenta ou desenvolvedor que consuma a API.

### Negativas / Desafios
- Desenvolvedores testando manualmente via terminal PowerShell devem lembrar de incluir `-ContentType "application/json"`.
