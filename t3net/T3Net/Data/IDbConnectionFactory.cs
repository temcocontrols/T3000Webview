using System.Data;

namespace T3Net.Data;

public interface IDbConnectionFactory
{
    IDbConnection CreateConnection();
}
