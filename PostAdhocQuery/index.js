const sql = require('mssql');

module.exports = async function (context, req) {
    context.log('Post Adhoc Query function');
    if (req.method == 'POST') {
        var { server, db, query } = req.body
        const config = {
            server: server,
            database: db,
            user: server == 'elastic-sqlserver001.database.windows.net' || server == 'elastic-sqlserver002.database.windows.net' || server == 'elastic-sqlserver004.database.windows.net' ? 'atrainuser' : 'aprduser',
            password: 'rt53#$%@fgt5$3',
            options: {
                encrypt: true // if using Azure
            }
        };
        await sql.connect(config);
        context.res = {
            body: query
        };
    }

    
}