// importing sql module
const sql = require('mssql');

const config = {
    server: 'elastic-sqlserver002.database.windows.net',
    database: 'eton_rei_data_Qasprint2',
    user: 'atrainuser',
    password: 'rt53#$%@fgt5$3',
    options: {
        encrypt: true // if using Azure
    }
};

async function getSqlCpuUsage() {
    try {
        await sql.connect(config);

        const result = await sql.query(`
            exec sp_who2
        `);
        

        sql.close();
        return result
    } catch (err) {
        console.error(err);
    }
}



module.exports = async function (context, req) {
    context.log('JavaScript HTTP trigger function processed a request.');
    let res =await getSqlCpuUsage();
    // const name = (req.query.name || (req.body && req.body.name));
    const responseMessage = res;

    context.res = {
        // status: 200, /* Defaults to 200 */
        body: responseMessage
    };
}