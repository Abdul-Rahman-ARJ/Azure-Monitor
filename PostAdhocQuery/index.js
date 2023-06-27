const sql = require('mssql');

module.exports = async function (context, req) {
    context.log('Post Adhoc Query function');
    if (req.method == 'POST') {
        let result;
        var { server, db, AdhocQuery } = req.body
        const config = {
            server: server,
            database: db,
            user: server == 'elastic-sqlserver001.database.windows.net' || server == 'elastic-sqlserver002.database.windows.net' || server == 'elastic-sqlserver004.database.windows.net' ? 'atrainuser' : 'aprduser',
            password: 'rt53#$%@fgt5$3',
            options: {
                encrypt: true // if using Azure
            }
        };



        try {
            await sql.connect(config);
        } catch (error) {
            context.log("error connecting db", error)
        }
        context.log({ server, db, AdhocQuery })
        try {
            result = await sql.query(AdhocQuery);
            try {
                sql.close();
            } catch (error) {
                context.log(`error closing connection`, error)
            }
            context.res = {
                body: result
            };
        } catch (error) {

            context.log(`error running quey ${AdhocQuery}`, error);
            context.res = {
                status: 400,
                body: `Error in query${AdhocQuery}`
            }

            try {
                sql.close();
            } catch (error) {
                context.log(`error closing connection`, error)
            }
        }
        
    }
    else {
        context.res = {
            status: 401,
            body: "Not allowed"
        };
    }


}