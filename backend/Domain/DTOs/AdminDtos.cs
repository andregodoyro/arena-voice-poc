using ArenaVoicePocBackend.Domain.Enums;

namespace ArenaVoicePocBackend.Domain.DTOs;

// ============================================================
// ADMIN USER MANAGEMENT DTOs — Milestone 5I
// ============================================================

/// <summary>Resposta de listagem de usuários para o painel administrativo.</summary>
public sealed record AdminUserDto(
    string Id,
    string Name,
    string Email,
    string Role,
    bool IsActive,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    DateTimeOffset? LastLoginAt
);

/// <summary>Payload para criação de um novo usuário pelo Admin.</summary>
public sealed record CreateUserDto(
    string Name,
    string Email,
    string Password,
    string Role
);

/// <summary>Payload para edição de um usuário existente pelo Admin.</summary>
public sealed record UpdateUserDto(
    string? Name,
    string? Email,
    string? Role,
    bool? IsActive
);

/// <summary>Payload para redefinição de senha pelo Admin.</summary>
public sealed record ResetPasswordDto(string NewPassword);

/// <summary>Resultado de operações administrativas de usuário.</summary>
public sealed record AdminUserOperationResult(
    bool Success,
    AdminUserDto? User = null,
    string? ErrorMessage = null,
    bool NotFound = false,
    bool Conflict = false,
    bool Forbidden = false
);
