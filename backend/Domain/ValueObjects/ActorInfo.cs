using ArenaVoicePocBackend.Domain.Enums;

namespace ArenaVoicePocBackend.Domain.ValueObjects;

public record ActorInfo(
    ActorType Type,
    string? ActorId = null,
    string? ActorName = null
)
{
    public static ActorInfo Operator(string? actorId = null, string? name = "Mesa Técnica") =>
        new(ActorType.Operator, actorId, name);

    public static ActorInfo System(string? name = "Arena Voice System") =>
        new(ActorType.System, null, name);

    public static ActorInfo RecoveryEngine(string? name = "Crash Recovery Engine") =>
        new(ActorType.RecoveryEngine, null, name);

    public static ActorInfo Esp32(int chairId) =>
        new(ActorType.ESP32, $"esp32-chair-{chairId}", $"Botão Físico Cadeira {chairId}");

    public static ActorInfo VoiceStudio(string? name = "VoiceStudio Panel") =>
        new(ActorType.VoiceStudio, null, name);

    public static ActorInfo Scheduler(string? name = "Job Scheduler") =>
        new(ActorType.Scheduler, null, name);
}
