using System.Data;
using Microsoft.Data.Sqlite;

namespace T3000WebService.Data;

/// <summary>
/// Creates open SQLite connections using the connection string from appsettings.json.
/// Dapper repositories receive IDbConnectionFactory via DI and call CreateConnection()
/// inside a using block — no EF, no ORM overhead.
/// </summary>
public class SqliteConnectionFactory : IDbConnectionFactory
{
    private readonly string _connectionString;

    public SqliteConnectionFactory(IConfiguration configuration)
    {
        _connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? "Data Source=t3000.db";
    }

    public IDbConnection CreateConnection()
    {
        var conn = new SqliteConnection(_connectionString);
        conn.Open();
        return conn;
    }
}
