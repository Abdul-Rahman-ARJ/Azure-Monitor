const sql = require('mssql');
const server1 = [
    "",
    "elastic-sqlserver002.database.windows.net",
]

module.exports = async function (context, req) {

    if (req.method == 'POST') {
        var { server } = req.body
        const config = {
            server: server,
            database: 'master',
            user: server == 'elastic-sqlserver001.database.windows.net' || server == 'elastic-sqlserver002.database.windows.net' || server == 'elastic-sqlserver004.database.windows.net' ? 'atrainuser' : 'aprduser',
            password: 'rt53#$%@fgt5$3',
            options: {
                encrypt: true // if using Azure
            }
        };

        async function getSqlCpuUsage() {
            try {
                try {
                    await sql.connect(config);

                } catch (error) {
                    res.status(200).json({ "message": error })

                }
                const result = await sql.query(`SELECT name FROM sys.databases`);
                sql.close();
                console.log(result);
                return FilterDB(result.recordset);
            } catch (err) {
                try {
                    sql.close();
                } catch (error) {

                    context.error(err);
                    // res.status(200).json({ "message": err })
                }
                context.error(err);
                // res.status(200).json({ "message": err })
            }
        }

        function FilterDB(result) {

            const regex = /\b(eton_rei\w+(?:tst|prd|RC2|QAsprint2|devsprint2|qaprod|data))\b/gi;

            const matchedWords = [""];

            for (const str of result) {
                const matches = str.name.match(regex);
                if (matches) {
                    matchedWords.push(...matches);
                }
            }
            return matchedWords
        }
        try {
            const data = await getSqlCpuUsage();
            context.res = {
                status: 200, /* Defaults to 200 */
                body: { "data": data }
            };
            // context.done();
            // res.status(200).json({ "data": data })
        } catch (error) {
            context.res = {
                status: 200, /* Defaults to 200 */
                body: { "message": error }
            };
            // context.done();
            // res.status(200).json({ "message": error })
        }
    }
    else if (req.method == 'GET') {
        context.res = {
            status: 200, /* Defaults to 200 */
            body: { "server": server1 }
        };
        context.done();
        // res.status(200).json({"server":server1})
    }
    else {
        context.res = {
            status: 401,
            body: { "res": "Method not allowed" }
        };
        context.done();
        // res.status(401).json({ "res": "Method not allowed" })
    }
}