using ArenaVoicePocBackend.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace ArenaVoicePocBackend.Persistence;

public class ArenaDbContext : DbContext
{
    public ArenaDbContext(DbContextOptions<ArenaDbContext> options)
        : base(options)
    {
    }

    public DbSet<Event> Events => Set<Event>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<Judge> Judges => Set<Judge>();
    public DbSet<EventJuryAssignment> EventJuryAssignments => Set<EventJuryAssignment>();
    public DbSet<Round> RoundHistoryEntries => Set<Round>();
    public DbSet<ActiveSessionState> ActiveSessionState => Set<ActiveSessionState>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Aplica todas as configurações de IEntityTypeConfiguration<T> registradas no assembly
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ArenaDbContext).Assembly);
    }
}
