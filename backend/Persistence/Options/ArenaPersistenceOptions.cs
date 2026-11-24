namespace ArenaVoicePocBackend.Persistence.Options;

public sealed class ArenaPersistenceOptions
{
    public const string SectionName = "ArenaPersistence";

    public string StorageEngine { get; set; } = "postgres";

    public string ConnectionString { get; set; } = "Host=localhost;Port=5432;Database=arena_voice;Username=postgres;Password=postgres;";

    public int CommandTimeoutSeconds { get; set; } = 30;

    public int ConnectionTimeoutSeconds { get; set; } = 3;

    public bool EnableSensitiveDataLogging { get; set; } = false;
}
