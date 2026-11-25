namespace ArenaVoicePocBackend.Configuration;

/// <summary>
/// Opções de configuração para Autenticação JWT, Seed Inicial e Autenticação de Hardware ESP32 (Milestone 5H).
/// </summary>
public sealed class AuthOptions
{
    public const string SectionName = "ArenaAuth";

    /// <summary>
    /// Chave simétrica HMAC-SHA256 (>= 32 caracteres). Sobrescrevível via env JWT_SECRET ou ArenaAuth__JwtSecret.
    /// </summary>
    public string JwtSecret { get; set; } = string.Empty;

    public string Issuer { get; set; } = "ArenaVoice.Api";

    public string Audience { get; set; } = "ArenaVoice.Clients";

    /// <summary>
    /// Validade padrão do Access Token (480 min = 8h para suportar eventos completos sem queda).
    /// </summary>
    public int AccessTokenExpirationMinutes { get; set; } = 480;

    /// <summary>
    /// Validade do Refresh Token em dias.
    /// </summary>
    public int RefreshTokenExpirationDays { get; set; } = 7;

    /// <summary>
    /// Chave estática dedicada aos microcontroladores ESP32 (header X-Device-Key).
    /// </summary>
    public string DeviceApiKey { get; set; } = string.Empty;

    /// <summary>
    /// Por segurança, exige X-Device-Key ou JWT Operator/Admin nas rotas de hardware por padrão.
    /// </summary>
    public bool RequireDeviceKey { get; set; } = true;

    /// <summary>
    /// Credenciais opcionais para seed idempotente do usuário Administrador inicial.
    /// </summary>
    public string SeedAdminName { get; set; } = "Administrador Arena";
    public string SeedAdminEmail { get; set; } = "admin@arenavoice.local";
    public string SeedAdminPassword { get; set; } = "ArenaAdmin@2026";
}
