using System.Security.Claims;
using backend.Data;
using backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Authorize]
[Route("api/mychat")]
public class MyChatController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly UserManager<AppUser> _userManager;

    public MyChatController(
        AppDbContext db,
        UserManager<AppUser> userManager)
    {
        _db = db;
        _userManager = userManager;
    }

    [HttpGet("users")]
    public async Task<IActionResult> Users()
    {
        var currentUserId = GetUserId();

        var users = await _userManager.Users
            .Where(x => x.Id != currentUserId)
            .OrderBy(x => x.UserName)
            .Select(x => new
            {
                id = x.Id,
                userName = x.UserName,
                email = x.Email,
                displayName = x.DisplayName
            })
            .ToListAsync();

        return Ok(new
        {
            users
        });
    }

    [HttpGet("messages/{userId}")]
    public async Task<IActionResult> Messages(string userId)
    {
        var currentUserId = GetUserId();

        var messages = await _db.MyChatMessages
            .AsNoTracking()
            .Where(x =>
                (x.SenderUserId == currentUserId &&
                 x.RecipientUserId == userId) ||
                (x.SenderUserId == userId &&
                 x.RecipientUserId == currentUserId))
            .OrderBy(x => x.CreatedAtUtc)
            .Select(x => new
            {
                id = x.Id,
                senderUserId = x.SenderUserId,
                recipientUserId = x.RecipientUserId,
                text = x.Text,
                createdAtUtc = x.CreatedAtUtc
            })
            .ToListAsync();

        return Ok(new
        {
            messages
        });
    }

    [HttpPost("messages")]
    public async Task<IActionResult> Send(
        SendMessageRequest request)
    {
        var senderId = GetUserId();

        if (string.IsNullOrWhiteSpace(request.RecipientUserId) ||
            string.IsNullOrWhiteSpace(request.Text))
        {
            return BadRequest(new
            {
                message = "Recipient and message are required."
            });
        }

        if (senderId == request.RecipientUserId)
        {
            return BadRequest(new
            {
                message = "You cannot message yourself."
            });
        }

        var recipient = await _userManager.FindByIdAsync(
            request.RecipientUserId);

        if (recipient == null)
        {
            return NotFound(new
            {
                message = "User not found."
            });
        }

        var entity = new MyChatMessage
        {
            SenderUserId = senderId,
            RecipientUserId = request.RecipientUserId,
            Text = request.Text.Trim()
        };

        _db.MyChatMessages.Add(entity);

        await _db.SaveChangesAsync();

        return Ok(new
        {
            message = new
            {
                id = entity.Id,
                senderUserId = entity.SenderUserId,
                recipientUserId = entity.RecipientUserId,
                text = entity.Text,
                createdAtUtc = entity.CreatedAtUtc
            }
        });
    }

    private string GetUserId()
    {
        return User.FindFirstValue(
                   ClaimTypes.NameIdentifier)
               ?? throw new UnauthorizedAccessException();
    }
}

public sealed record SendMessageRequest(
    string RecipientUserId,
    string Text);