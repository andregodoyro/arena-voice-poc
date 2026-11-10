using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace ArenaVoicePocBackend.Persistence;

public class ArenaDbContextFactory : IDesignTimeDbContextFactory<ArenaDbContext>
{
    public ArenaDbContext CreateDbContext(string[] args)
    {
        var basePath = Directory.GetCurrentDirectory();
        
        // Localiza appsettings.json no diretório corrente ou em backend/
        var configPath = File.Exists(Path.Combine(basePath, "appsettings.json"))
            ? basePath
            : Path.Combine(basePath, "backend");

        var configuration = new ConfigurationBuilder()
            .SetBasePath(configPath)
            .AddJsonFile("appsettings.json", optional: true)
            .AddEnvironmentVariables()
            .Build();

        var connectionString = configuration.GetSection("ArenaPersistence")["ConnectionString"]
            ?? "Host=localhost;Port=5432;Database=arena_voice;Username=postgres;Password=postgres;";

        var optionsBuilder = new DbContextOptionsBuilder<ArenaDbContext>();
        optionsBuilder.UseNpgsql(connectionString);

        return new ArenaDbContext(optionsBuilder.Options);
    }
}
