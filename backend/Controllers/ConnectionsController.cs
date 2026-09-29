using System.Net;
using System.Security.Claims;
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
[Route("api/connections")]
public class ConnectionsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IDataProtector _protector;

    private static readonly string[] ValidChannels =
    {
        "whatsapp",
        "facebook",
        "instagram"
    };

    public ConnectionsController(
        AppDbContext db,
        IHttpClientFactory httpClientFactory,
        IDataProtectionProvider protectionProvider)
    {
        _db = db;
        _httpClientFactory = httpClientFactory;

        _protector = protectionProvider.CreateProtector(
            "AP-OmniChat.ConnectionCredentials.v1");
    }

    // ------------------------------------------------------------
    // GET /api/connections
    // ------------------------------------------------------------

    [HttpGet]
    public async Task<IActionResult> Get(
        CancellationToken cancellationToken)
    {
        var userId = GetUserId();

        var connections = await _db.Connections
            .AsNoTracking()
            .Where(x => x.UserId == userId)
            .ToListAsync(cancellationToken);

        var channels = new[]
        {
            new
            {
                channelId = "whatsapp",
                name = "WhatsApp"
            },
            new
            {
                channelId = "facebook",
                name = "Facebook Messenger"
            },
            new
            {
                channelId = "instagram",
                name = "Instagram"
            }
        };

        var result = channels.Select(channel =>
        {
            var existing = connections.FirstOrDefault(
                x => x.ChannelId == channel.channelId);

            return new
            {
                channelId = channel.channelId,
                name = channel.name,
                status = existing?.Status ?? "Not connected",
                connectedAtUtc = existing?.ConnectedAtUtc
            };
        });

        return Ok(new
        {
            connections = result
        });
    }

    // ------------------------------------------------------------
    // POST /api/connections/{channelId}/authorize
    // ------------------------------------------------------------

    [HttpPost("{channelId}/authorize")]
    public async Task<IActionResult> Authorize(
        string channelId,
        [FromBody] ConnectionAuthorizeRequest request,
        CancellationToken cancellationToken)
    {
        channelId = NormalizeChannel(channelId);

        if (!ValidChannels.Contains(channelId))
        {
            return BadRequest(new
            {
                message = "Unsupported channel."
            });
        }

        if (request == null ||
            request.Credentials == null)
        {
            return BadRequest(new
            {
                message = "Connection credentials are required."
            });
        }

        var credentials = request.Credentials;

        var validationError = ValidateCredentials(
            channelId,
            credentials);

        if (validationError != null)
        {
            return BadRequest(new
            {
                message = validationError
            });
        }

        try
        {
            var verification = await VerifyOfficialProviderAsync(
                channelId,
                credentials,
                cancellationToken);

            if (!verification.Success)
            {
                await MarkNotConnectedAsync(
                    channelId,
                    cancellationToken);

                return BadRequest(new
                {
                    channelId,
                    status = "Not connected",
                    message = verification.Message
                });
            }

            var userId = GetUserId();

            var connection = await _db.Connections
                .FirstOrDefaultAsync(
                    x =>
                        x.UserId == userId &&
                        x.ChannelId == channelId,
                    cancellationToken);

            var protectedCredentials =
                _protector.Protect(
                    JsonSerializer.Serialize(credentials));

            var now = DateTime.UtcNow;

            if (connection == null)
            {
                connection = new Connection
                {
                    UserId = userId,
                    ChannelId = channelId,
                    ChannelName = GetChannelName(channelId),
                    Status = "Connected",
                    ConnectedAtUtc = now,
                    UpdatedAtUtc = now,
                    CredentialsProtected = protectedCredentials
                };

                _db.Connections.Add(connection);
            }
            else
            {
                connection.ChannelName =
                    GetChannelName(channelId);

                connection.Status = "Connected";

                connection.ConnectedAtUtc =
                    connection.ConnectedAtUtc ?? now;

                connection.UpdatedAtUtc = now;

                connection.CredentialsProtected =
                    protectedCredentials;
            }

            await _db.SaveChangesAsync(cancellationToken);

            return Ok(new
            {
                channelId,
                status = "Connected",
                message =
                    $"{GetChannelName(channelId)} was successfully verified and connected."
            });
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception ex)
        {
            await MarkNotConnectedAsync(
                channelId,
                cancellationToken);

            return StatusCode(
                StatusCodes.Status502BadGateway,
                new
                {
                    channelId,
                    status = "Not connected",
                    message =
                        $"Official {GetChannelName(channelId)} verification failed: {ex.Message}"
                });
        }
    }

    // ------------------------------------------------------------
    // POST /api/connections/{channelId}/disconnect
    // ------------------------------------------------------------

    [HttpPost("{channelId}/disconnect")]
    public async Task<IActionResult> Disconnect(
        string channelId,
        CancellationToken cancellationToken)
    {
        channelId = NormalizeChannel(channelId);

        if (!ValidChannels.Contains(channelId))
        {
            return BadRequest(new
            {
                message = "Unsupported channel."
            });
        }

        var userId = GetUserId();

        var connection = await _db.Connections
            .FirstOrDefaultAsync(
                x =>
                    x.UserId == userId &&
                    x.ChannelId == channelId,
                cancellationToken);

        if (connection != null)
        {
            connection.Status = "Not connected";
            connection.ConnectedAtUtc = null;
            connection.UpdatedAtUtc = DateTime.UtcNow;

            // Remove the encrypted provider credentials.
            connection.CredentialsProtected = "";

            await _db.SaveChangesAsync(cancellationToken);
        }

        return Ok(new
        {
            channelId,
            status = "Not connected",
            message =
                $"{GetChannelName(channelId)} has been disconnected."
        });
    }

    // ------------------------------------------------------------
    // OFFICIAL PROVIDER VERIFICATION
    // ------------------------------------------------------------

    private async Task<VerificationResult>
        VerifyOfficialProviderAsync(
            string channelId,
            Dictionary<string, string> credentials,
            CancellationToken cancellationToken)
    {
        var apiVersion =
            NormalizeGraphVersion(
                credentials.GetValueOrDefault("apiVersion"));

        var accessToken =
            credentials.GetValueOrDefault("accessToken");

        if (channelId == "facebook")
        {
            accessToken =
                credentials.GetValueOrDefault(
                    "pageAccessToken");
        }

        if (string.IsNullOrWhiteSpace(accessToken))
        {
            return VerificationResult.Fail(
                "An access token is required.");
        }

        var appId =
            credentials.GetValueOrDefault("appId");

        var appSecret =
            credentials.GetValueOrDefault("appSecret");

        // First verify the supplied token against Meta's
        // official debug_token endpoint.
        var debugTokenResult =
            await DebugMetaTokenAsync(
                apiVersion,
                accessToken,
                appId,
                appSecret,
                cancellationToken);

        if (!debugTokenResult.Success)
        {
            return debugTokenResult;
        }

        var client =
            _httpClientFactory.CreateClient();

        if (channelId == "whatsapp")
        {
            var phoneNumberId =
                credentials.GetValueOrDefault(
                    "phoneNumberId");

            var url =
                $"https://graph.facebook.com/{apiVersion}/{Uri.EscapeDataString(phoneNumberId!)}" +
                $"?fields=id,display_phone_number,verified_name" +
                $"&access_token={Uri.EscapeDataString(accessToken)}";

            return await VerifyGraphResourceAsync(
                client,
                url,
                "WhatsApp Phone Number",
                cancellationToken);
        }

        if (channelId == "facebook")
        {
            var pageId =
                credentials.GetValueOrDefault("pageId");

            var url =
                $"https://graph.facebook.com/{apiVersion}/{Uri.EscapeDataString(pageId!)}" +
                $"?fields=id,name" +
                $"&access_token={Uri.EscapeDataString(accessToken)}";

            return await VerifyGraphResourceAsync(
                client,
                url,
                "Facebook Page",
                cancellationToken);
        }

        if (channelId == "instagram")
        {
            var instagramAccountId =
                credentials.GetValueOrDefault(
                    "instagramAccountId");

            var url =
                $"https://graph.facebook.com/{apiVersion}/{Uri.EscapeDataString(instagramAccountId!)}" +
                $"?fields=id,username" +
                $"&access_token={Uri.EscapeDataString(accessToken)}";

            return await VerifyGraphResourceAsync(
                client,
                url,
                "Instagram Professional Account",
                cancellationToken);
        }

        return VerificationResult.Fail(
            "Unsupported provider.");
    }

    private async Task<VerificationResult>
        DebugMetaTokenAsync(
            string apiVersion,
            string accessToken,
            string appId,
            string appSecret,
            CancellationToken cancellationToken)
    {
        var client =
            _httpClientFactory.CreateClient();

        var appAccessToken =
            $"{appId}|{appSecret}";

        var url =
            $"https://graph.facebook.com/{apiVersion}/debug_token" +
            $"?input_token={Uri.EscapeDataString(accessToken)}" +
            $"&access_token={Uri.EscapeDataString(appAccessToken)}";

        using var response =
            await client.GetAsync(
                url,
                cancellationToken);

        var body =
            await response.Content.ReadAsStringAsync(
                cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            return VerificationResult.Fail(
                ExtractProviderError(
                    body,
                    "Meta rejected the supplied access token."));
        }

        try
        {
            using var json =
                JsonDocument.Parse(body);

            var data =
                json.RootElement
                    .GetProperty("data");

            var isValid =
                data.TryGetProperty(
                    "is_valid",
                    out var validElement) &&
                validElement.ValueKind ==
                    JsonValueKind.True &&
                validElement.GetBoolean();

            if (!isValid)
            {
                return VerificationResult.Fail(
                    "Meta reported that the supplied access token is invalid.");
            }

            return VerificationResult.Ok();
        }
        catch
        {
            return VerificationResult.Fail(
                "Meta returned an unexpected token verification response.");
        }
    }

    private async Task<VerificationResult>
        VerifyGraphResourceAsync(
            HttpClient client,
            string url,
            string resourceName,
            CancellationToken cancellationToken)
    {
        using var response =
            await client.GetAsync(
                url,
                cancellationToken);

        var body =
            await response.Content.ReadAsStringAsync(
                cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            return VerificationResult.Fail(
                ExtractProviderError(
                    body,
                    $"{resourceName} verification failed."));
        }

        try
        {
            using var json =
                JsonDocument.Parse(body);

            if (json.RootElement.ValueKind !=
                JsonValueKind.Object)
            {
                return VerificationResult.Fail(
                    $"{resourceName} returned an invalid response.");
            }

            if (!json.RootElement.TryGetProperty(
                    "id",
                    out _))
            {
                return VerificationResult.Fail(
                    $"{resourceName} could not be verified.");
            }

            return VerificationResult.Ok();
        }
        catch
        {
            return VerificationResult.Fail(
                $"{resourceName} returned an unexpected response.");
        }
    }

    // ------------------------------------------------------------
    // VALIDATION
    // ------------------------------------------------------------

    private static string? ValidateCredentials(
        string channelId,
        Dictionary<string, string> credentials)
    {
        var required =
            channelId switch
            {
                "whatsapp" => new[]
                {
                    "appId",
                    "appSecret",
                    "accessToken",
                    "businessAccountId",
                    "phoneNumberId",
                    "verifyToken",
                    "webhookUrl",
                    "apiVersion"
                },

                "facebook" => new[]
                {
                    "appId",
                    "appSecret",
                    "pageId",
                    "pageAccessToken",
                    "verifyToken",
                    "webhookUrl"
                },

                "instagram" => new[]
                {
                    "appId",
                    "appSecret",
                    "accessToken",
                    "instagramAccountId",
                    "pageId",
                    "verifyToken",
                    "webhookUrl"
                },

                _ => Array.Empty<string>()
            };

        var missing =
            required
                .Where(key =>
                    !credentials.TryGetValue(
                        key,
                        out var value) ||
                    string.IsNullOrWhiteSpace(value))
                .ToArray();

        if (missing.Length == 0)
        {
            return null;
        }

        return
            $"Missing required credentials: {string.Join(", ", missing)}.";
    }

    // ------------------------------------------------------------
    // HELPERS
    // ------------------------------------------------------------

    private async Task MarkNotConnectedAsync(
        string channelId,
        CancellationToken cancellationToken)
    {
        var userId = GetUserId();

        var connection =
            await _db.Connections.FirstOrDefaultAsync(
                x =>
                    x.UserId == userId &&
                    x.ChannelId == channelId,
                cancellationToken);

        if (connection != null)
        {
            connection.Status = "Not connected";
            connection.ConnectedAtUtc = null;
            connection.UpdatedAtUtc = DateTime.UtcNow;

            await _db.SaveChangesAsync(
                cancellationToken);
        }
    }

    private string GetUserId()
    {
        return User.FindFirstValue(
                   ClaimTypes.NameIdentifier)
               ?? throw new UnauthorizedAccessException();
    }

    private static string NormalizeChannel(
        string channelId)
    {
        return channelId
            .Trim()
            .ToLowerInvariant();
    }

    private static string GetChannelName(
        string channelId)
    {
        return channelId switch
        {
            "whatsapp" => "WhatsApp",
            "facebook" => "Facebook Messenger",
            "instagram" => "Instagram",
            _ => channelId
        };
    }

    private static string NormalizeGraphVersion(
        string? version)
    {
        var value =
            string.IsNullOrWhiteSpace(version)
                ? "v23.0"
                : version.Trim();

        if (!value.StartsWith("v",
                StringComparison.OrdinalIgnoreCase))
        {
            value = "v" + value;
        }

        return value;
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
            // Ignore malformed provider response.
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

// ------------------------------------------------------------
// REQUEST DTO
// ------------------------------------------------------------

public sealed class ConnectionAuthorizeRequest
{
    public string ChannelId { get; set; } = "";

    public Dictionary<string, string> Credentials { get; set; }
        = new();
}