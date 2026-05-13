using Microsoft.AspNetCore.Mvc;
using T3Net.Services.Mode;

namespace T3Net.Controllers.V1;

[ApiController]
[Route("api/v1/health")]
public sealed class HealthController : ControllerBase
{
    private readonly IModeService _modeService;

    public HealthController(IModeService modeService)
    {
        _modeService = modeService;
    }

    [HttpGet("summary")]
    public async Task<IActionResult> Summary(CancellationToken ct)
    {
        var mode = await _modeService.GetCurrentModeAsync(ct);
        var policy = await _modeService.GetPolicySnapshotAsync(ct);

        return Ok(new
        {
            service = new
            {
                status = "Healthy",
                name = "T3Net",
                timeUtc = DateTimeOffset.UtcNow
            },
            runtime = new
            {
                mode,
                trendWriteTarget = policy.TrendWriteTarget,
                pauseSamplingWhenCenterDbDown = policy.PauseSamplingWhenCenterDbDown
            }
        });
    }
}
