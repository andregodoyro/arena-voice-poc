using System.Diagnostics;
using System.Globalization;
using System.Text.RegularExpressions;
using System.Threading.Channels;
using ArenaVoicePocBackend.Configuration;
using ArenaVoicePocBackend.Domain;
using ArenaVoicePocBackend.Domain.Enums;
using ArenaVoicePocBackend.DTOs;
using ArenaVoicePocBackend.Persistence.Options;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Npgsql;

namespace ArenaVoicePocBackend.Services;

public class BackupOrchestrator : IBackupOrchestrator
{
    private readonly Channel<BackupRequest> _channel;
    private readonly BackupOptions _backupOptions;
    private readonly ArenaPersistenceOptions _persistenceOptions;
    private readonly IAuditEventPublisher _auditPublisher;
    private readonly ILogger<BackupOrchestrator> _logger;

    private static readonly Regex RoundRegex = new(@"^round_(\d+)_", RegexOptions.Compiled | RegexOptions.IgnoreCase);
    private static readonly Regex TimestampRegex = new(@"_(\d{8}T\d{6}Z)\.pgdump$", RegexOptions.Compiled | RegexOptions.IgnoreCase);

    public BackupOrchestrator(
        Channel<BackupRequest> channel,
        IOptions<BackupOptions> backupOptions,
        IOptions<ArenaPersistenceOptions> persistenceOptions,
        IAuditEventPublisher auditPublisher,
        ILogger<BackupOrchestrator> logger)
    {
        _channel = channel;
        _backupOptions = backupOptions.Value;
        _persistenceOptions = persistenceOptions.Value;
        _auditPublisher = auditPublisher;
        _logger = logger;
    }

    public ValueTask EnqueueBackupAsync(BackupRequest request, CancellationToken ct = default)
    {
        _logger.LogInformation("📥 Enfileirando solicitação de backup {BackupId} (Trigger: {Trigger}).", request.BackupId, request.TriggerType);
        return _channel.Writer.WriteAsync(request, ct);
    }

