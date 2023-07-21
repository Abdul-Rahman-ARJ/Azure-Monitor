const sql = require("mssql");

async function connectToDatabase(config) {
    try {
        await sql.connect(config);
        console.log("Connected to the database.");
    } catch (error) {
        console.log("Error connecting to the database:", error);
        throw error;
    }
}

async function executeQuery(query) {
    try {
        const result = await sql.query(query);
        console.log("Query executed successfully.");
        return result;
    } catch (error) {
        console.log("Error executing query:", error);
        throw error;
    }
}

module.exports = async function (context, req) {
    console.log("Post Adhoc Query function");

    if (req.method === "POST") {
        const { server, db, AdhocQuery } = req.body;
        const config = {
            server: server,
            database: db,
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
            await connectToDatabase(config);
            console.log({ server, db, AdhocQuery });

            try {
                const result = await executeQuery(AdhocQuery);
                context.res = {
                    status: 200,
                    body: result.recordset,
                };
            } catch (error) {
                console.log("Error running query:", error);
                context.res = {
                    status: 400,
                    body: `Error in query: ${AdhocQuery}`,
                };
            }
        } catch (error) {
            context.res = {
                status: 500,
                body: "Internal server error",
            };
        } finally {
            try {
                sql.close();
                console.log("Database connection closed.");
            } catch (error) {
                console.log("Error closing connection:", error);
            }
        }
    } else {
        context.res = {
            status: 401,
            body: "Not allowed",
        };
    }
};
