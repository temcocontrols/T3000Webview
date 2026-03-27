using T3Net.Data;
using T3Net.Hubs;

var builder = WebApplication.CreateBuilder(args);

// ── Host: runs as Windows Service, Linux systemd, or console (debug) ──────────
builder.Host.UseWindowsService(options =>
{
    options.ServiceName = "T3Net";
});
builder.Host.UseSystemd(); // no-op on Windows, activates on Linux

// ── Services ──────────────────────────────────────────────────────────────────
builder.Services.AddControllers();
builder.Services.AddSignalR();
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
});

// Dapper connection factory — injected into controllers / services
builder.Services.AddSingleton<IDbConnectionFactory, SqliteConnectionFactory>();

// ── App ───────────────────────────────────────────────────────────────────────
var app = builder.Build();

app.UseCors();
app.MapControllers();
app.MapHub<T3000Hub>("/ws");

// Bind to port 9200 on all interfaces (HTTP only — no HTTPS needed for local service)
app.Run("http://0.0.0.0:9200");
