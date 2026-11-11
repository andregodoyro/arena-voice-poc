using System.Text.Json.Serialization;

namespace ArenaVoicePocBackend.Domain.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ActorType
{
    Operator = 0,
    System = 1,
    RecoveryEngine = 2,
    ESP32 = 3,
    VoiceStudio = 4,
    Scheduler = 5
}
