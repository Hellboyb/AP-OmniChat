namespace backend.Models;

public class Connection
{
    public int Id { get; set; }

    public string UserId { get; set; } = "";

    public string ChannelId { get; set; } = "";

    public string ChannelName { get; set; } = "";

    public string Status { get; set; } = "Not connected";

    public DateTime? ConnectedAtUtc { get; set; }

    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;

    // Encrypted JSON containing the user's provider configuration.
    // Never returned to the frontend.
    public string CredentialsProtected { get; set; } = "";
}