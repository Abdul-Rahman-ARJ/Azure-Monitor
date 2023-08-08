// importing sql module
const sql = require("mssql");

module.exports = async function (context, req) {
  let { method } = req;
  var ADFisRunning = false;
  var QVisRunning = false;
  var PBIisRunnning = false;
  var FeedsisRunnning = false;
  const { server, DB } = req.body;
  context.log({
    server,
    DB,
  });
  let result = [];
  let Output1;
  let data;
  if (method == "POST") {
    Output1 = await getSqlCpuUsage(server, DB);
    // context.log(Output1);
    data = Output1.recordset;
    // context.log(data)
    context.log(`There are ${data.length} fetched. ${DB}`);
    data.map((item) => {
      // check ADFisRunning is runnig
      if (item.login_name == "DW_Admin") {
        if (item.status == "running") {
          ADFisRunning = true;
          result.push({
            item,
            ADFisRunning: ADFisRunning,
          });
        }
        context.log("ADFisRunning running");
      }
      // check QVisRunning is runnig
      else if (item.program_name == "QlikView") {
        // context.log("pd1mdwk000Q3P")
        if (item.status == "running") {
          QVisRunning = true;
          result.push({
            item,
            QVisRunning: QVisRunning,
          });
        }
      }
      // check PBIisRunnning is runnig
      // "program_name": "Mashup Engine (PowerBIPremium-Import)",
      else if (item.program_name == "Mashup Engine (PowerBIPremium-Import)") {
        if (item.status == "running") {
          PBIisRunnning = true;
          result.push({
            item,
            PBIisRunnning: PBIisRunnning,
          });
        }
      } else if (item.login_name == "ruleengine") {
        if (item.status == "running") {
          FeedsisRunnning = true;
          result.push({
            item,
            FeedsisRunnning: FeedsisRunnning,
          });
        }
      }
    });
  }
  context.log("All processed", DB);
  // res.status(200).json("ok")
  context.res = {
    body: {
      ADFisRunning,
      QVisRunning,
      PBIisRunnning,
      FeedsisRunnning,
      result,
      Running_Queries: Output1.recordset.filter(
        (session) => session.status === "running"
      ),
      OverallStats: Output1.recordset,
    },
  };
  async function getSqlCpuUsage(server, DB) {
    const config = {
      server: server,
      database: DB,
      user:
        server == "elastic-sqlserver001.database.windows.net" ||
        server == "elastic-sqlserver002.database.windows.net" ||
        server == "elastic-sqlserver004.database.windows.net"
          ? "atrainuser"
          : "aprduser",
      password: "rt53#$%@fgt5$3",
      options: {
        encrypt: true, // if using Azure
      },
    };
    try {
      try {
        await sql.connect(config);
      } catch (error) {
        context.log("unable to connect", error);
        return;
      }

      const result = await sql.query(`
                DECLARE @dbname SYSNAME =NULL
                SELECT 
                        sdes.session_id        ,sdes.login_time        ,sdes.last_request_start_time       ,
                        sdes.last_request_end_time       ,sdes.is_user_process       ,sdes.host_name       ,
                        sdes.program_name       ,sdes.login_name       ,sdes.status
                       ,sdec.num_reads       ,
                       sdec.num_writes       ,sdec.last_read       ,sdec.last_write       ,sdes.reads       ,
                       sdes.logical_reads       ,sdes.writes              ,DatabaseName = COALESCE( db_name(sdes.database_id),  N'')
                       ,sdest.ObjName    ,sdes.client_interface_name    ,sdes.nt_domain    ,sdes.nt_user_name    ,
                       sdec.client_net_address    ,sdec.local_net_address    ,sdest.Query    ,
                       KillCommand  = 'Kill '+ CAST(sdes.session_id  AS VARCHAR)
                from sys.dm_tran_locks t INNER JOIN sys.dm_exec_sessions sdes
                        ON t.request_session_id = sdes.session_id
                LEFT OUTER JOIN sys.dm_exec_connections AS sdec 
                        ON sdec.session_id = sdes.session_id
                OUTER APPLY (
                
                                SELECT DB_NAME(dbid) AS DatabaseName
                                    ,OBJECT_NAME(objectid) AS ObjName
                                    ,COALESCE((
                                            SELECT TEXT AS [processing-instruction(definition)]
                                            FROM sys.dm_exec_sql_text(sdec.most_recent_sql_handle) 
                                            FOR XML PATH('')
                                                ,TYPE
                                            ), '') AS Query
                
                                FROM sys.dm_exec_sql_text(sdec.most_recent_sql_handle)
                
                    ) sdest
                where t.resource_type = 'database' 
                  and t.resource_database_id = CASE WHEN @dbname IS NULL 
                                                    THEN t.resource_database_id  
                                                    ELSE DB_ID(@dbname)  
                                               END 
                  and t.request_type = 'LOCK' 
                  and t.request_status = 'GRANT'
            `);
      sql.close();
      return result;
    } catch (err) {
      context.log(`Error while executing the sql: ${err}, ${DB}`);
      try {
        sql.close();
      } catch (err2) {
        context.log(`Error at closing the connection: ${err2}, ${DB}`);
      }
    }
  }
};
