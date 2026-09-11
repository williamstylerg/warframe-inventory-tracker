const fs = require("fs");
const path = require("path");
const { app } = require("electron");
const { fetchWithRetry } = require("../httpClient");

const relicInventoryPath = path.join(app.getPath("userData"), "relicInventory.json");
const relicDropCachePath = path.join(app.getPath("userData"), "relicDropCache.json");

function ensureRelicInventoryFile() {
    if (!fs.existsSync(relicInventoryPath)) {
        fs.writeFileSync(relicInventoryPath, "[]");
    }
}

function loadRelicInventory() {
    ensureRelicInventoryFile();
    console.log("Reading relics from:", relicInventoryPath);
    try {
        const data = fs.readFileSync(relicInventoryPath, "utf8");
        return JSON.parse(data);
    } catch {
        return [];
    }
}

function saveRelicInventory(relics) {
    fs.writeFileSync(relicInventoryPath, JSON.stringify(relics, null, 2));
}

function addRelic(name, imageName) {
    let relics = loadRelicInventory();
    const key = name.trim().toLowerCase();
    let existing = relics.find((r) => r.name.trim().toLowerCase() === key);
    if (existing) {
        existing.quantity += 1;
    } else {
        relics.push({ name, imageName: imageName || null, quantity: 1 });
    }
    saveRelicInventory(relics);
    return relics;
}

function updateRelicQuantity(name, newQuantity) {
    let relics = loadRelicInventory();
    const key = name.trim().toLowerCase();
    const relic = relics.find((r) => r.name.trim().toLowerCase() === key);
    if (relic) {
        relic.quantity = Math.max(0, Number(newQuantity));
        if (relic.quantity === 0) {
            relics = relics.filter((r) => r.name.trim().toLowerCase() !== key);
        }
    }
    saveRelicInventory(relics);
    return relics;
}

function removeRelic(name) {
    let relics = loadRelicInventory();
    relics = relics.filter((r) => r.name.trim().toLowerCase() !== name.trim().toLowerCase());
    saveRelicInventory(relics);
    return relics;
}

function updateRelicImage(name, imageName) {
    let relics = loadRelicInventory();
    const key = name.trim().toLowerCase();
    const relic = relics.find((r) => r.name.trim().toLowerCase() === key);
    if (relic) {
        relic.imageName = imageName;
        saveRelicInventory(relics);
    }
    return relics;
}

function ensureRelicDropCacheFile() {
    if (!fs.existsSync(relicDropCachePath)) {
        const bundledPath = path.join(__dirname, "..", "..", "bundled-relic-cache.json");
        if (fs.existsSync(bundledPath)) {
            fs.copyFileSync(bundledPath, relicDropCachePath);
            console.log("Seeded relic drop cache from bundled data.");
        } else {
            fs.writeFileSync(relicDropCachePath, "{}");
        }
    }
}

function loadRelicDropCache() {
    ensureRelicDropCacheFile();
    return JSON.parse(fs.readFileSync(relicDropCachePath, "utf8"));
}

function saveRelicDropCache(cache) {
    fs.writeFileSync(relicDropCachePath, JSON.stringify(cache, null, 2));
}

async function fetchRelicDropData(relicFullName) {
    const cache = loadRelicDropCache();
    const key = relicFullName.trim().toLowerCase();
    const maxAge = 1000 * 60 * 60 * 24 * 14;

    if (cache[key] && Date.now() - cache[key].fetchedAt < maxAge) {
        return cache[key].data;
    }

    const parts = relicFullName.trim().split(" ");
    if (parts.length !== 2) {
        console.log("Unexpected relic name format:", relicFullName);
        return null;
    }
    const [tier, name] = parts;
    const url = `https://drops.warframestat.us/data/relics/${tier}/${name}.json`;

    try {
        const response = await fetchWithRetry(url);
        const data = response.data;
        cache[key] = { data, fetchedAt: Date.now() };
        saveRelicDropCache(cache);
        return data;
    } catch (err) {
        console.log("Relic drop data fetch failed for", relicFullName, err.message);
        return cache[key]?.data || null;
    }
}

async function refreshAllRelicData() {
    try {
        const response = await fetchWithRetry("https://drops.warframestat.us/data/relics.json");
        const relicsList = response.data.relics || response.data;
        const cache = {};
        let skipped = 0;

        for (const entry of relicsList) {
            if (!entry.tier || !entry.relicName) {
                skipped++;
                continue;
            }
            const key = `${entry.tier.toLowerCase()} ${entry.relicName.toLowerCase()}`;
            if (!cache[key]) {
                cache[key] = { data: { tier: entry.tier, name: entry.relicName, rewards: {} }, fetchedAt: Date.now() };
            }
            cache[key].data.rewards[entry.state] = entry.rewards;
        }

        saveRelicDropCache(cache);
        return { success: true, count: Object.keys(cache).length, skipped };
    } catch (err) {
        return { success: false, reason: err.message };
    }
}

module.exports = {
    loadRelicInventory,
    saveRelicInventory,
    addRelic,
    updateRelicQuantity,
    removeRelic,
    updateRelicImage,
    loadRelicDropCache,
    saveRelicDropCache,
    fetchRelicDropData,
    refreshAllRelicData,
};