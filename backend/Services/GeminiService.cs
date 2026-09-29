using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using backend.Models;

namespace backend.Services;

public class GeminiService : IGeminiService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<GeminiService> _logger;

    public GeminiService(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<GeminiService> logger)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<string> GenerateReplyAsync(
        AiReplyRequest request,
        CancellationToken cancellationToken = default)
    {
        var apiKey =
            _configuration["Gemini:ApiKey"]
            ?? Environment.GetEnvironmentVariable("GEMINI_API_KEY");

        if (string.IsNullOrWhiteSpace(apiKey))
        {
            throw new InvalidOperationException(
                "Gemini API key is not configured.");
        }

        var model =
            _configuration["Gemini:Model"]
            ?? "gemini-2.5-flash";

        var baseUrl =
            _configuration["Gemini:BaseUrl"]
            ?? "https://generativelanguage.googleapis.com/v1beta";

        var prompt = BuildPrompt(request);

        var endpoint =
            $"{baseUrl.TrimEnd('/')}/models/{Uri.EscapeDataString(model)}:generateContent?key={Uri.EscapeDataString(apiKey)}";

        var payload = new
        {
            contents = new[]
            {
                new
                {
                    role = "user",
                    parts = new[]
                    {
                        new
                        {
                            text = prompt
                        }
                    }
                }
            },
            generationConfig = new
            {
                temperature = 0.7,
                maxOutputTokens = 1000
            }
        };

        var json = JsonSerializer.Serialize(payload);

        using var content = new StringContent(
            json,
            Encoding.UTF8,
            "application/json");

        using var response = await _httpClient.PostAsync(
            endpoint,
            content,
            cancellationToken);

        var responseBody =
            await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning(
                "Gemini request failed with status {StatusCode}.",
                response.StatusCode);

            throw new HttpRequestException(
                $"Gemini API request failed with status {(int)response.StatusCode}.");
        }

        try
        {
            using var document =
                JsonDocument.Parse(responseBody);

            var candidates =
                document.RootElement
                    .GetProperty("candidates");

            if (candidates.GetArrayLength() == 0)
            {
                throw new InvalidOperationException(
                    "Gemini returned no candidates.");
            }

            var parts =
                candidates[0]
                    .GetProperty("content")
                    .GetProperty("parts");

            var builder = new StringBuilder();

            foreach (var part in parts.EnumerateArray())
            {
                if (part.TryGetProperty("text", out var text))
                {
                    builder.Append(text.GetString());
                }
            }

            var reply = builder.ToString().Trim();

            if (string.IsNullOrWhiteSpace(reply))
            {
                throw new InvalidOperationException(
                    "Gemini returned an empty response.");
            }

            return reply;
        }
        catch (JsonException)
        {
            throw new InvalidOperationException(
                "Gemini returned an invalid response.");
        }
    }

    private static string BuildPrompt(AiReplyRequest request)
    {
        var builder = new StringBuilder();

        builder.AppendLine(
            "You are the AI assistant inside AP-OmniChat.");

        builder.AppendLine(
            "Generate a helpful, accurate and professional response.");

        builder.AppendLine(
            "Never invent business information, prices, policies, availability, customer data, or facts that are not provided.");

        builder.AppendLine(
            "If the available information is insufficient, clearly ask for the missing information instead of guessing.");

        if (!string.IsNullOrWhiteSpace(request.SystemInstruction))
        {
            builder.AppendLine();
            builder.AppendLine("Additional instructions:");
            builder.AppendLine(request.SystemInstruction);
        }

        if (!string.IsNullOrWhiteSpace(request.Channel))
        {
            builder.AppendLine();
            builder.AppendLine($"Channel: {request.Channel}");
        }

        if (!string.IsNullOrWhiteSpace(request.CustomerName))
        {
            builder.AppendLine(
                $"Customer name: {request.CustomerName}");
        }

        if (!string.IsNullOrWhiteSpace(request.ConversationContext))
        {
            builder.AppendLine();
            builder.AppendLine("Conversation context:");
            builder.AppendLine(request.ConversationContext);
        }

        builder.AppendLine();
        builder.AppendLine("User message:");
        builder.AppendLine(request.Prompt);

        return builder.ToString();
    }
}