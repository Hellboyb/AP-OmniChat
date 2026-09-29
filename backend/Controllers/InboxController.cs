using System.Security.Claims;
using backend.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Authorize]
[Route("api/inbox")]
public class InboxController : ControllerBase
{
    private readonly AppDbContext _db;

    public InboxController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> Get(
        [FromQuery] string channel,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(channel))
        {
            return BadRequest(new
            {
                message = "Channel is required."
            });
        }

        var normalized = NormalizeChannel(channel);

        var allowed = new[]
        {
            "whatsapp",
            "facebook",
            "instagram",
            "mychat"
        };

        if (!allowed.Contains(normalized))
        {
            return BadRequest(new
            {
                message = "Unsupported channel."
            });
        }

        var userId =
            User.FindFirstValue(
                ClaimTypes.NameIdentifier);

        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized();
        }

        var conversations = await _db.Conversations
            .AsNoTracking()
            .Where(x =>
                x.OwnerUserId == userId &&
                x.Channel == normalized)
            .OrderByDescending(x => x.UpdatedAtUtc)
            .Select(x => new
            {
                id = x.Id,
                channel = x.Channel,
                title = x.Title,
                createdAtUtc = x.CreatedAtUtc,
                updatedAtUtc = x.UpdatedAtUtc,

                messages = x.Messages
                    .OrderBy(m => m.CreatedAtUtc)
                    .Select(m => new
                    {
                        id = m.Id,
                        senderType = m.SenderType,
                        senderId = m.SenderId,
                        senderName = m.SenderName,
                        text = m.Text,
                        createdAtUtc = m.CreatedAtUtc
                    })
                    .ToList()
            })
            .ToListAsync(cancellationToken);

        return Ok(new
        {
            channel = normalized,
            conversations
        });
    }

    private static string NormalizeChannel(
        string channel)
    {
        var value =
            channel.Trim().ToLowerInvariant();

        // Backward compatibility with any old records/API calls.
        if (value == "messenger")
        {
            return "facebook";
        }

        return value;
    }
}