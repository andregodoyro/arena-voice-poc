namespace ArenaVoicePocBackend.Domain.Entities;

public class Judge
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Company { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string AvatarUrl { get; set; } = string.Empty;
    public string? Bio { get; set; }
    public string[]? Expertise { get; set; }
    public string? SocialUrl { get; set; }
    public bool IsActive { get; set; } = true;
    public string? Email { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
