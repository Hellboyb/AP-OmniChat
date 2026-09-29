namespace backend.Models;

public class MyChatMessage
{
    public int Id { get; set; }

    public string SenderUserId { get; set; } = "";

    public string RecipientUserId { get; set; } = "";

    public string Text { get; set; } = "";

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}