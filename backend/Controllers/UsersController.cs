using backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Authorize]
[Route("api/users")]
public class UsersController : ControllerBase
{
    private readonly UserManager<AppUser> _userManager;

    public UsersController(UserManager<AppUser> userManager)
    {
        _userManager = userManager;
    }

    [HttpGet("search")]
    public async Task<IActionResult> Search(
        [FromQuery] string q,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(q) || q.Trim().Length < 3)
        {
            return BadRequest(new
            {
                message = "Enter at least 3 characters to search."
            });
        }

        var term = q.Trim().ToLowerInvariant();

        // Only expose basic profile fields. Do not return email/phone
        // in broad searches; exact contact discovery needs a separate
        // privacy-aware verification/consent flow.
        var matches = _userManager.Users
            .Where(u =>
                u.UserName != null &&
                u.UserName.ToLower().Contains(term));

        var results = matches
            .Take(20)
            .Select(u => new
            {
                id = u.Id,
                username = u.UserName,
                displayName = u.DisplayName
            });

        return Ok(await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions
            .ToListAsync(results, cancellationToken));
    }
}