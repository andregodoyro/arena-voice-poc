using ArenaVoicePocBackend.Domain.DTOs;

namespace ArenaVoicePocBackend.Services;

/// <summary>
/// Contrato do serviço administrativo de gerenciamento de usuários (Milestone 5I.1).
/// Todas as operações são restritas a usuários com role Admin.
/// </summary>
public interface IAdminUserService
{
    /// <summary>Lista todos os usuários do sistema.</summary>
    Task<IReadOnlyList<AdminUserDto>> GetAllUsersAsync(CancellationToken ct = default);

    /// <summary>Retorna os detalhes de um usuário específico por ID.</summary>
    Task<AdminUserDto?> GetUserByIdAsync(string userId, CancellationToken ct = default);

    /// <summary>Cria um novo usuário com as informações fornecidas.</summary>
    Task<AdminUserOperationResult> CreateUserAsync(CreateUserDto dto, string actorId, string actorName, CancellationToken ct = default);

    /// <summary>Atualiza nome, e-mail, role ou status de ativação de um usuário.</summary>
    Task<AdminUserOperationResult> UpdateUserAsync(string userId, UpdateUserDto dto, string actorId, string actorName, CancellationToken ct = default);

    /// <summary>Ativa a conta de um usuário desativado.</summary>
    Task<AdminUserOperationResult> ActivateUserAsync(string userId, string actorId, string actorName, CancellationToken ct = default);

    /// <summary>Desativa a conta de um usuário (soft delete).</summary>
    Task<AdminUserOperationResult> DeactivateUserAsync(string userId, string actorId, string actorName, CancellationToken ct = default);

    /// <summary>Redefine a senha de um usuário pelo painel administrativo.</summary>
    Task<AdminUserOperationResult> ResetPasswordAsync(string userId, string newPassword, string actorId, string actorName, CancellationToken ct = default);
}
