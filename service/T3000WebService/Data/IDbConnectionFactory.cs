using System.Data;

namespace T3000WebService.Data;

public interface IDbConnectionFactory
{
    IDbConnection CreateConnection();
}
