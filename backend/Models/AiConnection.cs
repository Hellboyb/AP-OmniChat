namespace backend.Models;

public class AiConnection
{
    public int Id { get; set; }

    public string UserId { get; set; } = "";

    public string Provider { get; set; } = "";

    public string Status { get; set; } = "Not connected";

    // Encrypted API key.
    // Never returned to the frontend.
    public string ApiKeyProtected { get; set; } = "";

    public DateTime? ConnectedAtUtc { get; set; }

    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}