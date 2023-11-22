const axios = require('axios');

module.exports = async function (context, req) {
    try {

        const cusip = 'IBM';

        const response1 = await axios.get('https://api.polygon.io/v3/reference/dividends?apiKey=NfY6pfSisYjzlNVlhrc6pvpjvqaBwIkh');
        const response2 = await axios.get(`https://api.polygon.io/v3/reference/tickers/${cusip}?apiKey=NfY6pfSisYjzlNVlhrc6pvpjvqaBwIkh`);

        const data1 = response1.data;
        const data2 = response2.data;

        context.res = {
            status: 200,
            body: {
                dataFromAPI1: data1,
                dataFromAPI2: data2
            }
        };
    } catch (error) {
        context.res = {
            status: 500,
            body: error.message
        };
    }
}