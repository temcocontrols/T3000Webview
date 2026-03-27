using Dapper;
using Microsoft.AspNetCore.Mvc;
using T3000WebService.Data;

namespace T3000WebService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class StatusController : ControllerBase
{
    private readonly IDbConnectionFactory _db;
    private readonly ILogger<StatusController> _logger;

    public StatusController(IDbConnectionFactory db, ILogger<StatusController> logger)
    {
        _db = db;
        _logger = logger;
    }

    /// <summary>
    /// GET /api/status — health check, returns service version and DB connectivity
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> Get()
    {
        try
        {
            using var conn = _db.CreateConnection();
            // Simple DB ping — Dapper plain SQL
            var dbTime = await conn.ExecuteScalarAsync<string>("SELECT datetime('now')");

            return Ok(new
            {
                status = "ok",
                service = "T3000WebService",
                version = "1.0.0",
                port = 9200,
                dbTime,
                utcTime = DateTime.UtcNow
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Status check failed");
            return StatusCode(500, new { status = "error", message = ex.Message });
        }
    }
}
