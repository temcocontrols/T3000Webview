using Microsoft.AspNetCore.Mvc;
using T3Net.Models.Contracts;
using T3Net.Services.Mode;

namespace T3Net.Controllers.V1;

[ApiController]
[Route("api/v1/mode")]
public sealed class ModeController : ControllerBase
{
    private readonly IModeService _modeService;

    public ModeController(IModeService modeService)
    {
        _modeService = modeService;
    }

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var mode = await _modeService.GetCurrentModeAsync(ct);
        var policy = await _modeService.GetPolicySnapshotAsync(ct);

        return Ok(new
        {
            mode,
            policy,
            updatedAtUtc = DateTimeOffset.UtcNow
        });
    }

    public sealed class SwitchModeRequest
    {
        public RuntimeMode TargetMode { get; set; }
        public string Actor { get; set; } = "system";
        public string? Reason { get; set; }
    }

    [HttpPost("switch")]
    public async Task<IActionResult> Switch([FromBody] SwitchModeRequest request, CancellationToken ct)
    {
        var result = await _modeService.SwitchModeAsync(request.TargetMode, request.Actor, request.Reason, ct);
        return Ok(result);
    }
}
