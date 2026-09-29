using backend.Models;

namespace backend.Services;

public interface IGeminiService
{
    Task<string> GenerateReplyAsync(
        AiReplyRequest request,
        CancellationToken cancellationToken = default);
}