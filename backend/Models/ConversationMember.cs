namespace backend.Models;

public class ConversationMember
{
    public Guid ConversationId { get; set; }

    public Conversation Conversation { get; set; } = null!;

    public string UserId { get; set; } = string.Empty;

    public DateTime JoinedAtUtc { get; set; } = DateTime.UtcNow;

    public DateTime? LastReadAtUtc { get; set; }
}