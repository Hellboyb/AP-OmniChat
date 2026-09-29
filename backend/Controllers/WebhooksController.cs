using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using backend.Data;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api/webhooks")]
public class WebhooksController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IOmniReplyService _omniReplyService;
    private readonly IDataProtectionProvider _protectionProvider;

    public WebhooksController(
        AppDbContext db,
        IOmniReplyService omniReplyService,
        IDataProtectionProvider protectionProvider)
    {
        _db = db;
        _omniReplyService = omniReplyService;
        _protectionProvider = protectionProvider;
    }

    /*
     * ---------------------------------------------------------
     * FACEBOOK / INSTAGRAM / WHATSAPP WEBHOOK VERIFICATION
     * ---------------------------------------------------------
     *
     * Meta sends a GET request when a webhook is being verified.
     *
     * Example:
     * GET /api/webhooks/{channel}?hub.mode=subscribe
     *     &hub.verify_token=YOUR_TOKEN
     *     &hub.challenge=123456
     */
    [AllowAnonymous]
    [HttpGet("{channel}")]
    public async Task<IActionResult> Verify(
        string channel,
        [FromQuery(Name = "hub.mode")] string? mode,
        [FromQuery(Name = "hub.verify_token")]
        string? verifyToken,
        [FromQuery(Name = "hub.challenge")]
        string? challenge,
        CancellationToken cancellationToken)
    {
        channel = NormalizeChannel(channel);

        if (!IsSupportedChannel(channel))
        {
            return NotFound();
        }

        if (!string.Equals(
                mode,
                "subscribe",
                StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest();
        }

        if (string.IsNullOrWhiteSpace(verifyToken) ||
            string.IsNullOrWhiteSpace(challenge))
        {
            return BadRequest();
        }

        var connections = await _db.Connections
            .Where(x =>
                x.ChannelId == channel &&
                x.Status == "Connected" &&
                !string.IsNullOrWhiteSpace(
                    x.CredentialsProtected))
            .ToListAsync(cancellationToken);

        foreach (var connection in connections)
        {
            try
            {
                var credentials =
                    ReadCredentials(connection);

                var configuredToken =
                    credentials.GetValueOrDefault(
                        "verifyToken");

                if (SecureEquals(
                        configuredToken,
                        verifyToken))
                {
                    return Content(
                        challenge,
                        "text/plain",
                        Encoding.UTF8);
                }
            }
            catch
            {
                // Ignore invalid credential records.
            }
        }

        return Unauthorized();
    }

    /*
     * ---------------------------------------------------------
     * INCOMING WEBHOOK
     * ---------------------------------------------------------
     */
    [AllowAnonymous]
    [HttpPost("{channel}")]
    public async Task<IActionResult> Receive(
        string channel,
        CancellationToken cancellationToken)
    {
        channel = NormalizeChannel(channel);

        if (!IsSupportedChannel(channel))
        {
            return NotFound();
        }

        Request.EnableBuffering();

        using var reader =
            new StreamReader(
                Request.Body,
                Encoding.UTF8,
                leaveOpen: true);

        var body =
            await reader.ReadToEndAsync(
                cancellationToken);

        Request.Body.Position = 0;

        if (string.IsNullOrWhiteSpace(body))
        {
            return BadRequest();
        }

        /*
         * Parse the webhook using JsonDocument so the controller
         * can handle the provider payload without requiring
         * provider-specific DTO classes.
         */
        try
        {
            using var document =
                JsonDocument.Parse(body);

            if (channel == "whatsapp")
            {
                await ProcessWhatsAppAsync(
                    document.RootElement,
                    cancellationToken);
            }
            else if (channel == "facebook")
            {
                await ProcessFacebookAsync(
                    document.RootElement,
                    cancellationToken);
            }
            else if (channel == "instagram")
            {
                await ProcessInstagramAsync(
                    document.RootElement,
                    cancellationToken);
            }

            /*
             * Meta expects a successful HTTP response quickly.
             * The message has been accepted for processing.
             */
            return Ok(new
            {
                received = true
            });
        }
        catch (JsonException)
        {
            return BadRequest(new
            {
                message = "Invalid webhook JSON."
            });
        }
        catch
        {
            /*
             * Do not expose internal exception details through
             * a public webhook endpoint.
             */
            return StatusCode(
                StatusCodes.Status500InternalServerError);
        }
    }

    /*
     * ---------------------------------------------------------
     * WHATSAPP
     * ---------------------------------------------------------
     *
     * Expected Meta Cloud API structure:
     *
     * entry[]
     *   changes[]
     *     value
     *       metadata.phone_number_id
     *       contacts[]
     *       messages[]
     */
    private async Task ProcessWhatsAppAsync(
        JsonElement root,
        CancellationToken cancellationToken)
    {
        if (!root.TryGetProperty(
                "entry",
                out var entries) ||
            entries.ValueKind !=
                JsonValueKind.Array)
        {
            return;
        }

        foreach (var entry in entries.EnumerateArray())
        {
            if (!entry.TryGetProperty(
                    "changes",
                    out var changes) ||
                changes.ValueKind !=
                    JsonValueKind.Array)
            {
                continue;
            }

            foreach (var change in changes.EnumerateArray())
            {
                if (!change.TryGetProperty(
                        "value",
                        out var value))
                {
                    continue;
                }

                var phoneNumberId =
                    GetString(
                        value,
                        "metadata",
                        "phone_number_id");

                var contacts =
                    GetArray(
                        value,
                        "contacts");

                var messages =
                    GetArray(
                        value,
                        "messages");

                if (messages == null)
                {
                    continue;
                }

                foreach (var message in
                    messages.Value.EnumerateArray())
                {
                    var messageType =
                        GetString(
                            message,
                            "type");

                    /*
                     * Current AI pipeline handles text messages.
                     * Other media types are safely ignored until
                     * their processing is implemented.
                     */
                    if (!string.Equals(
                            messageType,
                            "text",
                            StringComparison.OrdinalIgnoreCase))
                    {
                        continue;
                    }

                    var senderId =
                        GetString(
                            message,
                            "from");

                    var text =
                        GetString(
                            message,
                            "text",
                            "body");

                    if (string.IsNullOrWhiteSpace(
                            senderId) ||
                        string.IsNullOrWhiteSpace(
                            text))
                    {
                        continue;
                    }

                    var senderName =
                        FindWhatsAppContactName(
                            contacts,
                            senderId);

                    await ProcessIncomingMessageAsync(
                        "whatsapp",
                        phoneNumberId,
                        senderId,
                        senderName,
                        text,
                        cancellationToken);
                }
            }
        }
    }

    /*
     * ---------------------------------------------------------
     * FACEBOOK MESSENGER
     * ---------------------------------------------------------
     */
    private async Task ProcessFacebookAsync(
        JsonElement root,
        CancellationToken cancellationToken)
    {
        if (!root.TryGetProperty(
                "entry",
                out var entries) ||
            entries.ValueKind !=
                JsonValueKind.Array)
        {
            return;
        }

        foreach (var entry in entries.EnumerateArray())
        {
            var pageId =
                GetString(
                    entry,
                    "id");

            var messaging =
                GetArray(
                    entry,
                    "messaging");

            if (messaging == null)
            {
                continue;
            }

            foreach (var eventItem in
                messaging.Value.EnumerateArray())
            {
                var senderId =
                    GetString(
                        eventItem,
                        "sender",
                        "id");

                var messageText =
                    GetString(
                        eventItem,
                        "message",
                        "text");

                if (string.IsNullOrWhiteSpace(
                        senderId) ||
                    string.IsNullOrWhiteSpace(
                        messageText))
                {
                    continue;
                }

                await ProcessIncomingMessageAsync(
                    "facebook",
                    pageId,
                    senderId,
                    senderId,
                    messageText,
                    cancellationToken);
            }
        }
    }

    /*
     * ---------------------------------------------------------
     * INSTAGRAM
     * ---------------------------------------------------------
     */
    private async Task ProcessInstagramAsync(
        JsonElement root,
        CancellationToken cancellationToken)
    {
        if (!root.TryGetProperty(
                "entry",
                out var entries) ||
            entries.ValueKind !=
                JsonValueKind.Array)
        {
            return;
        }

        foreach (var entry in entries.EnumerateArray())
        {
            var instagramAccountId =
                GetString(
                    entry,
                    "id");

            var messaging =
                GetArray(
                    entry,
                    "messaging");

            if (messaging == null)
            {
                continue;
            }

            foreach (var eventItem in
                messaging.Value.EnumerateArray())
            {
                var senderId =
                    GetString(
                        eventItem,
                        "sender",
                        "id");

                var messageText =
                    GetString(
                        eventItem,
                        "message",
                        "text");

                if (string.IsNullOrWhiteSpace(
                        senderId) ||
                    string.IsNullOrWhiteSpace(
                        messageText))
                {
                    continue;
                }

                await ProcessIncomingMessageAsync(
                    "instagram",
                    instagramAccountId,
                    senderId,
                    senderId,
                    messageText,
                    cancellationToken);
            }
        }
    }

    /*
     * ---------------------------------------------------------
     * COMMON MESSAGE PIPELINE
     * ---------------------------------------------------------
     */
    private async Task ProcessIncomingMessageAsync(
        string channel,
        string receivingAccountId,
        string senderId,
        string senderName,
        string text,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(
                senderId) ||
            string.IsNullOrWhiteSpace(
                text))
        {
            return;
        }

        /*
         * OmniReplyService already performs:
         *
         * 1. Connected account lookup
         * 2. Credential decryption
         * 3. Conversation creation
         * 4. Customer message storage
         * 5. Conversation history
         * 6. Gemini processing
         * 7. Provider reply
         * 8. AI message storage
         */
        await _omniReplyService.ProcessIncomingAsync(
            channel,
            senderId,
            senderName,
            text,
            cancellationToken);
    }

    /*
     * ---------------------------------------------------------
     * CREDENTIALS
     * ---------------------------------------------------------
     */
    private Dictionary<string, string> ReadCredentials(
        Connection connection)
    {
        if (string.IsNullOrWhiteSpace(
            connection.CredentialsProtected))
        {
            return new Dictionary<string, string>();
        }

        var protector =
            _protectionProvider.CreateProtector(
                "AP-OmniChat.ConnectionCredentials.v1");

        var encryptedBytes =
            Convert.FromBase64String(
                connection.CredentialsProtected);

        var decryptedBytes =
            protector.Unprotect(
                encryptedBytes);

        var json =
            Encoding.UTF8.GetString(
                decryptedBytes);

        return JsonSerializer.Deserialize<
                   Dictionary<string, string>>(json)
               ?? new Dictionary<string, string>();
    }

    /*
     * ---------------------------------------------------------
     * JSON HELPERS
     * ---------------------------------------------------------
     */
    private static string GetString(
        JsonElement element,
        params string[] properties)
    {
        var current = element;

        foreach (var property in properties)
        {
            if (!current.TryGetProperty(
                    property,
                    out current))
            {
                return "";
            }
        }

        return current.ValueKind ==
                   JsonValueKind.String
            ? current.GetString() ?? ""
            : "";
    }

    private static JsonElement? GetArray(
        JsonElement element,
        string property)
    {
        if (!element.TryGetProperty(
                property,
                out var value))
        {
            return null;
        }

        return value.ValueKind ==
                   JsonValueKind.Array
            ? value
            : null;
    }

    private static string FindWhatsAppContactName(
        JsonElement? contacts,
        string senderId)
    {
        if (contacts == null ||
            contacts.Value.ValueKind !=
                JsonValueKind.Array)
        {
            return senderId;
        }

        foreach (var contact in
            contacts.Value.EnumerateArray())
        {
            var waId =
                GetString(
                    contact,
                    "wa_id");

            if (!string.Equals(
                    waId,
                    senderId,
                    StringComparison.Ordinal))
            {
                continue;
            }

            var name =
                GetString(
                    contact,
                    "profile",
                    "name");

            if (!string.IsNullOrWhiteSpace(name))
            {
                return name;
            }
        }

        return senderId;
    }

    private static bool SecureEquals(
        string? first,
        string? second)
    {
        if (string.IsNullOrEmpty(first) ||
            string.IsNullOrEmpty(second))
        {
            return false;
        }

        var firstBytes =
            Encoding.UTF8.GetBytes(first);

        var secondBytes =
            Encoding.UTF8.GetBytes(second);

        return firstBytes.Length ==
                   secondBytes.Length &&
               CryptographicOperations.FixedTimeEquals(
                   firstBytes,
                   secondBytes);
    }

    private static string NormalizeChannel(
        string channel)
    {
        var normalized =
            channel?.Trim().ToLowerInvariant() ?? "";

        return normalized == "messenger"
            ? "facebook"
            : normalized;
    }

    private static bool IsSupportedChannel(
        string channel)
    {
        return channel is
            "whatsapp" or
            "facebook" or
            "instagram";
    }
}