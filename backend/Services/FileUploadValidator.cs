using System.Text;

namespace ArenaVoicePocBackend.Services;

public sealed record FileUploadValidationResult(bool IsValid, string? ErrorMessage = null, string Category = "unknown");

/// <summary>
/// Validador seguro de uploads (extensão, tamanho e assinatura binária / magic bytes) — Milestone 5H.4.
/// Previne envio de executáveis ou scripts disfarçados de mídia/áudio.
/// </summary>
public static class FileUploadValidator
{
    private static readonly string[] AllowedImages = [".jpg", ".jpeg", ".png", ".webp", ".svg"];
    private static readonly string[] AllowedVideos = [".mp4", ".webm"];
    private static readonly string[] AllowedAudio = [".mp3", ".wav", ".ogg", ".m4a"];

    private const long MaxImageBytes = 20L * 1024 * 1024;
    private const long MaxAudioBytes = 25L * 1024 * 1024;
    private const long MaxVideoBytes = 100L * 1024 * 1024;

    public static async Task<FileUploadValidationResult> ValidateAsync(IFormFile? file, CancellationToken cancellationToken = default)
    {
        if (file == null || file.Length == 0)
        {
            return new FileUploadValidationResult(false, "Nenhum arquivo enviado.");
        }

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        string category;
        long maxBytes;
        string limitLabel;

        if (AllowedImages.Contains(ext))
        {
            category = "image";
            maxBytes = MaxImageBytes;
            limitLabel = "20MB";
        }
        else if (AllowedAudio.Contains(ext))
        {
            category = "audio";
            maxBytes = MaxAudioBytes;
            limitLabel = "25MB";
        }
        else if (AllowedVideos.Contains(ext))
        {
            category = "video";
            maxBytes = MaxVideoBytes;
            limitLabel = "100MB";
        }
        else
        {
            return new FileUploadValidationResult(false, $"Formato '{ext}' não suportado. Formatos aceitos: JPG, JPEG, PNG, WEBP, SVG, MP3, WAV, OGG, M4A, MP4, WEBM.");
        }

        if (file.Length > maxBytes)
        {
            return new FileUploadValidationResult(false, $"O arquivo excede o limite máximo de {limitLabel} para a categoria '{category}'.");
        }

        // Validação de magic bytes / conteúdo inicial
        var headerLen = ext == ".svg" ? (int)Math.Min(file.Length, 4096) : (int)Math.Min(file.Length, 16);
        var header = new byte[headerLen];

        await using var stream = file.OpenReadStream();
        var bytesRead = await stream.ReadAsync(header.AsMemory(0, headerLen), cancellationToken);

        if (bytesRead < 3)
        {
            return new FileUploadValidationResult(false, "Arquivo vazio ou corrompido (assinatura binária insuficiente).");
        }

        if (!MatchesSignature(ext, header.AsSpan(0, bytesRead)))
        {
            return new FileUploadValidationResult(false, $"Conteúdo binário incompatível com a extensão '{ext}'. Upload rejeitado por segurança.");
        }

        return new FileUploadValidationResult(true, null, category);
    }

    private static bool MatchesSignature(string ext, ReadOnlySpan<byte> bytes)
    {
        return ext switch
        {
            ".jpg" or ".jpeg" => bytes.Length >= 3 && bytes[0] == 0xFF && bytes[1] == 0xD8 && bytes[2] == 0xFF,
            ".png" => bytes.Length >= 8 && bytes[0] == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47,
            ".webp" => bytes.Length >= 12 &&
                       bytes[0] == (byte)'R' && bytes[1] == (byte)'I' && bytes[2] == (byte)'F' && bytes[3] == (byte)'F' &&
                       bytes[8] == (byte)'W' && bytes[9] == (byte)'E' && bytes[10] == (byte)'B' && bytes[11] == (byte)'P',
            ".mp4" or ".m4a" => bytes.Length >= 8 &&
                       bytes[4] == (byte)'f' && bytes[5] == (byte)'t' && bytes[6] == (byte)'y' && bytes[7] == (byte)'p',
            ".webm" => bytes.Length >= 4 && bytes[0] == 0x1A && bytes[1] == 0x45 && bytes[2] == 0xDF && bytes[3] == 0xA3,
            ".wav" => bytes.Length >= 12 &&
                       bytes[0] == (byte)'R' && bytes[1] == (byte)'I' && bytes[2] == (byte)'F' && bytes[3] == (byte)'F' &&
                       bytes[8] == (byte)'W' && bytes[9] == (byte)'A' && bytes[10] == (byte)'V' && bytes[11] == (byte)'E',
            ".ogg" => bytes.Length >= 4 && bytes[0] == (byte)'O' && bytes[1] == (byte)'g' && bytes[2] == (byte)'g' && bytes[3] == (byte)'S',
            ".mp3" => (bytes.Length >= 3 && bytes[0] == (byte)'I' && bytes[1] == (byte)'D' && bytes[2] == (byte)'3') ||
                      (bytes.Length >= 2 && bytes[0] == 0xFF && (bytes[1] & 0xE0) == 0xE0),
            ".svg" => ValidateSvgHeader(bytes),
            _ => false
        };
    }

    private static bool ValidateSvgHeader(ReadOnlySpan<byte> bytes)
    {
        var text = Encoding.UTF8.GetString(bytes).TrimStart('\uFEFF', ' ', '\t', '\r', '\n');
        if (!text.Contains("<svg", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }
        // Rejeita vetores óbvios de XSS embutidos no cabeçalho do SVG
        if (text.Contains("<script", StringComparison.OrdinalIgnoreCase) ||
            text.Contains("javascript:", StringComparison.OrdinalIgnoreCase) ||
            text.Contains("onload=", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }
        return true;
    }
}
