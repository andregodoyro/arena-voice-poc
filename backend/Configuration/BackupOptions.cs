namespace ArenaVoicePocBackend.Configuration;

public class BackupOptions
{
    public const string SectionName = "ArenaBackup";

    /// <summary>
    /// Diretório onde os arquivos .pgdump são armazenados (relativo à raiz da aplicação ou absoluto).
    /// </summary>
    public string BackupDirectory { get; set; } = "backups";

    /// <summary>
    /// Caminho explícito para o executável pg_dump (ou pg_dump.exe).
    /// Se vazio, o sistema resolve automaticamente procurando em locais conhecidos do devtools/portable ou no PATH.
    /// </summary>
    public string PgDumpPath { get; set; } = string.Empty;

    /// <summary>
    /// Caminho explícito para o executável pg_restore (opcional, para validação ou inspeção).
    /// </summary>
    public string PgRestorePath { get; set; } = string.Empty;

    /// <summary>
    /// Formato do dump do PostgreSQL: "custom" (-Fc) é o padrão binário comprimido recomendado.
    /// </summary>
    public string OutputFormat { get; set; } = "custom";

    /// <summary>
    /// Quantidade máxima de backups retidos no diretório (para gerenciamento futuro de rotação).
    /// </summary>
    public int MaxBackupsToRetain { get; set; } = 50;

    /// <summary>
    /// Tempo máximo em segundos para conclusão do processo pg_dump antes de timeout.
    /// </summary>
    public int CommandTimeoutSeconds { get; set; } = 60;
}
