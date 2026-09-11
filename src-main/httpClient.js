const axios = require("axios");

async function fetchWithRetry(url, retries = 1) {
    try {
        return await axios.get(url);
    } catch (err) {
        if (retries > 0) {
            await new Promise((r) => setTimeout(r, 1000));
            return fetchWithRetry(url, retries - 1);
        }
        throw err;
    }
}

module.exports = { fetchWithRetry };