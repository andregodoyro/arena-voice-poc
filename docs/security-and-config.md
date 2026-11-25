# Arena Voice POC — Segurança & Gestão de Configurações

Documento enxuto de referência operacional para os controles de segurança implementados na **Security Quick Wins Sprint** e para a gestão de variáveis de ambiente entre **Desenvolvimento Local**, **Render (Backend/PostgreSQL)** e **Vercel (Frontend)**.

---

## 1. Melhorias Implementadas na Security Quick Wins Sprint

| Área | Problema Original | Solução Implementada | Arquivos Alterados | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Secrets & Startup Guard** | Fallback de `JWT_SECRET` e senha padrão `ArenaAdmin@2026` aceitos silenciosamente em qualquer ambiente; `.env` não carregado no boot local. | Criado `DotEnvLoader` (sem dependências externas, sem sobrescrever variáveis do SO) e guarda rígida em `ASPNETCORE_ENVIRONMENT=Production` / `RENDER` que aborta o startup se `JWT_SECRET` for ausente/fallback ou se `ARENA_ADMIN_PASSWORD` não for definida. | [DotEnvLoader.cs](file:///c:/Users/ANDREROC/Documents/arena-voice-poc/backend/Configuration/DotEnvLoader.cs), [AuthService.cs](file:///c:/Users/ANDREROC/Documents/arena-voice-poc/backend/Services/AuthService.cs), [Program.cs](file:///c:/Users/ANDREROC/Documents/arena-voice-poc/backend/Program.cs) | **Validado** |
| **ESP32 / Hardware Auth** | `RequireDeviceKey = false` permitia acionamento anônimo em `/api/chair-press` e `/api/support` quando `ARENA_DEVICE_API_KEY` estava vazia. | `AuthOptions.RequireDeviceKey` alterado para `true` por padrão; endpoints de hardware agora exigem `X-Device-Key` válida ou JWT `Operator`/`Admin`. | [AuthOptions.cs](file:///c:/Users/ANDREROC/Documents/arena-voice-poc/backend/Configuration/AuthOptions.cs) | **Validado** |
| **Upload Seguro (XSS SVG)** | `.svg` permitido com validação parcial apenas nos primeiros 4 KB (risco de Stored XSS na mesma origem). | Removido `.svg` da lista de formatos aceitos (`jpg, jpeg, png, webp, mp4, webm, mp3, wav, ogg, m4a`) e adicionado `X-Content-Type-Options: nosniff` em `/uploads`. | [FileUploadValidator.cs](file:///c:/Users/ANDREROC/Documents/arena-voice-poc/backend/Services/FileUploadValidator.cs), [Program.cs](file:///c:/Users/ANDREROC/Documents/arena-voice-poc/backend/Program.cs) | **Validado** |
| **CORS & Security Headers** | `*.vercel.app` e `localhost` liberados mesmo em produção; ausência de headers defensivos. | Em `Production`, CORS aceita apenas origens explícitas (`CORS_ALLOWED_ORIGINS` / `FRONTEND_URL`, salvo se `CORS_ALLOW_VERCEL_PREVIEW=true`). Adicionados `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` e `Permissions-Policy`. | [Program.cs](file:///c:/Users/ANDREROC/Documents/arena-voice-poc/backend/Program.cs) | **Validado** |
| **Tratamento Global de Erros** | Exceções não tratadas em produção sem handler explícito JSON. | Adicionado `UseExceptionHandler` em produção retornando `{ error: "Erro interno no servidor." }` sem stack traces. | [Program.cs](file:///c:/Users/ANDREROC/Documents/arena-voice-poc/backend/Program.cs) | **Implementado** |
| **Gestão de `.env` e Templates** | Templates sem variáveis de segurança (`JWT_SECRET`, `ARENA_DEVICE_API_KEY`, `ARENA_ADMIN_PASSWORD`) e sem template no frontend. | Atualizados `.env.example`, `render.yaml` e criado `frontend/.env.example` separando configs públicas (`VITE_*`) de secrets privados. | [.env.example](file:///c:/Users/ANDREROC/Documents/arena-voice-poc/.env.example), [frontend/.env.example](file:///c:/Users/ANDREROC/Documents/arena-voice-poc/frontend/.env.example), [render.yaml](file:///c:/Users/ANDREROC/Documents/arena-voice-poc/render.yaml) | **Validado** |

---

## 2. Gestão de Variáveis de Ambiente por Ambiente

> **Regra de Ouro:** Arquivos `.env` e `.env.local` **nunca** devem ser versionados no Git (já protegidos pelo `.gitignore`). Nunca coloque secrets em variáveis prefixadas com `VITE_`, pois o Vite as incorpora ao bundle público do navegador.

### Desenvolvimento Local
1. Copie `.env.example` para `.env` na raiz do repositório (opcional — sem `.env`, o backend usa defaults de dev local).
2. Se precisar customizar a URL do backend no frontend, copie `frontend/.env.example` para `frontend/.env.local`.
3. Inicie o PostgreSQL, depois `dotnet run` em `backend/` e `vite` em `frontend/`.

### Render (Backend .NET 10 + PostgreSQL)
Cadastrar em **Environment Variables** no serviço Web da Render (definido em [render.yaml](file:///c:/Users/ANDREROC/Documents/arena-voice-poc/render.yaml)):
- `ASPNETCORE_ENVIRONMENT=Production`
- `ARENA_STORAGE_ENGINE=postgres`
- `DATABASE_URL` *(Internal Database URL do Render PostgreSQL)*
- `JWT_SECRET` *(obrigatório, >= 32 caracteres aleatórios — nunca reutilizar o fallback local)*
- `ARENA_ADMIN_PASSWORD` *(obrigatório, senha forte diferente de `ArenaAdmin@2026`)*
- `ARENA_DEVICE_API_KEY` *(obrigatório para autenticar os ESP32)*
- `CORS_ALLOWED_ORIGINS` *(URL exata do frontend na Vercel, ex.: `https://arena-voice-poc.vercel.app`)*
- `UPLOADS_DIR=/app/uploads`

### Vercel (Frontend React 19 + Vite)
Cadastrar em **Project Settings → Environment Variables** (separando *Preview* e *Production*):
- `VITE_BACKEND_URL` *(URL pública do serviço na Render, ex.: `https://arena-voice-backend.onrender.com`)*
- `VITE_SIGNALR_URL` *(ex.: `https://arena-voice-backend.onrender.com/hubs/arena-poc`)*
- **Atenção:** Alterações em variáveis `VITE_*` na Vercel exigem **redeploy** do frontend para surtir efeito no bundle.

---

## 3. Plano Prioritário: PostgreSQL Role Dedicado (`arena_app`) e RLS Real

Atualmente, a aplicação conecta ao PostgreSQL com `Username=postgres` (`SUPERUSER`), que ignora políticas RLS por padrão e executa migrations no startup (`DatabaseStartupValidator.ValidateAndMigrate`). Para eliminar o uso de `SUPERUSER` em runtime sem quebrar migrations:

1. **Separar conexão de manutenção vs runtime:** adicionar `MIGRATION_CONNECTION_STRING` (usada apenas no `ValidateAndMigrate`) e `CONNECTION_STRING` (usada pelo `ArenaDbContext` em runtime).
2. **Criar role `arena_app` sem privilégios elevados:**
   ```sql
   CREATE ROLE arena_app WITH LOGIN PASSWORD '<SENHA_FORTE>' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
   GRANT USAGE ON SCHEMA public TO arena_app;
   GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO arena_app;
   REVOKE UPDATE, DELETE ON audit_events FROM arena_app;
   GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO arena_app;
   ```
3. **Validar:** rodar a suíte completa de regressão com `CONNECTION_STRING` apontando para `arena_app` e confirmar que `UPDATE/DELETE` em `audit_events` falham no banco.

---

## 4. Backlog de Segurança Priorizado (Pós-Sprint)

1. **[Alto — Pós-POC]:** Migrar connection string de runtime de `postgres` para `arena_app` (`NOSUPERUSER NOBYPASSRLS`).
2. **[Médio]:** Reduzir expiração do Access Token JWT (de `480` min para `15–30` min, aproveitando o refresh automático já implementado) e/ou adicionar revogação de token no logout (`tokenVersion`).
3. **[Médio]:** Migrar Refresh Token do `localStorage` para cookie `HttpOnly; Secure; SameSite=Strict` + proteção CSRF associada.
4. **[Médio]:** Chaves individuais por dispositivo ESP32 (`chairId` 1..5) ou assinatura HMAC com *timestamp/nonce* contra *replay attack* + HTTPS na rede do palco.
5. **[Baixo]:** Rate limiting distribuído (se houver múltiplas instâncias) e monitoramento/alertas estruturados (SIEM/observabilidade).
