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
    async function GetOpenFigiResponse(cusip) {
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

    async function getIndextickerDetails(ticker, startdate, enddate) {
        // const responseCusipDetails = await axios.get(`https://api.polygon.io/v2/aggs/ticker/I:${ticker}/prev?apiKey=${polygonApiKey}`);
        if (startdate && enddate) {
            const responseCusipDetails = await axios.get(`https://api.polygon.io/v2/aggs/ticker/I:${ticker}/range/1/day/${startdate}/${enddate}?sort=asc&limit=120&apiKey=${polygonApiKey}`);
            context.log({ responseCusipDetails: responseCusipDetails.data });
            return responseCusipDetails.data.results;
        } else {
            const responseCusipDetails = await axios.get(`https://api.polygon.io/v2/aggs/ticker/I:${ticker}/prev?apiKey=${polygonApiKey}`);
            context.log({ responseCusipDetails: responseCusipDetails.data });
            return responseCusipDetails.data.results;
        }
    }

    async function GetCusipMaretSector(cusip) {
        const res = GetOpenFigiResponse(cusip);
        context.log({ res })
        return res;
    }

    function convertData(inputData) {
        // Function to convert timestamp to date
        function convertTimestampToDate(timestamp) {
            return new Date(timestamp).toISOString().split('T')[0];
        }

        // Function to convert and rename keys
        function convertAndRename(item) {
            return {
                date: convertTimestampToDate(item.t),
                volume: item.v,
                close_price: item.c,
                highest_price: item.h,
                no_of_transactions: item.n,
                volume_weighted: item.vw
            };
        }

        // Removing the old keys
        function removeOldKeys(item) {
            delete item.v;
            delete item.c;
            delete item.h;
            delete item.n;
            delete item.vw;
            return item;
        }

        const modifiedData = inputData.map(item => convertAndRename(item));
        const updatedData = modifiedData.map(item => removeOldKeys(item));

        return updatedData;
    }

    function getLastNthDay(n) {
        const today = new Date();
        const lastDate = new Date(today);
        lastDate.setDate(today.getDate() - n + 1);

        return lastDate.toISOString().split('T')[0];
    }

    async function getForexDetails(Forexticker, days, startdate, enddate) {
        // const Url = `https://api.polygon.io/v2/aggs/ticker/C:${Forexticker}/prev?adjusted=true&apiKey=${polygonApiKey}`;
        const today = new Date().toISOString().slice(0, 10);
        const previous7thWorkingDay = getPrevious7thWorkingDay(today);
        context.log({ days, today: today, previous7thWorkingDay })
        if (days) {
            const prevDate = getLastNthDay(days);
            context.log(prevDate)
            const Url = `https://api.polygon.io/v2/aggs/ticker/C:${Forexticker}/range/1/day/${prevDate}/${today}?adjusted=true&sort=asc&limit=120&apiKey=${polygonApiKey}`;
            const responseForexDetails = await axios.get(Url);
            const updatedjson = convertData(responseForexDetails.data.results);
            context.log({ prevDate, days, Url, updatedjson })
            return updatedjson;
        } else if (startdate && enddate) {
            context.log({ startdate, enddate })
            const Url = `https://api.polygon.io/v2/aggs/ticker/C:${Forexticker}/range/1/day/${startdate}/${enddate}?adjusted=true&sort=asc&limit=120&apiKey=${polygonApiKey}`;
            const responseForexDetails = await axios.get(Url);
            const updatedjson = convertData(responseForexDetails.data.results);
            context.log({ updatedjson })
            return updatedjson;
        }
        else {
            const last7thday = getLastNthDay(7);
            const Url = `https://api.polygon.io/v2/aggs/ticker/C:${Forexticker}/range/1/day/${last7thday}/${today}?adjusted=true&sort=asc&limit=120&apiKey=${polygonApiKey}`;
            const responseForexDetails = await axios.get(Url);
            const updatedjson = convertData(responseForexDetails.data.results);
            context.log({ updatedjson })
            return updatedjson;
        }
    }

    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function getPrevious7thWorkingDay(today) {
        const weekdays = [1, 2, 3, 4, 5];

        const isWorkingDay = (date) => weekdays.includes(date.getDay());

        let count = 0;
        let previous7thWorkingDay = new Date(today);

        while (count < 7) {
            previous7thWorkingDay.setDate(previous7thWorkingDay.getDate() - 1);

            if (isWorkingDay(previous7thWorkingDay)) {
                count++;
            }
        }

        return formatDate(previous7thWorkingDay);
    }
    async function GetPropertyDetails(address, city, country, postal) {
        var query = '';
        if(address){
            query = `address:\"${address}\" OR `;
            if(address && city){
                query += `city:${city}  OR `
            }
            if(address && country){
                query += `country:${country}  OR `
            }
            if(address && postal){
                query += `postalCode:${postal}`
            }
        }
        context.log(query);

        const token = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ6eXI1dGt3MzR0ejh2NnR0bnI0bTY5NnE2MTIweXgzNSIsImlzcyI6ImRhdGFmaW5pdGkuY28ifQ.Z-U0RLY576RrWYRFP0m5TfZYfaf4Pg7qKlD7hG5RhQDz-NYTZmQLOQBBhWkdRKLRGNzFJ85tiOhuS50RO4zdsROIY_f_GrwcrjjSA8iKCopiE2D_jmfmeR7ZgQprDDVEyOwe5ZyEXH7lBEX6oP9X9k5ELTN0UvdL1PtaGb-sfXTWIN9U3yA5peQSernjS8H8S6kYKcizt38ZQVwHdiv28ECUfEUSGYGJE4r3LUMCxcQnMlzV5XSqOGu6vgL_F45lO0wHDL1G-w1Z_z0XJCKnehyRk8IekNo1XJojz5UaJfPuGRIp0si0UjG6739WyCUiuezjbS-FSUc22zMkjVAfANuTX8jZ32r32a_AatiwHc3NjGlEZEtg9qzwa4Lr0D_h0yyyAlykUBnC08aDit6Uw9kZ37zmmb0AQByLkaWAYCLKQXRc6zMVVai7kk9iiIA3yRWiZuOClrRRjwaaFmsPHc0QSPQOwOMmeJp8lCZ67Abse82ez11ouC51F9n9cKbqHvX4Omwv7xm8gW8dQINMkhScQWNHE6HHaIeFBvwHwFxGaf193rmjoyrS9xruYV_af_fkpAvm6rXoBt41ZUCHB7mUVpju4pJJhxgKc97oqD8p1PJfjuXrY36zjMvTjjLzD5ISgxwX6Yp9SYy6_CDExKDkSsC9SjHXuifEJxvA650'
        const data = {
            "query": query,
            "num_records": 10
        }
        const config = {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        };
        if (address) {
            const responsePropertyDetails = await axios.post('https://api.datafiniti.co/v4/properties/search', data, config);
            context.log({ responsePropertyDetails: responsePropertyDetails.data });
            return responsePropertyDetails.data.records;
        }
    }

    // entry of the API
    if (req.method == 'POST') {
        const { cusip, Forexticker, days, startdate, enddate, Indexticker, address, city, country, postal } = req.body;
        context.log({ cusip, Forexticker, days, startdate, enddate, Indexticker, address, city, country, postal })
        if (cusip) {
            const OpenfigiResponse = await GetOpenFigiResponse(cusip);
            const getType = OpenfigiResponse[0]?.data[0]?.marketSector;
            context.log({ getType })

            if (cusip && getType === 'Equity') {
                try {
                    const ticker = await getTicker(cusip);
                    const marketValue = await getMarketValue(ticker);
                    const CusipDetails = await getCusipDetails(ticker);
                    context.log({ marketValue, CusipDetails })
                    const result = flattenObject({ marketValue, ...CusipDetails, OpenfigiResponse: OpenfigiResponse[0]?.data[0] });

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
            } else if (cusip && getType !== 'Equity') {
                context.log({ result: OpenfigiResponse[0]?.data[0] })
                context.res = {
                    // status: 200, /* Defaults to 200 */
                    body: { result: OpenfigiResponse[0]?.data[0] }
                };
            }
        }
        if (Forexticker) {
            try {
                const ForexDetails = await getForexDetails(Forexticker, days, startdate, enddate);
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
        if (Indexticker) {
            try {
                const IndextickerDetails = await getIndextickerDetails(Indexticker, startdate, enddate);
                context.res = {
                    // status: 200, /* Defaults to 200 */
                    body: { IndextickerDetails }
                };
            } catch (err) {
                context.res = {
                    // status: 200, /* Defaults to 200 */
                    body: { res: null }
                };
            }
        }
        if (address) {
            try {
                const PropertyDetails = await GetPropertyDetails(address, city, country, postal);
                context.log({PropertyDetails})
                context.res = {
                    // status: 200, /* Defaults to 200 */
                    body: { PropertyDetails }
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