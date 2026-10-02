using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using backend.Data;
using backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Authorize]
[Route("api/ai-connections")]
public class AiConnectionsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IDataProtector _protector;

    private static readonly string[] SupportedProviders =
    {
        "gemini",
        "openai"
    };

    public AiConnectionsController(
        AppDbContext db,
        IHttpClientFactory httpClientFactory,
        IDataProtectionProvider protectionProvider)
    {
        _db = db;
        _httpClientFactory = httpClientFactory;

        _protector = protectionProvider.CreateProtector(
            "AP-OmniChat.AiCredentials.v1");
    }

    // GET: /api/ai-connections
    [HttpGet]
    public async Task<IActionResult> Get(
        CancellationToken cancellationToken)
    {
        var userId = GetUserId();

        var connections = await _db.AiConnections
            .AsNoTracking()
            .Where(x => x.UserId == userId)
            .Select(x => new
            {
                x.Provider,
                x.Status,
                x.ConnectedAtUtc,
                x.UpdatedAtUtc
            })
            .ToListAsync(cancellationToken);

        return Ok(new
        {
            connections
        });
    }

    // POST: /api/ai-connections/connect
    [HttpPost("connect")]
    public async Task<IActionResult> Connect(
        [FromBody] AiConnectRequest request,
        CancellationToken cancellationToken)
    {
        if (request == null)
        {
            return BadRequest(new
            {
                message = "AI connection data is required."
            });
        }

        var provider =
            NormalizeProvider(request.Provider);

        var apiKey =
            request.ApiKey?.Trim() ?? "";

        if (!SupportedProviders.Contains(provider))
        {
            return BadRequest(new
            {
                message =
                    "Unsupported AI provider. Supported providers: Gemini and OpenAI."
            });
        }

        if (string.IsNullOrWhiteSpace(apiKey))
        {
            return BadRequest(new
            {
                message = "AI API key is required."
            });
        }

        try
        {
            var verification =
                await VerifyProviderAsync(
                    provider,
                    apiKey,
                    cancellationToken);

            if (!verification.Success)
            {
                return BadRequest(new
                {
                    provider,
                    status = "Not connected",
                    message = verification.Message
                });
            }

            var userId = GetUserId();

            var connection =
                await _db.AiConnections
                    .FirstOrDefaultAsync(
                        x =>
                            x.UserId == userId &&
                            x.Provider == provider,
                        cancellationToken);

            var protectedApiKey =
                _protector.Protect(apiKey);

            var now = DateTime.UtcNow;

            if (connection == null)
            {
                connection = new AiConnection
                {
                    UserId = userId,
                    Provider = provider,
                    Status = "Connected",
                    ConnectedAtUtc = now,
                    UpdatedAtUtc = now,
                    ApiKeyProtected = protectedApiKey
                };

                _db.AiConnections.Add(connection);
            }
            else
            {
                connection.Status = "Connected";
                connection.ConnectedAtUtc =
                    connection.ConnectedAtUtc ?? now;
                connection.UpdatedAtUtc = now;
                connection.ApiKeyProtected =
                    protectedApiKey;
            }

            await _db.SaveChangesAsync(cancellationToken);

            return Ok(new
            {
                provider,
                status = "Connected",
                message =
                    $"{GetProviderName(provider)} API was successfully verified and connected."
            });
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception ex)
        {
            return StatusCode(
                StatusCodes.Status502BadGateway,
                new
                {
                    provider,
                    status = "Not connected",
                    message =
                        $"AI provider verification failed: {ex.Message}"
                });
        }
    }

    // POST: /api/ai-connections/{provider}/disconnect
    [HttpPost("{provider}/disconnect")]
    public async Task<IActionResult> Disconnect(
        string provider,
        CancellationToken cancellationToken)
    {
        provider =
            NormalizeProvider(provider);

        if (!SupportedProviders.Contains(provider))
        {
            return BadRequest(new
            {
                message = "Unsupported AI provider."
            });
        }

        var userId = GetUserId();

        var connection =
            await _db.AiConnections
                .FirstOrDefaultAsync(
                    x =>
                        x.UserId == userId &&
                        x.Provider == provider,
                    cancellationToken);

        if (connection != null)
        {
            connection.Status = "Not connected";
            connection.ConnectedAtUtc = null;
            connection.UpdatedAtUtc = DateTime.UtcNow;

            // Remove the protected key completely.
            connection.ApiKeyProtected = "";

            await _db.SaveChangesAsync(cancellationToken);
        }

        return Ok(new
        {
            provider,
            status = "Not connected",
            message =
                $"{GetProviderName(provider)} has been disconnected."
        });
    }

    private async Task<VerificationResult>
        VerifyProviderAsync(
            string provider,
            string apiKey,
            CancellationToken cancellationToken)
    {
        return provider switch
        {
            "gemini" =>
                await VerifyGeminiAsync(
                    apiKey,
                    cancellationToken),

            "openai" =>
                await VerifyOpenAiAsync(
                    apiKey,
                    cancellationToken),

            _ =>
                VerificationResult.Fail(
                    "Unsupported AI provider.")
        };
    }

    private async Task<VerificationResult>
        VerifyGeminiAsync(
            string apiKey,
            CancellationToken cancellationToken)
    {
        var client =
            _httpClientFactory.CreateClient();

        var url =
            "https://generativelanguage.googleapis.com/v1beta/models";

        using var request =
            new HttpRequestMessage(
                HttpMethod.Get,
                url);

        request.Headers.TryAddWithoutValidation(
            "x-goog-api-key",
            apiKey);

        using var response =
            await client.SendAsync(
                request,
                cancellationToken);

        var body =
            await response.Content.ReadAsStringAsync(
                cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            return VerificationResult.Fail(
                ExtractProviderError(
                    body,
                    "Gemini rejected the supplied API key."));
        }

        try
        {
            using var json =
                JsonDocument.Parse(body);

            if (!json.RootElement.TryGetProperty(
                    "models",
                    out _))
            {
                return VerificationResult.Fail(
                    "Gemini returned an unexpected verification response.");
            }

            return VerificationResult.Ok();
        }
        catch
        {
            return VerificationResult.Fail(
                "Gemini returned an unexpected verification response.");
        }
    }

    private async Task<VerificationResult>
        VerifyOpenAiAsync(
            string apiKey,
            CancellationToken cancellationToken)
    {
        var client =
            _httpClientFactory.CreateClient();

        using var request =
            new HttpRequestMessage(
                HttpMethod.Get,
                "https://api.openai.com/v1/models");

        request.Headers.Authorization =
            new AuthenticationHeaderValue(
                "Bearer",
                apiKey);

        using var response =
            await client.SendAsync(
                request,
                cancellationToken);

        var body =
            await response.Content.ReadAsStringAsync(
                cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            return VerificationResult.Fail(
                ExtractProviderError(
                    body,
                    "OpenAI rejected the supplied API key."));
        }

        try
        {
            using var json =
                JsonDocument.Parse(body);

            if (!json.RootElement.TryGetProperty(
                    "data",
                    out _))
            {
                return VerificationResult.Fail(
                    "OpenAI returned an unexpected verification response.");
            }

            return VerificationResult.Ok();
        }
        catch
        {
            return VerificationResult.Fail(
                "OpenAI returned an unexpected verification response.");
        }
    }

    private string GetUserId()
    {
        return User.FindFirstValue(
                   ClaimTypes.NameIdentifier)
               ?? throw new UnauthorizedAccessException();
    }

    private static string NormalizeProvider(
        string? provider)
    {
        return (provider ?? "")
            .Trim()
            .ToLowerInvariant();
    }

    private static string GetProviderName(
        string provider)
    {
        return provider switch
        {
            "gemini" => "Gemini",
            "openai" => "OpenAI",
            _ => provider
        };
    }

    private static string ExtractProviderError(
        string body,
        string fallback)
    {
        try
        {
            using var json =
                JsonDocument.Parse(body);

            if (json.RootElement.TryGetProperty(
                    "error",
                    out var error))
            {
                if (error.TryGetProperty(
                        "message",
                        out var message))
                {
                    return message.GetString()
                           ?? fallback;
                }
            }
        }
        catch
        {
        }

        return string.IsNullOrWhiteSpace(body)
            ? fallback
            : fallback + $" Provider response: {body}";
    }

    private sealed record VerificationResult(
        bool Success,
        string Message)
    {
        public static VerificationResult Ok() =>
            new(true, "Verified");

        public static VerificationResult Fail(
            string message) =>
            new(false, message);
    }
}

public sealed class AiConnectRequest
{
    public string Provider { get; set; } = "";

    public string ApiKey { get; set; } = "";
}