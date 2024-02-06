const axios = require('axios');

module.exports = async function (context, req) {
    context.log('JavaScript HTTP trigger function processed a request.');

    const polygonApiKey = process.env.POLYGON_API_KEY;
    const OpenfigiApikey = process.env.OPENFIGI_API_KEY; //'bbb06f63-277e-4808-9d33-e0c4f9557b46';

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
        if (address) {
            query = `address:\"${address}\" OR `;
            if (address && city) {
                query += `city:${city}  OR `
            }
            if (address && country) {
                query += `country:${country}  OR `
            }
            if (address && postal) {
                query += `postalCode:${postal}`
            }
        }
        context.log(query);

        const token = process.env.PROPERTY_API_TOKEN;
        // 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1MWNtbGF6ZDhnd3MyZGdpc2dzY2t0OHYzbHMxb2ZlZSIsImlzcyI6ImRhdGFmaW5pdGkuY28ifQ.fZsTRRMIdaEKLVauyq4iARGngcbUYW2OAYMgb8eOPQbE1SOpcEKyQca5BntWlSJrbndwkX_cwpwdrGcwWBao4y5q8XVi-BTOG3TIvxTo5Rh3jSyHVJXyemlKObMqdf4PR4LmI4Chh1FevAapA_YLJRvgwZXzJnTzM7VUvMYCd5xPV0ywnz8OhKnKJt3L6LErfQTb9bfPBmyNzpWwq6OyL6FxwCO2WIvK7nZdZIzebWDt-26E3loy0RT8hwZcK1xnO27-eouQwPW3fWqDuyB-q-TUtXIt8ZO3FRZjHSTvgfwr8NrEsp44_mMk8nmEDSbj4SWAHH1PPXeselwjzk2LzCT3uABJamRnK7TRVSvGAM5CCk0QfkFKC8CROx-bNRIJtN2UQwd1iOE-RjfxgT_dkTgzwq1obFWx0Aub29xoKWt2T3vOOab-cxHcc6ZfIumpSd3SWtzqiM4lcRBdtvXVr6R61BCs-f8nnCF-iBKFRouz0oc8vYaWnq0fug6mycZSYjIfLHmmMs27kTKyeaCGp0knm0uMxcz3xP1jMBw0Kq7j1-gBj3hpLan0cwnpNnP1UewUYimBLP-TqCTeupPtRXqXKK88l4nGsi9SQehqgJsh3F_eN4nbUv7kGtQ27R5LYCnPEQ9vpq-sxt2dgThSLlTaoewNj2Wr0sy9Conj7UA'
        const data = {
            "query": query,
            "num_records": 5
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

    async function GetPeopleDetails(fname, lname, email) {
        context.log("Inside GetPeopleDetails function");
        var query = '';
        if (fname) {
            query = `firstName:\"${fname}\" OR `;
            if (fname && lname) {
                query += `lastName:\"${lname}\"  OR `
            }
            if (fname && email) {
                query += ` AND emails:\"${email}\"`
            }
        }
        context.log(query);

        const token = process.env.PROPERTY_API_TOKEN;
        // const token = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1MWNtbGF6ZDhnd3MyZGdpc2dzY2t0OHYzbHMxb2ZlZSIsImlzcyI6ImRhdGFmaW5pdGkuY28ifQ.fZsTRRMIdaEKLVauyq4iARGngcbUYW2OAYMgb8eOPQbE1SOpcEKyQca5BntWlSJrbndwkX_cwpwdrGcwWBao4y5q8XVi-BTOG3TIvxTo5Rh3jSyHVJXyemlKObMqdf4PR4LmI4Chh1FevAapA_YLJRvgwZXzJnTzM7VUvMYCd5xPV0ywnz8OhKnKJt3L6LErfQTb9bfPBmyNzpWwq6OyL6FxwCO2WIvK7nZdZIzebWDt-26E3loy0RT8hwZcK1xnO27-eouQwPW3fWqDuyB-q-TUtXIt8ZO3FRZjHSTvgfwr8NrEsp44_mMk8nmEDSbj4SWAHH1PPXeselwjzk2LzCT3uABJamRnK7TRVSvGAM5CCk0QfkFKC8CROx-bNRIJtN2UQwd1iOE-RjfxgT_dkTgzwq1obFWx0Aub29xoKWt2T3vOOab-cxHcc6ZfIumpSd3SWtzqiM4lcRBdtvXVr6R61BCs-f8nnCF-iBKFRouz0oc8vYaWnq0fug6mycZSYjIfLHmmMs27kTKyeaCGp0knm0uMxcz3xP1jMBw0Kq7j1-gBj3hpLan0cwnpNnP1UewUYimBLP-TqCTeupPtRXqXKK88l4nGsi9SQehqgJsh3F_eN4nbUv7kGtQ27R5LYCnPEQ9vpq-sxt2dgThSLlTaoewNj2Wr0sy9Conj7UA'
        const data = {
            "query": query,
            "num_records": 5
        }
        const config = {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        };
        try {
            const responsePropertyDetails = await axios.post('https://api.datafiniti.co/v4/people/search', data, config);
            context.log({ responsePropertyDetails: responsePropertyDetails.data });
            return responsePropertyDetails.data.records;
        } catch (error) {
            // Handle the error appropriately
            if (error.response) {
                // The request was made and the server responded with a status code that falls out of the range of 2xx
                context.log('Server Error:', error.response.data);
                context.log('Status:', error.response.status);
                context.log('Headers:', error.response.headers);
            } else if (error.request) {
                // The request was made but no response was received
                context.log('No response received:', error.request);
            } else {
                // Something happened in setting up the request that triggered the error
                context.log('Error setting up the request:', error.message);
            }
            // Return an appropriate error message or handle the error condition as needed
            return 'An error occurred while fetching property details';
        }
    }

    async function GetqueryResponse(query){
        const config = {
            headers: {
                'Ocp-Apim-Subscription-Key': `4ce55ccdea3540aa8356e3e75e8f50dc`,//TODO take from env 
                'Content-Type': 'application/json'
            }
        };
        const response = await axios.get(`https://api.bing.microsoft.com/v7.0/search?responseFilter=Webpages&q=${query}`, config);
        context.log({ responseGetqueryResponse: response.data.webPages.value });
            return response.data.webPages.value;
    }

    // ===================================================Entry of the API======================================================================================//

    if (req.method == 'POST') {
        const { cusip, Forexticker, days, startdate, enddate, Indexticker, address, city, country, postal, fname, lname, email, query} = req.body;
        context.log({ cusip, Forexticker, days, startdate, enddate, Indexticker, address, city, country, postal, fname, lname, email, query })
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
                context.log({ PropertyDetails })
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
        if (fname) {
            try {
                context.log("Inside Fname con")
                const PeopleDetails = await GetPeopleDetails(fname, lname, email);
                context.log({ PeopleDetails })
                context.res = {
                    // status: 200, /* Defaults to 200 */
                    body: { PeopleDetails }
                };
            } catch (err) {
                context.res = {
                    // status: 200, /* Defaults to 200 */
                    body: { res: null }
                };
            }
        }
        if(query){
            try {
                context.log("Inside query Condition")
                const queryResponse = await GetqueryResponse(query);
                context.log({ queryResponse })
                context.res = {
                    // status: 200, /* Defaults to 200 */
                    body: { queryResponse }
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