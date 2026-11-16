using ArenaVoicePocBackend.Persistence.Options;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Npgsql;
using System.Net.Sockets;

namespace ArenaVoicePocBackend.Persistence.Startup;

public static class DatabaseStartupValidator
{
    public static void ValidateAndMigrate(IServiceProvider serviceProvider, ILogger logger)
    {
        var options = serviceProvider.GetRequiredService<IOptions<ArenaPersistenceOptions>>().Value;

        if (string.Equals(options.StorageEngine, "memory", StringComparison.OrdinalIgnoreCase))
        {
            logger.LogInformation("ℹ️ ArenaPersistence: Operando em modo de memória volátil (ARENA_STORAGE=memory). Migrações PostgreSQL ignoradas.");
            return;
        }

        logger.LogInformation("🔄 ArenaPersistence: Conectando ao PostgreSQL Portable ({ConnectionString})...", MaskConnectionString(options.ConnectionString));

        var npgsqlBuilder = new NpgsqlConnectionStringBuilder(options.ConnectionString);
        var host = npgsqlBuilder.Host ?? "localhost";
        var port = npgsqlBuilder.Port > 0 ? npgsqlBuilder.Port : 5432;

        // 1. Verificação de prontidão de rede/porta (timeout rápido e sem travamentos)
        try
        {
            using var tcpClient = new TcpClient();
            var connectTask = tcpClient.ConnectAsync(host, port);
            if (!connectTask.Wait(TimeSpan.FromSeconds(options.ConnectionTimeoutSeconds)))
            {
                PrintStartupFailureBanner(logger, host, port, "Timeout ao tentar estabelecer conexão TCP com o PostgreSQL Portable.");
                Environment.Exit(1);
            }
        }
        catch (Exception ex)
        {
            PrintStartupFailureBanner(logger, host, port, ex.Message);
            Environment.Exit(1);
        }

        // 2. Conectividade direta do EF Core e aplicação atômica de migrações
        using var scope = serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ArenaDbContext>();

        try
        {
            if (!db.Database.CanConnect())
            {
                PrintStartupFailureBanner(logger, host, port, "O banco de dados não aceitou a autenticação ou a base de dados informada não existe.");
                Environment.Exit(1);
            }

            logger.LogInformation("🔍 Verificando migrações pendentes no banco de dados...");
            var pendingMigrations = db.Database.GetPendingMigrations().ToList();

            if (pendingMigrations.Count > 0)
            {
                logger.LogInformation("🚀 Aplicando {Count} migração(ões) pendente(s): {Migrations}", pendingMigrations.Count, string.Join(", ", pendingMigrations));
                db.Database.Migrate();
                logger.LogInformation("✅ Migrações aplicadas com sucesso! Tabela __EFMigrationsHistory atualizada.");
            }
            else
            {
                logger.LogInformation("✅ Schema do PostgreSQL já está 100% atualizado. Nenhuma migração pendente.");
            }
        }
        catch (Exception ex)
        {
            logger.LogCritical(ex, "❌ Falha crítica ao executar db.Database.Migrate() no PostgreSQL.");
            throw;
        }
    }

    private static void PrintStartupFailureBanner(ILogger logger, string host, int port, string reason)
    {
        var banner = $"""

================================================================================
❌ FALHA CRÍTICA DE INICIALIZAÇÃO — POSTGRESQL PORTABLE INDISPONÍVEL
================================================================================
Não foi possível conectar ao cluster PostgreSQL em {host}:{port}.
Motivo da falha: {reason}

AÇÕES NECESSÁRIAS:
1. Certifique-se de que o PostgreSQL Portable está ativo no terminal:
   .\devtools\portable\pgsql\bin\pg_ctl.exe -D .\devtools\portable\pgsql\data start

2. Ou utilize o script de inicialização unificada:
   .\start-arena.bat

3. Caso deseje executar a Arena em modo estritamente volátil (sem banco):
   Defina a variável de ambiente: ARENA_STORAGE=memory
================================================================================
""";
        Console.ForegroundColor = ConsoleColor.Red;
        Console.WriteLine(banner);
        Console.ResetColor();
        logger.LogCritical("PostgreSQL Portable offline em {Host}:{Port}. Backend encerrado preventivamente.", host, port);
    }

    private static string MaskConnectionString(string connectionString)
    {
        try
        {
            var b = new NpgsqlConnectionStringBuilder(connectionString);
            if (!string.IsNullOrEmpty(b.Password)) b.Password = "******";
            return b.ConnectionString;
        }
        catch
        {
            return "Connection string format invalid";
        }
    }
}