    public async Task<BackupExecutionResult> ExecuteBackupAsync(BackupRequest request, CancellationToken ct = default)
    {
        var sw = Stopwatch.StartNew();
        var timestamp = request.RequestedAt.ToUniversalTime();
        var tsFormatted = timestamp.ToString("yyyyMMddTHHmmssZ", CultureInfo.InvariantCulture);

        string fileName;
        if (request.TriggerType.Equals("Manual", StringComparison.OrdinalIgnoreCase))
        {
            fileName = $"manual_{tsFormatted}.pgdump";
        }
        else if (request.RoundNumber.HasValue)
        {
            fileName = $"round_{request.RoundNumber.Value}_{tsFormatted}.pgdump";
        }
        else
        {
            fileName = $"{request.TriggerType.ToLowerInvariant()}_{tsFormatted}.pgdump";
        }

        var backupDir = ResolveBackupDirectory();
        Directory.CreateDirectory(backupDir);

        var targetFilePath = Path.Combine(backupDir, fileName);
        var pgDumpExe = ResolvePgDumpExecutable();

        _logger.LogInformation("🚀 Iniciando pg_dump para backup {BackupId}. Arquivo alvo: {TargetFilePath} usando {PgDumpExe}",
            request.BackupId, targetFilePath, pgDumpExe);

        try
        {
            var csb = new NpgsqlConnectionStringBuilder(_persistenceOptions.ConnectionString);
            var host = string.IsNullOrWhiteSpace(csb.Host) ? "localhost" : csb.Host;
            var port = csb.Port > 0 ? csb.Port : 5432;
            var database = string.IsNullOrWhiteSpace(csb.Database) ? "arena_voice" : csb.Database;
            var username = string.IsNullOrWhiteSpace(csb.Username) ? "postgres" : csb.Username;
            var password = csb.Password ?? string.Empty;

            var psi = new ProcessStartInfo
            {
                FileName = pgDumpExe,
                Arguments = $"-h {host} -p {port} -U {username} -Fc -d {database} -f \"{targetFilePath}\"",
                RedirectStandardError = true,
                RedirectStandardOutput = false,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            if (!string.IsNullOrEmpty(password))
            {
                psi.EnvironmentVariables["PGPASSWORD"] = password;
            }

            using var process = new Process { StartInfo = psi };
            using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            timeoutCts.CancelAfter(TimeSpan.FromSeconds(_backupOptions.CommandTimeoutSeconds));

            process.Start();

            var errorTask = process.StandardError.ReadToEndAsync(timeoutCts.Token);
            await process.WaitForExitAsync(timeoutCts.Token);
            var standardError = await errorTask;

            sw.Stop();

            if (process.ExitCode == 0 && File.Exists(targetFilePath))
            {
                var fileInfo = new FileInfo(targetFilePath);
                _logger.LogInformation("✅ Backup {BackupId} concluído com sucesso em {DurationMs}ms. Tamanho: {Bytes} bytes.",
                    request.BackupId, sw.ElapsedMilliseconds, fileInfo.Length);

                _auditPublisher.Publish(new AuditEventRecord(
                    EventType: "BackupSucceeded",
                    AggregateType: "System",
                    AggregateId: request.BackupId,
                    ActorType: ActorType.System,
                    ActorName: "BackupOrchestrator",
                    SourceIp: request.SourceIp,
                    Payload: new
                    {
                        backupId = request.BackupId,
                        fileName,
                        filePath = targetFilePath,
                        sizeBytes = fileInfo.Length,
                        durationMs = sw.ElapsedMilliseconds,
                        trigger = request.TriggerType,
                        roundNumber = request.RoundNumber
                    }
                ));

                return new BackupExecutionResult(
                    Success: true,
                    BackupId: request.BackupId,
                    FileName: fileName,
                    FilePath: targetFilePath,
                    SizeBytes: fileInfo.Length,
                    Duration: sw.Elapsed
                );
            }
            else
            {
                var errorMsg = $"pg_dump finalizou com código {process.ExitCode}. Erro: {standardError}";
                _logger.LogError("❌ Falha no pg_dump para backup {BackupId}: {Error}", request.BackupId, errorMsg);

                _auditPublisher.Publish(new AuditEventRecord(
                    EventType: "BackupFailed",
                    AggregateType: "System",
                    AggregateId: request.BackupId,
                    ActorType: ActorType.System,
                    ActorName: "BackupOrchestrator",
                    Success: false,
                    ErrorMessage: errorMsg,
                    SourceIp: request.SourceIp,
                    Payload: new
                    {
                        backupId = request.BackupId,
                        error = errorMsg,
                        exitCode = process.ExitCode,
                        trigger = request.TriggerType
                    }
                ));

                return new BackupExecutionResult(
                    Success: false,
                    BackupId: request.BackupId,
                    Duration: sw.Elapsed,
                    ErrorMessage: errorMsg
                );
            }
        }
        catch (Exception ex)
        {
            sw.Stop();
            _logger.LogError(ex, "❌ Exceção ao executar backup {BackupId}.", request.BackupId);

            _auditPublisher.Publish(new AuditEventRecord(
                EventType: "BackupFailed",
                AggregateType: "System",
                AggregateId: request.BackupId,
                ActorType: ActorType.System,
                ActorName: "BackupOrchestrator",
                Success: false,
                ErrorMessage: ex.Message,
                SourceIp: request.SourceIp,
                Payload: new
                {
                    backupId = request.BackupId,
                    error = ex.Message,
                    trigger = request.TriggerType
                }
            ));

            return new BackupExecutionResult(
                Success: false,
                BackupId: request.BackupId,
                Duration: sw.Elapsed,
                ErrorMessage: ex.Message
            );
        }
    }

    public IReadOnlyList<BackupItemDto> GetAvailableBackups()
    {
        var backupDir = ResolveBackupDirectory();
        if (!Directory.Exists(backupDir))
        {
            return Array.Empty<BackupItemDto>();
        }

        var directoryInfo = new DirectoryInfo(backupDir);
        var files = directoryInfo.GetFiles("*.pgdump");

        var list = new List<BackupItemDto>(files.Length);

        foreach (var file in files)
        {
            var name = file.Name;
            var trigger = "Manual";
            int? roundNumber = null;

            if (name.StartsWith("manual_", StringComparison.OrdinalIgnoreCase))
            {
                trigger = "Manual";
            }
            else if (name.StartsWith("round_", StringComparison.OrdinalIgnoreCase))
            {
                trigger = "RoundArchived";
                var roundMatch = RoundRegex.Match(name);
                if (roundMatch.Success && int.TryParse(roundMatch.Groups[1].Value, out var rn))
                {
                    roundNumber = rn;
                }
            }
            else
            {
                var idx = name.IndexOf('_');
                if (idx > 0)
                {
                    trigger = name[..idx];
                }
            }

            var createdAt = file.CreationTimeUtc;
            var tsMatch = TimestampRegex.Match(name);
            if (tsMatch.Success && DateTimeOffset.TryParseExact(tsMatch.Groups[1].Value, "yyyyMMddTHHmmssZ", CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var parsedDto))
            {
                createdAt = parsedDto.UtcDateTime;
            }

            var status = file.Length > 0 ? "Completed" : "InProgress";

            list.Add(new BackupItemDto(
                FileName: name,
                SizeBytes: file.Length,
                SizeFormatted: FormatSize(file.Length),
                CreatedAt: createdAt,
                Trigger: trigger,
                Status: status,
                RoundNumber: roundNumber
            ));
        }

        // Ordenação decrescente: backups mais recentes primeiro
        return list.OrderByDescending(b => b.CreatedAt).ToList();
    }

    private string ResolveBackupDirectory()
    {
        if (Path.IsPathRooted(_backupOptions.BackupDirectory))
        {
            return _backupOptions.BackupDirectory;
        }

        var currentDir = Directory.GetCurrentDirectory();
        if (Path.GetFileName(currentDir).Equals("backend", StringComparison.OrdinalIgnoreCase))
        {
            return Path.GetFullPath(Path.Combine(currentDir, "..", _backupOptions.BackupDirectory));
        }

        return Path.GetFullPath(Path.Combine(currentDir, _backupOptions.BackupDirectory));
    }

    private string ResolvePgDumpExecutable()
    {
        if (!string.IsNullOrWhiteSpace(_backupOptions.PgDumpPath) && File.Exists(_backupOptions.PgDumpPath))
        {
            return _backupOptions.PgDumpPath;
        }

        var envPgDump = Environment.GetEnvironmentVariable("PG_DUMP_EXE") ?? Environment.GetEnvironmentVariable("PGDUMP_PATH");
        if (!string.IsNullOrWhiteSpace(envPgDump) && File.Exists(envPgDump))
        {
            return envPgDump;
        }

        var isWindows = OperatingSystem.IsWindows();
        var exeName = isWindows ? "pg_dump.exe" : "pg_dump";

        // Procura relativa ao diretório corrente e diretórios pais (estrutura do projeto e devtools)
        var searchBaseDirs = new List<string>
        {
            Directory.GetCurrentDirectory(),
            Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), "..")),
            Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), "..", "..")),
            AppContext.BaseDirectory,
            Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", ".."))
        };

        foreach (var baseDir in searchBaseDirs)
        {
            var candidate = Path.GetFullPath(Path.Combine(baseDir, "devtools", "portable", "pgsql", "bin", exeName));
            if (File.Exists(candidate))
            {
                return candidate;
            }
        }

        // Fallback: assume executável disponível no PATH (padrão Linux / Cloud / Docker)
        return exeName;
    }

    private static string FormatSize(long bytes)
    {
        if (bytes >= 1024 * 1024)
        {
            return $"{bytes / (1024.0 * 1024.0):F2} MB";
        }
        if (bytes >= 1024)
        {
            return $"{bytes / 1024.0:F1} KB";
        }
        return $"{bytes} B";
    }
}
