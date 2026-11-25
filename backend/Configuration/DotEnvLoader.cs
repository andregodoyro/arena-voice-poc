namespace ArenaVoicePocBackend.Configuration;

/// <summary>
/// Carregador leve de arquivo .env para desenvolvimento local (sem dependências externas).
/// Variáveis já definidas no ambiente do sistema operacional (Render, Docker, PowerShell) têm precedência.
/// </summary>
public static class DotEnvLoader
{
    public static void LoadIfPresent()
    {
        var candidates = new[]
        {
            Path.Combine(Directory.GetCurrentDirectory(), ".env"),
            Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), "..", ".env"))
        };

        foreach (var path in candidates)
        {
            if (!File.Exists(path)) continue;

            foreach (var rawLine in File.ReadAllLines(path))
            {
                var line = rawLine.Trim();
                if (string.IsNullOrEmpty(line) || line.StartsWith('#'))
                    continue;

                var eqIndex = line.IndexOf('=');
                if (eqIndex <= 0)
                    continue;

                var key = line[..eqIndex].Trim();
                var value = line[(eqIndex + 1)..].Trim();

                if ((value.StartsWith('"') && value.EndsWith('"') && value.Length >= 2) ||
                    (value.StartsWith('\'') && value.EndsWith('\'') && value.Length >= 2))
                {
                    value = value[1..^1];
                }

                if (string.IsNullOrWhiteSpace(key))
                    continue;

                // Nunca sobrescreve variáveis explicitamente definidas no ambiente/container
                if (Environment.GetEnvironmentVariable(key) is null)
                {
                    Environment.SetEnvironmentVariable(key, value);
                }
            }

            // Carrega apenas o primeiro .env encontrado (mais próximo do CWD tem prioridade)
            break;
        }
    }
}
