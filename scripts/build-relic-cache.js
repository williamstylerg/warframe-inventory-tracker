const fs = require("fs");
const axios = require("axios");
const path = require("path");

console.log("Script starting...");

async function buildRelicCache() {
    console.log("Fetching all relic data...");

    let response;
    try {
        response = await axios.get("https://drops.warframestat.us/data/relics.json");
    } catch (err) {
        console.error("Network request failed:", err.message);
        throw err;
    }

    console.log("Fetch complete. Status:", response.status);
    const rawRelics = response.data;
    console.log("Raw data type:", typeof rawRelics, Array.isArray(rawRelics) ? "array" : "not array");

    const relicsList = rawRelics.relics || rawRelics;
    console.log("Number of raw entries:", relicsList.length);

    const cache = {};

    for (const entry of relicsList) {
        if (!entry.tier || !entry.relicName) {
            console.log("Skipping malformed entry:", JSON.stringify(entry));
            continue;
        }

        const key = `${entry.tier.toLowerCase()} ${entry.relicName.toLowerCase()}`;
        if (!cache[key]) {
            cache[key] = {
                data: { tier: entry.tier, name: entry.relicName, rewards: {} },
                fetchedAt: Date.now()
            };
        }
        cache[key].data.rewards[entry.state] = entry.rewards;
    }

    const outputPath = path.join(__dirname, "..", "bundled-relic-cache.json");
    fs.writeFileSync(outputPath, JSON.stringify(cache, null, 2));
    console.log(`Saved ${Object.keys(cache).length} relics to`, outputPath);
}

buildRelicCache()
    .then(() => {
        console.log("Done.");
        process.exit(0);
    })
    .catch(err => {
        console.error("Failed:", err.message);
        console.error(err.stack);
        process.exit(1);
    });