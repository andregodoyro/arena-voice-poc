using System.Text.Json.Serialization;

namespace ArenaVoicePocBackend.Domain.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum PitchStage
{
    Waiting = 0,
    PitchRunning = 1,
    QA = 2,
    VotingOpen = 3,
    VotingClosed = 4,
    Finished = 5
}
