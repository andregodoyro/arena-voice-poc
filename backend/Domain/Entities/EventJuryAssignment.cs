namespace ArenaVoicePocBackend.Domain.Entities;

public class EventJuryAssignment
{
    public string EventId { get; set; } = string.Empty;
    public int ChairId { get; set; }
    public string JudgeId { get; set; } = string.Empty;
    public Judge? Judge { get; set; }
    public DateTimeOffset AssignedAt { get; set; } = DateTimeOffset.UtcNow;
}
