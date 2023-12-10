const axios = require('axios');

module.exports = async function (context, req) {
    context.log('JavaScript HTTP trigger function processed a request.');


    const polygonApiKey = 'NfY6pfSisYjzlNVlhrc6pvpjvqaBwIkh';
    const OpenfigiApikey = 'bbb06f63-277e-4808-9d33-e0c4f9557b46';

    function flattenObject(obj, parentKey = '') {
        let flattened = {};
        for (let key in obj) {
            if (obj.hasOwnProperty(key)) {
                let newKey = parentKey ? `${parentKey}_${key}` : key;

                if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
                    Object.assign(flattened, flattenObject(obj[key], newKey));
                } else {
                    flattened[newKey] = obj[key];
                }
            }
        }
        return flattened;
    }
    async function GetOpenFigiResponse(cusip){
        const OpenfigiUrl = "https://api.openfigi.com/v3/mapping";
            const headers = {
                'X-OPENFIGI-APIKEY': OpenfigiApikey //'bbb06f63-277e-4808-9d33-e0c4f9557b46' //Openfigi Api Key
            }
            const data = [
                {
                    "idType": "ID_CUSIP",
                    "idValue": cusip //'037833100'
                }
            ]
            const requestOptions = { headers: headers };
            const OpenfigiResponse = await axios.post(OpenfigiUrl, data, requestOptions)
            context.log({ OpenfigiResponse: OpenfigiResponse.data })
            return OpenfigiResponse.data;
    }

    async function getTicker(cusip) {
        let ticker = null;
        try {
            const OpenfigiResponse = await GetOpenFigiResponse(cusip);
            ticker = OpenfigiResponse[0]?.data[0]?.ticker;
            return ticker;
        } catch (err) {
            return ticker;
        }

    }

    async function getMarketValue(ticker) {
        let marketValue = null;
        try {
            const CurrentMarketValueCloseURL = `https://api.polygon.io/v2/aggs/ticker/${ticker}/prev?adjusted=true&apiKey=${polygonApiKey}`;
            const res = await axios.get(CurrentMarketValueCloseURL);
            marketValue = res.data.results[0].c;
            context.log({ marketValue: res.data })
            return marketValue;
        } catch (err) {
            return marketValue;
        }
    }

    async function getCusipDetails(ticker) {
        const responseCusipDetails = await axios.get(`https://api.polygon.io/v3/reference/tickers/${ticker}?apiKey=${polygonApiKey}`);
        context.log({ responseCusipDetails: responseCusipDetails.data })
        return responseCusipDetails.data.results;
    }

    async function getForexDetails(Forexticker) {
        const Url = `https://api.polygon.io/v2/aggs/ticker/C:${Forexticker}/prev?adjusted=true&apiKey=${polygonApiKey}`;
        const responseForexDetails = await axios.get(Url);
        context.log({ responseForexDetails: responseForexDetails.data })
        return responseForexDetails.data.results;
    }

    // entry of the API
    if (req.method == 'POST') {
        var { cusip, Forexticker } = req.body;
        if (cusip) {
            try {
                const ticker = await getTicker(cusip);
                const marketValue = await getMarketValue(ticker);
                const CusipDetails = await getCusipDetails(ticker);
                context.log({ marketValue, CusipDetails })
                const result = flattenObject({ marketValue, ...CusipDetails });

                context.res = {
                    // status: 200, /* Defaults to 200 */
                    body: { result }
                };
            } catch (err) {
                context.res = {
                    // status: 200, /* Defaults to 200 */
                    body: { res: null }
                };
            }
        }
        if (Forexticker) {
            try {
                const ForexDetails = await getForexDetails(Forexticker);
                context.res = {
                    // status: 200, /* Defaults to 200 */
                    body: { ForexDetails }
                };
            } catch (err) {
                context.res = {
                    // status: 200, /* Defaults to 200 */
                    body: { res: null }
                };
            }
        }
    } else {
        context.res = {
            status: 400, /* Defaults to 200 */
            body: "Not allowed"
        };
    }
}