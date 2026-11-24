using ArenaVoicePocBackend.Domain.DTOs;
using ArenaVoicePocBackend.Domain.Entities;
using ArenaVoicePocBackend.Domain.Enums;

namespace ArenaVoicePocBackend.Services;

/// <summary>
/// Motor oficial e determinístico de classificação consolidada por evento (Milestone 6A).
/// Fonte única da verdade no backend para ranking e futura cerimônia de pódio (6B).
/// </summary>
public static class EventRankingEngine
{
    public static EventResultsResponseDto ComputeResults(
        Event evt,
        IEnumerable<Round> eventRounds,
        IEnumerable<Project> eventProjects)
    {
        var projectMediaMap = eventProjects
            .Where(p => !string.IsNullOrWhiteSpace(p.Id))
            .ToDictionary(p => p.Id, p => p.Media, StringComparer.OrdinalIgnoreCase);

        // Em caso de múltiplas rodadas para o mesmo projeto, considera a rodada arquivada mais recente
        var latestRoundsByProject = eventRounds
            .Where(r => !string.IsNullOrWhiteSpace(r.ProjectId))
            .GroupBy(r => r.ProjectId, StringComparer.OrdinalIgnoreCase)
            .Select(g => g.OrderByDescending(r => r.ArchivedAt).First())
            .ToList();

        var ordered = latestRoundsByProject
            .OrderBy(r => GetResultPriority(r.Result))
            .ThenBy(r => GetApprovalModePriority(r.ApprovalMode))
            .ThenByDescending(r => r.TurnedChairCount)
            .ThenBy(r => r.EffectiveDurationSeconds > 0 ? r.EffectiveDurationSeconds : double.MaxValue)
            .ThenBy(r => r.ArchivedAt)
            .ToList();

        var rankings = new List<EventRankedResultItemDto>(ordered.Count);
        for (int i = 0; i < ordered.Count; i++)
        {
            var r = ordered[i];
            projectMediaMap.TryGetValue(r.ProjectId, out var media);

            rankings.Add(new EventRankedResultItemDto(
                Rank: i + 1,
                RoundId: r.Id,
                ProjectId: r.ProjectId,
                ProjectTitle: r.ProjectTitle,
                PitchLeader: r.PitchLeader,
                Track: r.Track,
                TurnedChairCount: r.TurnedChairCount,
                TotalChairs: r.TotalChairs > 0 ? r.TotalChairs : 5,
                TurnedChairs: r.TurnedChairs.ToList(),
                Result: r.Result.ToString(),
                ApprovalMode: r.ApprovalMode.ToString(),
                EffectiveDurationSeconds: Math.Round(r.EffectiveDurationSeconds, 2),
                ArchivedAt: r.ArchivedAt,
                Media: media
            ));
        }

        return new EventResultsResponseDto(
            EventId: evt.Id,
            EventTitle: evt.Title,
            EventStatus: evt.Status.ToString(),
            TotalEvaluatedProjects: rankings.Count,
            ComputedAt: DateTimeOffset.UtcNow,
            Rankings: rankings
        );
    }

    private static int GetResultPriority(RoundResult result) => result switch
    {
        RoundResult.Approved => 0,
        RoundResult.Inconclusive => 1,
        RoundResult.Rejected => 2,
        _ => 3
    };

    private static int GetApprovalModePriority(RoundApprovalMode mode) => mode switch
    {
        RoundApprovalMode.Unanimous => 0,
        RoundApprovalMode.Majority => 1,
        RoundApprovalMode.Minority => 2,
        RoundApprovalMode.None => 3,
        _ => 4
    };
}
