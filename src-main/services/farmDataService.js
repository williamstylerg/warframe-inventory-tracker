const fs = require("fs");
const path = require("path");
const { app } = require("electron");
const { fetchWithRetry } = require("../httpClient");
const { getEndpointForType, assignRarityTiers, summarizeDrops } = require("../../farmLogic");
const { loadInventory, saveInventory } = require("../stores/inventoryStore");

const farmCachePath = path.join(app.getPath("userData"), "farmDataCache.json");

function ensureFarmCacheFile() {
    if (!fs.existsSync(farmCachePath)) {
        fs.writeFileSync(farmCachePath, "{}");
    }
}

function loadFarmCache() {
    ensureFarmCacheFile();
    return JSON.parse(fs.readFileSync(farmCachePath, "utf8"));
}

function saveFarmCache(cache) {
    fs.writeFileSync(farmCachePath, JSON.stringify(cache, null, 2));
}

async function clearFarmCache() {
    try {
        fs.writeFileSync(farmCachePath, "{}");
        return { success: true };
    } catch (err) {
        return { success: false, reason: err.message };
    }
}

async function fetchFarmData(setName, itemType) {
    const cache = loadFarmCache();
    const key = setName.trim().toLowerCase();
    const maxAge = 1000 * 60 * 60 * 24 * 14;

    if (cache[key] && Date.now() - cache[key].fetchedAt < maxAge) {
        return cache[key].components;
    }

    const endpoint = getEndpointForType(itemType);
    if (!endpoint) {
        return [];
    }
    const url = `https://api.warframestat.us/${endpoint}/search/${encodeURIComponent(setName)}`;

    try {
        const response = await fetchWithRetry(url);
        const results = response.data;

        const exactMatch = results.find(
            (r) => r.name.trim().toLowerCase() === setName.trim().toLowerCase(),
        );
        const match = exactMatch || results[0];
        const rawComponents = match?.components || [];
        const components = assignRarityTiers(rawComponents);

        cache[key] = {
            components,
            imageName: match?.imageName || null,
            vaulted: match?.vaulted || false,
            fetchedAt: Date.now(),
        };
        saveFarmCache(cache);
        return components;
    } catch (err) {
        console.log("Farm data fetch failed for", setName, err.message);
        return cache[key]?.components || [];
    }
}

async function fetchModFarmData(modName) {
    const cache = loadFarmCache();
    const key = "mod:" + modName.trim().toLowerCase();
    const maxAge = 1000 * 60 * 60 * 24 * 14;

    if (cache[key] && Date.now() - cache[key].fetchedAt < maxAge) {
        return cache[key].drops;
    }

    const url = `https://api.warframestat.us/mods/search/${encodeURIComponent(modName)}`;

    try {
        const response = await fetchWithRetry(url);
        const results = response.data;

        const exactMatches = results.filter(
            (r) => r.name.trim().toLowerCase() === modName.trim().toLowerCase(),
        );
        const matchesToUse = exactMatches.length > 0 ? exactMatches : results.slice(0, 1);

        const allDrops = matchesToUse.flatMap((m) => m.drops || []);
        const drops = summarizeDrops(allDrops);

        cache[key] = { drops, fetchedAt: Date.now() };
        saveFarmCache(cache);
        return drops;
    } catch (err) {
        console.log("Mod farm data fetch failed for", modName, err.message);
        return cache[key]?.drops || [];
    }
}

function isTrackableComponentServer(component, itemType) {
    if (itemType === "Warframe Part" || itemType.includes("Warframe")) {
        return ["Blueprint", "Chassis", "Neuroptics", "Systems"].includes(component.name);
    }
    return component.drops && component.drops.length > 0;
}

async function resolveTierForItem(itemName, itemType, itemSet) {
    const isWarframeType = itemType.includes("Warframe");
    const weaponTypes = [
        "Weapon", "Rifle", "Pistol", "Melee", "Shotgun", "Sentinel",
        "Archwing", "Arch-Gun", "Arch-Melee", "Secondary", "Primary",
    ];
    const isWeaponType = weaponTypes.some((t) => itemType.includes(t));

    if (!isWarframeType && !isWeaponType) return null;
    if (itemName.trim().endsWith(" Set")) return null;

    const components = await fetchFarmData(itemSet, itemType);
    let shortName = itemName.replace(itemSet, "").trim();
    if (shortName === "") shortName = "Blueprint";

    const match = components.find((c) => c.name === shortName);
    return match?.tier || null;
}

async function resolveDucatsForItem(itemName, itemType, itemSet) {
    if (!itemType.includes("Warframe") && !itemType.includes("Weapon")) return null;

    const components = await fetchFarmData(itemSet, itemType);
    let shortName = itemName.replace(itemSet, "").trim();
    if (shortName === "") shortName = "Blueprint";

    const match = components.find((c) => c.name === shortName);
    return match?.ducats ?? null;
}

async function backfillTiers() {
    let inventory = loadInventory();
    let updated = 0;

    for (const item of inventory) {
        if (!["Warframe Part", "Weapon Part"].includes(item.type)) continue;

        const tier = await resolveTierForItem(item.name, item.type, item.set);
        if (tier !== item.tier) {
            item.tier = tier;
            updated++;
        }
    }

    saveInventory(inventory);
    return { success: true, updated, total: inventory.length };
}

module.exports = {
    loadFarmCache,
    clearFarmCache,
    fetchFarmData,
    fetchModFarmData,
    isTrackableComponentServer,
    resolveTierForItem,
    resolveDucatsForItem,
    backfillTiers,
};