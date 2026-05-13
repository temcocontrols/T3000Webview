using T3Net.Data;
using T3Net.Hubs;
using T3Net.Services.Device;
using T3Net.Services.Mode;
using T3Net.Workers;

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
builder.Services.AddSingleton<IRuntimeStateRepository, RuntimeStateRepository>();

// Runtime mode and provider routing scaffolds
builder.Services.AddSingleton<IModeService, ModeService>();
builder.Services.AddSingleton<NativeBacnetProvider>();
builder.Services.AddSingleton<LegacyFfiProvider>();
builder.Services.AddSingleton<IDeviceProvider, DeviceProviderRouter>();

// Background workers
builder.Services.AddHostedService<PollingWorker>();
builder.Services.AddHostedService<HealthWorker>();

// ── App ───────────────────────────────────────────────────────────────────────
var app = builder.Build();

app.UseCors();
app.MapControllers();
app.MapHub<T3000Hub>("/ws");

// Bind to port 9200 on all interfaces (HTTP only — no HTTPS needed for local service)
app.Run("http://0.0.0.0:9200");
