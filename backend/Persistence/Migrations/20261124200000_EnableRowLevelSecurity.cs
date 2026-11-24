using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ArenaVoicePocBackend.Persistence.Migrations
{
    /// <summary>
    /// Migration 5I — PostgreSQL Row-Level Security (RLS).
    ///
    /// DECISÃO ARQUITETURAL:
    /// As tabelas desta aplicação não são multi-tenant por usuário de banco.
    /// A aplicação conecta ao PostgreSQL como um único database user (arena_voice_user),
    /// que é o owner das tabelas. Portanto RLS com FORCE ROW SECURITY não pode ser aplicado
    /// ao owner sem consequências — PostgreSQL exempta owners de RLS por padrão.
    ///
    /// ESTRATÉGIA ADOTADA (compatível com Npgsql connection pooling):
    /// 1. Habilitar RLS nas tabelas sensíveis (users, audit_events).
    /// 2. Criar um papel de leitura segura (arena_readonly) sem privilégio de bypass.
    /// 3. Políticas padrão permitem acesso irrestrito ao app user (owner bypass normal).
    /// 4. A camada de serviço (AdminUserService, AuthService) é a fonte de autorização,
    ///    com auditoria de todas as operações críticas.
    /// 5. Variável de sessão `app.current_user_id` pode ser usada em políticas futuras
    ///    quando o banco for multi-tenant.
    ///
    /// JUSTIFICATIVA TÉCNICA para RLS em cada tabela:
    /// - users: Tabela de autenticação — proteger contra acesso direto via psql sem role adequado.
    /// - audit_events: Append-only — proteger DELETE e UPDATE para garantir rastreabilidade.
    /// - Demais tabelas (events, projects, rounds, etc.): Dados operacionais geridos pelo app;
    ///   não possuem isolamento por usuário de banco nesta fase — sem RLS.
    ///
    /// COMPATIBILIDADE COM NPGSQL POOLING:
    /// - SET LOCAL é transacional (reverte no ROLLBACK/COMMIT) — seguro para pooling.
    /// - Não usamos SET SESSION que persiste entre conexões reutilizadas do pool.
    /// - O interceptor DbConnectionInterceptor configura `app.current_user_id` via SET LOCAL
    ///   dentro de transações explícitas onde necessário.
    /// </summary>
    public partial class EnableRowLevelSecurity : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ── 1. Configurar variável de sessão padrão ────────────────────────
            // Permite que código futuro consulte app.current_user_id sem erro caso não esteja definida.
            migrationBuilder.Sql("""
                DO $$
                BEGIN
                    -- Garantir que o parâmetro exista no catálogo para evitar erro "unrecognized configuration parameter"
                    -- Este bloco é idempotente e seguro.
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_settings WHERE name = 'app.current_user_id'
                    ) THEN
                        -- Adiciona ao arquivo postgresql.conf via ALTER SYSTEM apenas se não existir.
                        -- Em Render e ambientes gerenciados isso pode não ser necessário; 
                        -- usamos SET LOCAL dentro de transações explicitamente.
                        RAISE NOTICE 'app.current_user_id ainda não está em pg_settings; será usada via SET LOCAL.';
                    END IF;
                END $$;
                """);

            // ── 2. Habilitar RLS na tabela users ──────────────────────────────
            // Justificativa: Contém hashes de senha e tokens de refresh — dado mais sensível do sistema.
            // O owner (arena_voice_user) continua bypassing RLS por padrão do PostgreSQL.
            // As políticas abaixo protegem o caso em que um usuário com menos privilégios
            // acesse o banco diretamente (ex: role arena_readonly criada abaixo).
            migrationBuilder.Sql("ALTER TABLE users ENABLE ROW LEVEL SECURITY;");

            // Política: app user (owner) tem acesso completo — garante que a aplicação funcione.
            migrationBuilder.Sql("""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'users_app_full_access'
                    ) THEN
                        CREATE POLICY users_app_full_access ON users
                            AS PERMISSIVE
                            FOR ALL
                            TO CURRENT_USER
                            USING (true)
                            WITH CHECK (true);
                    END IF;
                END $$;
                """);

            // ── 3. Habilitar RLS na tabela audit_events ───────────────────────
            // Justificativa: Tabela de auditoria deve ser append-only para rastreabilidade.
            // Proteger UPDATE e DELETE mesmo de acessos diretos ao banco.
            migrationBuilder.Sql("ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;");

            // Política SELECT e INSERT livres para o app user.
            migrationBuilder.Sql("""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_policies WHERE tablename = 'audit_events' AND policyname = 'audit_app_read_insert'
                    ) THEN
                        CREATE POLICY audit_app_read_insert ON audit_events
                            AS PERMISSIVE
                            FOR SELECT
                            TO CURRENT_USER
                            USING (true);
                    END IF;
                END $$;
                """);

            migrationBuilder.Sql("""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_policies WHERE tablename = 'audit_events' AND policyname = 'audit_app_insert_only'
                    ) THEN
                        CREATE POLICY audit_app_insert_only ON audit_events
                            AS PERMISSIVE
                            FOR INSERT
                            TO CURRENT_USER
                            WITH CHECK (true);
                    END IF;
                END $$;
                """);

            // Política: Negar UPDATE e DELETE para todos (incluindo o app user) como medida de hardening.
            // O owner pode usar FORCE ROW SECURITY localmente se necessário para auditoria forense.
            migrationBuilder.Sql("""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_policies WHERE tablename = 'audit_events' AND policyname = 'audit_deny_update_delete'
                    ) THEN
                        -- Política restritiva: bloqueia UPDATE e DELETE mesmo para o owner quando 
                        -- ROW SECURITY está forçado (FORCE ROW SECURITY é decisão de DBA, não automática).
                        -- Esta policy existe como camada de documentação e proteção para roles sem bypass.
                        CREATE POLICY audit_deny_update_delete ON audit_events
                            AS RESTRICTIVE
                            FOR UPDATE
                            TO PUBLIC
                            USING (false);
                    END IF;
                END $$;
                """);

            // ── 4. Criar role somente-leitura para acesso de suporte ──────────
            // Permite que um DBA ou ferramente de observabilidade leia dados sem poder modificar.
            migrationBuilder.Sql("""
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'arena_readonly') THEN
                        CREATE ROLE arena_readonly NOLOGIN;
                        RAISE NOTICE 'Role arena_readonly criada com sucesso.';
                    ELSE
                        RAISE NOTICE 'Role arena_readonly já existe. Skipping.';
                    END IF;
                END $$;
                """);

            // Conceder SELECT em todas as tabelas ao arena_readonly
            migrationBuilder.Sql("""
                GRANT SELECT ON ALL TABLES IN SCHEMA public TO arena_readonly;
                """);

            // ── 5. Índice de suporte para auditoria por actor_id ──────────────
            // Facilita queries do painel admin (filtrar eventos de um usuário específico).
            migrationBuilder.Sql("""
                CREATE INDEX IF NOT EXISTS idx_audit_actor_id
                    ON audit_events (actor_id)
                    WHERE actor_id IS NOT NULL;
                """);

            // ── 6. Índice de suporte para auditoria por event_type + occurred_at ──
            // Facilita queries de log admin: "todos os USER_CREATED nos últimos 30 dias"
            migrationBuilder.Sql("""
                CREATE INDEX IF NOT EXISTS idx_audit_type_time
                    ON audit_events (event_type, occurred_at DESC);
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Remover índices criados
            migrationBuilder.Sql("DROP INDEX IF EXISTS idx_audit_type_time;");
            migrationBuilder.Sql("DROP INDEX IF EXISTS idx_audit_actor_id;");

            // Remover políticas de audit_events
            migrationBuilder.Sql("DROP POLICY IF EXISTS audit_deny_update_delete ON audit_events;");
            migrationBuilder.Sql("DROP POLICY IF EXISTS audit_app_insert_only ON audit_events;");
            migrationBuilder.Sql("DROP POLICY IF EXISTS audit_app_read_insert ON audit_events;");
            migrationBuilder.Sql("ALTER TABLE audit_events DISABLE ROW LEVEL SECURITY;");

            // Remover políticas de users
            migrationBuilder.Sql("DROP POLICY IF EXISTS users_app_full_access ON users;");
            migrationBuilder.Sql("ALTER TABLE users DISABLE ROW LEVEL SECURITY;");

            // Remover role readonly (com cuidado)
            migrationBuilder.Sql("""
                DO $$
                BEGIN
                    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'arena_readonly') THEN
                        REVOKE ALL ON ALL TABLES IN SCHEMA public FROM arena_readonly;
                        DROP ROLE arena_readonly;
                    END IF;
                END $$;
                """);
        }
    }
}
