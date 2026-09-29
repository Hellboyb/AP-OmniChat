namespace backend.Models;

public class AiReplyRequest
{
    public string Prompt { get; set; } = "";

    public string? Channel { get; set; }

    public string? CustomerName { get; set; }

    public string? ConversationContext { get; set; }

    public string? SystemInstruction { get; set; }
}