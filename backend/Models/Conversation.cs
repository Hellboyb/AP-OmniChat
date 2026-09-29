namespace backend.Models;

public class Conversation
{
    public int Id { get; set; }

    public string OwnerUserId { get; set; } = "";

    public string Channel { get; set; } = "";

    public string Title { get; set; } = "";

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;

    public ICollection<Message> Messages { get; set; } = new List<Message>();
}