namespace ArenaVoicePocBackend.Persistence.Options;

public sealed class ArenaPersistenceOptions
{
    public const string SectionName = "ArenaPersistence";

    public string StorageEngine { get; init; } = "postgres";

    public string ConnectionString { get; init; } = "Host=localhost;Port=5432;Database=arena_voice;Username=postgres;Password=postgres;";

    public int CommandTimeoutSeconds { get; init; } = 30;

    public int ConnectionTimeoutSeconds { get; init; } = 3;

    public bool EnableSensitiveDataLogging { get; init; } = false;
}
