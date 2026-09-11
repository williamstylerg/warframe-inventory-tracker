const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { app } = require("electron");
const { loadCache, saveCache } = require("../stores/inventoryStore");

const priceHistoryCachePath = path.join(app.getPath("userData"), "priceHistoryCache.json");

function ensurePriceHistoryCacheFile() {
    if (!fs.existsSync(priceHistoryCachePath)) {
        fs.writeFileSync(priceHistoryCachePath, "{}");
    }
}

function loadPriceHistoryCache() {
    ensurePriceHistoryCacheFile();
    return JSON.parse(fs.readFileSync(priceHistoryCachePath, "utf8"));
}

function savePriceHistoryCache(cache) {
    fs.writeFileSync(priceHistoryCachePath, JSON.stringify(cache, null, 2));
}

const MARKET_HEADERS = {
    "User-Agent": "Mozilla/5.0",
    Accept: "application/json",
    Platform: "pc",
    Language: "en",
    Crossplay: "true",
};

async function fetchItemDetails(slug) {
    const cache = loadCache();

    if (cache[slug]) {
        return cache[slug];
    }

    try {
        const url = `https://api.warframe.market/v2/items/${slug}`;
        const response = await axios.get(url, { headers: MARKET_HEADERS });
        const tags = response.data?.data?.tags || [];

        cache[slug] = tags;
        saveCache(cache);

        return tags;
    } catch (err) {
        console.log("Item details fetch failed for", slug, err.message);
        return [];
    }
}

async function fetchPriceForSlug(slug) {
    try {
        const url = `https://api.warframe.market/v2/orders/item/${slug}/top`;
        const response = await axios.get(url, { headers: MARKET_HEADERS });
        const json = response.data;

        if (!json.data || !json.data.sell || json.data.sell.length === 0) {
            return 0;
        }

        const sellOrders = json.data.sell
            .filter((o) => o.visible)
            .sort((a, b) => a.platinum - b.platinum);

        return sellOrders.length ? sellOrders[0].platinum : 0;
    } catch (err) {
        console.log("Price fetch failed for", slug, err.message);
        return 0;
    }
}

async function fetchPriceHistory(slug) {
    const cache = loadPriceHistoryCache();
    const key = slug.trim().toLowerCase();
    const maxAge = 1000 * 60 * 60 * 12;

    if (cache[key] && Date.now() - cache[key].fetchedAt < maxAge) {
        return cache[key].history;
    }

    const url = `https://api.warframe.market/v1/items/${slug}/statistics?include=item`;

    try {
        const response = await axios.get(url, {
            headers: { ...MARKET_HEADERS, Referer: "https://warframe.market/" },
        });
        const days90 = response.data?.payload?.statistics_closed?.["90days"] || [];

        const history = days90.map((day) => ({
            date: day.datetime,
            movingAvg: day.moving_avg,
            median: day.median,
            minPrice: day.min_price,
            maxPrice: day.max_price,
            volume: day.volume,
        }));

        cache[key] = { history, fetchedAt: Date.now() };
        savePriceHistoryCache(cache);
        return history;
    } catch (err) {
        console.log("Price history fetch failed for", slug, err.message);
        return cache[key]?.history || [];
    }
}

function inferTypeFromTags(tags) {
    if (tags.includes("mod")) return "Mod";
    if (tags.includes("warframe")) return "Warframe Part";
    if (tags.includes("weapon")) return "Weapon Part";
    if (tags.includes("arcane")) return "Arcane";
    if (tags.includes("relic")) return "Relic";
    if (tags.includes("resource")) return "Resource";
    return "Misc";
}

function inferRarityFromTags(tags) {
    if (tags.includes("rare")) return "Rare";
    if (tags.includes("uncommon")) return "Uncommon";
    if (tags.includes("common")) return "Common";
    return "Unknown";
}

module.exports = {
    fetchItemDetails,
    fetchPriceForSlug,
    fetchPriceHistory,
    inferTypeFromTags,
    inferRarityFromTags,
};