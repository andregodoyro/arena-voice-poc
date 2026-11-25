using System.Security.Claims;
using ArenaVoicePocBackend.Domain.DTOs;
using ArenaVoicePocBackend.Domain.Enums;
using ArenaVoicePocBackend.Domain.ValueObjects;

namespace ArenaVoicePocBackend.Services;

public static class SoundLibraryEndpoints
{
    public static IEndpointRouteBuilder MapSoundLibraryEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/audio");

        group.MapGet("/library", async (
            bool? includeDisabled,
            ISoundLibraryService service,
            CancellationToken ct) =>
        {
            var items = await service.GetLibraryAsync(includeDisabled ?? true, ct);
            return Results.Ok(items);
        })
        .RequireAuthorization(EndpointSecurityExtensions.PolicyAuthenticatedAny);

        group.MapPost("/library", async (
            CreateSoundLibraryItemDto dto,
            HttpContext httpContext,
            ISoundLibraryService service,
            CancellationToken ct) =>
        {
            try
            {
                var actor = ResolveActor(httpContext);
                var created = await service.CreateItemAsync(dto, actor, ct);
                return Results.Created($"/api/audio/library/{created.Id}", created);
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Results.Conflict(new { error = ex.Message });
            }
        })
        .RequireAuthorization(EndpointSecurityExtensions.PolicyOperatorOrAdmin);

        group.MapPut("/library/{id:guid}", async (
            Guid id,
            UpdateSoundLibraryItemDto dto,
            HttpContext httpContext,
            ISoundLibraryService service,
            CancellationToken ct) =>
        {
            try
            {
                var actor = ResolveActor(httpContext);
                var updated = await service.UpdateItemAsync(id, dto, actor, ct);
                return updated is null
                    ? Results.NotFound(new { error = "Som não encontrado." })
                    : Results.Ok(updated);
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        })
        .RequireAuthorization(EndpointSecurityExtensions.PolicyOperatorOrAdmin);

        group.MapDelete("/library/{id:guid}", async (
            Guid id,
            HttpContext httpContext,
            ISoundLibraryService service,
            CancellationToken ct) =>
        {
            var actor = ResolveActor(httpContext);
            var (found, _, item) = await service.DeleteItemAsync(id, actor, ct);
            return !found
                ? Results.NotFound(new { error = "Som não encontrado." })
                : Results.Ok(new { message = "Som desativado com segurança.", item });
        })
        .RequireAuthorization(EndpointSecurityExtensions.PolicyAdminOnly);

        group.MapGet("/mappings", async (
            ISoundLibraryService service,
            CancellationToken ct) =>
        {
            var mappings = await service.GetMappingsAsync(ct);
            return Results.Ok(mappings);
        })
        .RequireAuthorization(EndpointSecurityExtensions.PolicyAuthenticatedAny);

        group.MapPut("/mappings", async (
            UpdateSoundEventMappingsRequest request,
            HttpContext httpContext,
            ISoundLibraryService service,
            CancellationToken ct) =>
        {
            try
            {
                var actor = ResolveActor(httpContext);
                var updated = await service.UpdateMappingsAsync(request, actor, ct);
                return Results.Ok(updated);
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Results.Conflict(new { error = ex.Message });
            }
        })
        .RequireAuthorization(EndpointSecurityExtensions.PolicyOperatorOrAdmin);

        return app;
    }

    private static ActorInfo ResolveActor(HttpContext httpContext)
    {
        var userId = httpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "unknown";
        var email = httpContext.User.FindFirst(ClaimTypes.Email)?.Value
            ?? httpContext.User.Identity?.Name
            ?? "unknown";

        return new ActorInfo(ActorType.Operator, userId, email);
    }
}
