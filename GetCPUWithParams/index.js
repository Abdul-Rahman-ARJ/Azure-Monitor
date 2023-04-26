// importing sql module
const sql = require('mssql');

async function getSqlCpuUsage(server, DB) {
    const config = {
        server: server,
        database: DB,
        user: 'atrainuser',
        password: 'rt53#$%@fgt5$3',
        options: {
            encrypt: true // if using Azure
        }
    };
    try {
        await sql.connect(config);
        const result = await sql.query(`
        DECLARE @dbname SYSNAME = NULL 
        SELECT
                sdes.session_id        ,sdes.login_time        ,sdes.last_request_start_time       ,sdes.last_request_end_time       ,sdes.is_user_process       ,sdes.host_name       ,sdes.program_name       ,sdes.login_name       ,sdes.status
               ,sdec.num_reads       ,sdec.num_writes       ,sdec.last_read       ,sdec.last_write       ,sdes.reads       ,sdes.logical_reads       ,sdes.writes              ,DatabaseName = COALESCE( db_name(sdes.database_id),  N'')
               ,sdest.ObjName    ,sdes.client_interface_name    ,sdes.nt_domain    ,sdes.nt_user_name    ,sdec.client_net_address    ,sdec.local_net_address    ,sdest.Query    ,KillCommand  = 'Kill '+ CAST(sdes.session_id  AS VARCHAR)
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
        return result
    } catch (err) {
        console.error(err);
    }
}



module.exports = async function (context, req) {
    let { method } = req;
    ADF = false
    QV = false
    PBI = false
    if (method == 'POST') {
        const { server, DB } = req.body
        res = await getSqlCpuUsage(server, DB);
        // console.log(res.recordset)
        let data = res.recordset;
        result = []
        data.map((item) => {
            // check ADF is runnig
            if (item.host_name == "dw_admin") {
                if (item.status == "running") {
                    ADF = true;
                    result.push({ item, ADF })
                }
                console.log("ADF running")

            }
            // check QV is runnig
            else if (item.host_name.startsWith("QV")) {
                // console.log("pd1mdwk000Q3P")
                if (item.status == "running") {
                    result.push({ item, QV:true })
                }
            }
            // check PBI is runnig
            // "program_name": "Mashup Engine (PowerBIPremium-Import)",
            else if (item.program_name == "Mashup Engine (PowerBIPremium-Import)") {
                if (item.status == "running") {
                    result.push({ item, PBI:true })
                }
            }
        })
    }

    context.res = {
        // status: 200, /* Defaults to 200 */
        body: { result }
        // body: { res }
    };
}