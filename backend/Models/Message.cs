namespace backend.Models;

public class Message
{
    public int Id { get; set; }

    public int ConversationId { get; set; }

    public Conversation? Conversation { get; set; }

    public string SenderType { get; set; } = "";

    public string SenderId { get; set; } = "";

    public string SenderName { get; set; } = "";

    public string Text { get; set; } = "";

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}