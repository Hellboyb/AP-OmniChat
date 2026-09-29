using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Route("api/ai")]
[Authorize]
public class AiController : ControllerBase
{
    private readonly IGeminiService _geminiService;

    public AiController(IGeminiService geminiService)
    {
        _geminiService = geminiService;
    }

    [HttpPost("reply")]
    public async Task<IActionResult> Reply(
        [FromBody] AiReplyRequest request,
        CancellationToken cancellationToken)
    {
        if (request == null ||
            string.IsNullOrWhiteSpace(request.Prompt))
        {
            return BadRequest(new
            {
                message = "Prompt is required."
            });
        }

        if (request.Prompt.Length > 10000)
        {
            return BadRequest(new
            {
                message = "Prompt is too long."
            });
        }

        try
        {
            var reply =
                await _geminiService.GenerateReplyAsync(
                    request,
                    cancellationToken);

            return Ok(new
            {
                reply
            });
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(503, new
            {
                message = ex.Message
            });
        }
        catch (HttpRequestException)
        {
            return StatusCode(502, new
            {
                message = "Gemini AI service is currently unavailable."
            });
        }
        catch (OperationCanceledException)
        {
            return StatusCode(499, new
            {
                message = "AI request was cancelled."
            });
        }
    }
}