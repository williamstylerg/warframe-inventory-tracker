const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const axios = require("axios");

app.setName("Warframe Inventory Tracker"); 

let mainWindow;

// Cache Helper
function ensureCacheFile() {
    if (!fs.existsSync(cachePath)) {
        fs.writeFileSync(cachePath, "{}");
    }
}

function loadCache() {
    ensureCacheFile();
    return JSON.parse(fs.readFileSync(cachePath, "utf8"));
}

function saveCache(cache) {
    fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
}

// Path to inventory.json in userData (writable, persistent)
const inventoryPath = path.join(app.getPath("userData"), "inventory.json");

// Ensure inventory file exists
function ensureInventoryFile() {
    if (!fs.existsSync(inventoryPath)) {
        fs.writeFileSync(inventoryPath, "[]");
    }
}

// ------------------------------
// Cache for item tags
// ------------------------------

const cachePath = path.join(app.getPath("userData"), "itemCache.json");

function ensureCacheFile() {
    if (!fs.existsSync(cachePath)) {
        fs.writeFileSync(cachePath, "{}");
    }
}

function loadCache() {
    ensureCacheFile();
    return JSON.parse(fs.readFileSync(cachePath, "utf8"));
}

function saveCache(cache) {
    fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
}

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

// dev tool for clearing cache

async function clearFarmCache() {
    try {
        fs.writeFileSync(farmCachePath, "{}");
        return { success: true };
    } catch (err) {
        return { success: false, reason: err.message };
    }
}

//-----------------------------
// Fetching Price History from Warframe.Market
//-----------------------------

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

async function fetchPriceHistory(slug) {
    const cache = loadPriceHistoryCache();
    const key = slug.trim().toLowerCase();
    const maxAge = 1000 * 60 * 60 * 12; // 12 hours — this data updates daily server-side, no need to refetch constantly

    if (cache[key] && (Date.now() - cache[key].fetchedAt) < maxAge) {
        return cache[key].history;
    }

    const url = `https://api.warframe.market/v1/items/${slug}/statistics?include=item`;

    try {
        const response = await axios.get(url, {
            headers: {
                "User-Agent": "Mozilla/5.0",
                "Accept": "application/json",
                "Platform": "pc",
                "Language": "en",
                "Crossplay": "true",
                "Referer": "https://warframe.market/" 
            }
        });
        const days90 = response.data?.payload?.statistics_closed?.["90days"] || [];

        const history = days90.map(day => ({
            date: day.datetime,
            movingAvg: day.moving_avg,
            median: day.median,
            minPrice: day.min_price,
            maxPrice: day.max_price,
            volume: day.volume
        }));

        cache[key] = { history, fetchedAt: Date.now() };
        savePriceHistoryCache(cache);
        return history;

    } catch (err) {
        console.log("Price history fetch failed for", slug, err.message);
        return cache[key]?.history || [];
    }
}

//-----------------------------
// Fetching Farm from WFCD API
//-----------------------------

async function fetchWithRetry(url, retries = 1) {
    try {
        return await axios.get(url);
    } catch (err) {
        if (retries > 0) {
            await new Promise(r => setTimeout(r, 1000)); // wait 1 second
            return fetchWithRetry(url, retries - 1);
        }
        throw err;
    }
}

function summarizeDrops(drops) {
    const bestByRelic = {};

    for (const drop of drops) {
        // Strip "(Exceptional)", "(Flawless)", "(Radiant)" to get the base relic name
        const baseRelicName = drop.location.replace(/\s*\((Intact|Exceptional|Flawless|Radiant)\)\s*$/i, "").trim();

        if (!bestByRelic[baseRelicName] || drop.chance > bestByRelic[baseRelicName].chance) {
            bestByRelic[baseRelicName] = {
                relic: baseRelicName,
                chance: drop.chance,
                rarity: drop.rarity
            };
        }
    }

    // Return as an array, sorted by chance descending (best odds first)
    return Object.values(bestByRelic).sort((a, b) => b.chance - a.chance);
}

    // Function for rarity based on drop rate

function median(numbers) {
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
        ? sorted[mid]
        : (sorted[mid - 1] + sorted[mid]) / 2;
}

function chanceToTier(chance) {
    if (chance === undefined || chance === null) return null;
    if (chance <= 15) return "gold";
    if (chance <= 22.665) return "silver";
    return "bronze";
}

function assignRarityTiers(components) {
    return components.map(comp => {
        const summarized = summarizeDrops(comp.drops || []);
        if (summarized.length === 0) return { ...comp, tier: null };

        const medianChance = median(summarized.map(d => d.chance));
        return { ...comp, tier: chanceToTier(medianChance) };
    });
}

    // Fetch farm data for mods

async function fetchModFarmData(modName) {
    const cache = loadFarmCache();
    const key = "mod:" + modName.trim().toLowerCase();
    const maxAge = 1000 * 60 * 60 * 24 * 14;

    if (cache[key] && (Date.now() - cache[key].fetchedAt) < maxAge) {
        return cache[key].drops;
    }

    const url = `https://api.warframestat.us/mods/search/${encodeURIComponent(modName)}`;

    try {
        const response = await fetchWithRetry(url);
        const results = response.data;

        const exactMatches = results.filter(
            r => r.name.trim().toLowerCase() === modName.trim().toLowerCase()
        );
        const matchesToUse = exactMatches.length > 0 ? exactMatches : results.slice(0, 1);

        const allDrops = matchesToUse.flatMap(m => m.drops || []);
        const drops = summarizeDrops(allDrops);

        cache[key] = { drops, fetchedAt: Date.now() };
        saveFarmCache(cache);
        return drops;

    } catch (err) {
        console.log("Mod farm data fetch failed for", modName, err.message);
        return cache[key]?.drops || [];
    }
}

    // This calls the farm data from the com dev api

function getEndpointForType(itemType) {
    if (itemType.includes("Warframe")) return "warframes";
    if (itemType === "Mod") return "mods";
    const weaponTypes = ["Weapon", "Rifle", "Pistol", "Melee", "Shotgun", "Sentinel", "Archwing", "Archgun", "Archmelee", "Secondary", "Primary"];
    if (weaponTypes.some(t => itemType.includes(t))) return "weapons";
    return null;
}

async function fetchFarmData(setName, itemType) {
    const cache = loadFarmCache();
    const key = setName.trim().toLowerCase();
    const maxAge = 1000 * 60 * 60 * 24 * 14; // 14 days

    if (cache[key] && (Date.now() - cache[key].fetchedAt) < maxAge) {
        return cache[key].components;
    }

    const endpoint = getEndpointForType(itemType);

    if (!endpoint) {
        return []; // no farm-data lookup available for this item type (Mod, Arcane, Relic, Resource, etc.)
    }
    const url = `https://api.warframestat.us/${endpoint}/search/${encodeURIComponent(setName)}`;

    try {
        const response = await fetchWithRetry(url);
        const results = response.data;

        const exactMatch = results.find(
            r => r.name.trim().toLowerCase() === setName.trim().toLowerCase()
        );
        const match = exactMatch || results[0];
        const rawComponents = match?.components || [];
        const components = assignRarityTiers(rawComponents);

        cache[key] = { components, imageName: match?.imageName || null, fetchedAt: Date.now() };
        saveFarmCache(cache);
        return components;

    } catch (err) {
        console.log("Farm data fetch failed for", setName, err.message);
        return cache[key]?.components || [];
    }
}

    // This calls the mods
async function fetchModFarmData(modName) {
    const cache = loadFarmCache();
    const key = "mod:" + modName.trim().toLowerCase();
    const maxAge = 1000 * 60 * 60 * 24 * 14;

    if (cache[key] && (Date.now() - cache[key].fetchedAt) < maxAge) {
        return cache[key].drops;
    }

    const url = `https://api.warframestat.us/mods/search/${encodeURIComponent(modName)}`;

    try {
        const response = await axios.get(url);
        const results = response.data;

        // Mods can have multiple entries with the exact same name (mastery-rank drain tiers)
        // Combine drops across all exact matches rather than picking just one
        const exactMatches = results.filter(
            r => r.name.trim().toLowerCase() === modName.trim().toLowerCase()
        );
        const matchesToUse = exactMatches.length > 0 ? exactMatches : results.slice(0, 1);

        const allDrops = matchesToUse.flatMap(m => m.drops || []);
        const drops = summarizeDrops(allDrops);

        cache[key] = { drops, fetchedAt: Date.now() };
        saveFarmCache(cache);
        return drops;

    } catch (err) {
        console.log("Mod farm data fetch failed for", modName, err.message);
        return cache[key]?.drops || [];
    }
}

// rarity helper
async function resolveTierForItem(itemName, itemType, itemSet) {
    const isWarframeType = itemType.includes("Warframe");
    const weaponTypes = ["Weapon", "Rifle", "Pistol", "Melee", "Shotgun", "Sentinel", "Archwing", "Archgun", "Archmelee", "Secondary", "Primary"];
    const isWeaponType = weaponTypes.some(t => itemType.includes(t));

    if (!isWarframeType && !isWeaponType) return null;
    if (itemName.trim().endsWith(" Set")) return null; // whole combined sets have no tier

    const components = await fetchFarmData(itemSet, itemType);
    let shortName = itemName.replace(itemSet, "").trim();
    if (shortName === "") shortName = "Blueprint"; // name collapsed to just the set = this IS the Blueprint

    const match = components.find(c => c.name === shortName);
    return match?.tier || null;
}

// Load inventory
function loadInventory() {
    ensureInventoryFile();

    try {
        const data = fs.readFileSync(inventoryPath, "utf8");
        let inventory = JSON.parse(data);

        // Backfill ONLY missing fields — never overwrite API metadata
        for (const item of inventory) {

            if (!item.type) item.type = "Misc";
            if (!item.rarity) item.rarity = "Unknown";
            if (item.vaulted === undefined) item.vaulted = false;

            if (!item.set) {
                const parts = item.name.split(" ");
                item.set = parts.length > 1 ? parts[0] + " " + parts[1] : parts[0];
            }

            if (!item.lastUpdated) item.lastUpdated = Date.now();
        }

        saveInventory(inventory);
        return inventory;

    } catch {
        return [];
    }
}

// Save inventory
function saveInventory(inventory) {
    fs.writeFileSync(inventoryPath, JSON.stringify(inventory, null, 2));
}

// Recompute Rarity Tiers
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


// ------------------------------
// Backup / Restore
// ------------------------------

async function exportBackup() {
    const inventory = loadInventory();
    const buildTracker = loadBuildTracker();

    const backup = {
        appVersion: app.getVersion(),
        exportedAt: Date.now(),
        inventory,
        buildTracker
    };

    const result = await dialog.showSaveDialog(mainWindow, {
        title: "Export Backup",
        defaultPath: `warframe-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`,
        filters: [{ name: "JSON Backup", extensions: ["json"] }]
    });

    if (result.canceled) {
        return { success: false, reason: "Export cancelled." };
    }

    fs.writeFileSync(result.filePath, JSON.stringify(backup, null, 2));
    return { success: true, path: result.filePath };
}

async function importBackup() {
    const result = await dialog.showOpenDialog(mainWindow, {
        title: "Import Backup",
        filters: [{ name: "JSON Backup", extensions: ["json"] }],
        properties: ["openFile"]
    });

    if (result.canceled || result.filePaths.length === 0) {
        return { success: false, reason: "Import cancelled." };
    }

    try {
        const raw = fs.readFileSync(result.filePaths[0], "utf8");
        const backup = JSON.parse(raw);

        if (!Array.isArray(backup.inventory) || !Array.isArray(backup.buildTracker)) {
            return { success: false, reason: "This file doesn't look like a valid backup." };
        }

        saveInventory(backup.inventory);
        saveBuildTracker(backup.buildTracker);

        return { success: true, inventory: backup.inventory, buildTracker: backup.buildTracker };
    } catch (err) {
        return { success: false, reason: "Couldn't read that file: " + err.message };
    }
}

// Auto backup on app close
app.on("before-quit", (event) => {
    event.preventDefault();

    try {
        const inventory = loadInventory();
        const buildTracker = loadBuildTracker();
        const backup = {
            appVersion: app.getVersion(),
            exportedAt: Date.now(),
            inventory,
            buildTracker
        };

        const autoBackupPath = path.join(app.getPath("userData"), "auto-backup.json");
        fs.writeFileSync(autoBackupPath, JSON.stringify(backup, null, 2));
        console.log("Auto-backup saved to:", autoBackupPath);
    } catch (err) {
        console.log("Auto-backup failed:", err.message);
    }

    app.exit();
});

// Resore auto backup

async function restoreAutoBackup() {
    const autoBackupPath = path.join(app.getPath("userData"), "auto-backup.json");

    if (!fs.existsSync(autoBackupPath)) {
        return { success: false, reason: "No auto-backup found." };
    }

    try {
        const raw = fs.readFileSync(autoBackupPath, "utf8");
        const backup = JSON.parse(raw);

        if (!Array.isArray(backup.inventory) || !Array.isArray(backup.buildTracker)) {
            return { success: false, reason: "The auto-backup file looks corrupted." };
        }

        saveInventory(backup.inventory);
        saveBuildTracker(backup.buildTracker);

        return {
            success: true,
            inventory: backup.inventory,
            buildTracker: backup.buildTracker,
            exportedAt: backup.exportedAt
        };
    } catch (err) {
        return { success: false, reason: "Couldn't read the auto-backup: " + err.message };
    }
}

// combine set logic
async function combineSetComponents(setName) {
    let inventory = loadInventory();

    // Get this set's required components (reuses your existing farm-data cache)
    const components = await fetchFarmData(setName, "Warframe Part");

    // Only real trackable parts have ducats — filters out things like Orokin Cell
    const requiredParts = components.filter(c => c.ducats !== undefined);

    if (requiredParts.length === 0) {
        return { success: false, reason: "No trackable components found for this set." };
    }

    // For each required part, find the matching inventory item and its quantity
    const partEntries = requiredParts.map(part => {
        const fullName = `${setName} ${part.name}`;
        const key = normalizeName(fullName);
        const invItem = inventory.find(i => normalizeName(i.name) === key);
        return { fullName, invItem, quantity: invItem ? invItem.quantity : 0 };
    });

    // How many complete sets can we build? Limited by the scarcest component.
    const completeSets = Math.min(...partEntries.map(p => p.quantity));

    if (completeSets < 1) {
        return { success: false, reason: "Not all components are owned yet." };
    }

    // Decrement/remove each component by the number of sets being combined
    for (const part of partEntries) {
        part.invItem.quantity -= completeSets;
    }
    inventory = inventory.filter(i => i.quantity > 0);

    // Find or create the merged set entry
    const setKey = normalizeName(setName + " Set");
    let setEntry = inventory.find(i => normalizeName(i.name) === setKey);

    // Resolve the set's own market slug for pricing
    const setSlug = setName.trim().toLowerCase().replace(/\s+/g, "_") + "_set";

    if (setEntry) {
        setEntry.quantity += completeSets;
    } else {
        setEntry = {
            name: `${setName} Set`,
            slug: setSlug,
            quantity: completeSets,
            price: 0,
            type: "Warframe Part",
            rarity: "Unknown",
            vaulted: false,
            set: setName,
            lastUpdated: Date.now()
        };
        inventory.push(setEntry);
    }

    setEntry.price = await fetchPriceForSlug(setSlug);
    setEntry.lastUpdated = Date.now();

    saveInventory(inventory);
    return { success: true, setsCreated: completeSets, inventory };
}

// Create the main window
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, "preload.js")
        },
        title: "Warframe Inventory Tracker"
    });

    mainWindow.loadFile("dashboard.html");
}

// Normalize item names (remove " Blueprint")
function normalizeName(name) {
    return name
        .trim()
        .toLowerCase()
        .replace(/\s+blueprint$/i, "")   // strip trailing "blueprint", any casing
        .replace(/\s+/g, " ");            // collapse multiple spaces into one
}

// Fetch price from Warframe Market v2 orders endpoint
async function fetchPriceForSlug(slug) {
    try {
        const url = `https://api.warframe.market/v2/orders/item/${slug}/top`;

        const response = await axios.get(url, {
            headers: {
                "User-Agent": "Mozilla/5.0",
                "Accept": "application/json",
                "Platform": "pc",
                "Language": "en",
                "Crossplay": "true"
            }
        });

        const json = response.data;

        if (!json.data || !json.data.sell || json.data.sell.length === 0) {
            return 0;
        }

        const sellOrders = json.data.sell
            .filter(o => o.visible)
            .sort((a, b) => a.platinum - b.platinum);

        return sellOrders.length ? sellOrders[0].platinum : 0;
    } catch (err) {
        console.log("Price fetch failed for", slug, err.message);
        return 0;
    }
}

// Fetch item details (tags)
async function fetchItemDetails(slug) {
    const cache = loadCache();

    // If cached, return immediately
    if (cache[slug]) {
        return cache[slug];
    }

    // Otherwise fetch from API
    try {
        const url = `https://api.warframe.market/v2/items/${slug}`;
        const response = await axios.get(url, {
            headers: {
                "User-Agent": "Mozilla/5.0",
                "Accept": "application/json",
                "Platform": "pc",
                "Language": "en",
                "Crossplay": "true"
            }
        });

        const tags = response.data?.data?.tags || [];

        // Save to cache
        cache[slug] = tags;
        saveCache(cache);

        return tags;

    } catch (err) {
        console.log("Item details fetch failed for", slug, err.message);
        return [];
    }
}

// Infer type from tags
function inferTypeFromTags(tags) {
    if (tags.includes("warframe")) return "Warframe Part";
    if (tags.includes("weapon")) return "Weapon Part";
    if (tags.includes("mod")) return "Mod";
    if (tags.includes("arcane")) return "Arcane";
    if (tags.includes("relic")) return "Relic";
    if (tags.includes("resource")) return "Resource";
    return "Misc";
}

// Infer rarity from tags
function inferRarityFromTags(tags) {
    if (tags.includes("rare")) return "Rare";
    if (tags.includes("uncommon")) return "Uncommon";
    if (tags.includes("common")) return "Common";
    return "Unknown";
}

// ------------------------------
// Build Tracker storage
// ------------------------------

const buildTrackerPath = path.join(app.getPath("userData"), "buildTracker.json");

function ensureBuildTrackerFile() {
    if (!fs.existsSync(buildTrackerPath)) {
        fs.writeFileSync(buildTrackerPath, "[]");
    }
}

function loadBuildTracker() {
    ensureBuildTrackerFile();
    try {
        const data = fs.readFileSync(buildTrackerPath, "utf8");
        return JSON.parse(data);
    } catch {
        return [];
    }
}

function saveBuildTracker(list) {
    fs.writeFileSync(buildTrackerPath, JSON.stringify(list, null, 2));
}

// ------------------------------
// IPC handlers
// ------------------------------

// Backup - export and import and auto restore
ipcMain.handle("backup:export", async () => await exportBackup());
ipcMain.handle("backup:import", async () => await importBackup());
ipcMain.handle("backup:restoreAuto", async () => await restoreAutoBackup());

// clear cache
ipcMain.handle("cache:clearFarmData", async () => await clearFarmCache());

// recompute tiers
ipcMain.handle("inventory:backfillTiers", async () => await backfillTiers());

// Combine components
ipcMain.handle("inventory:combineSet", async (event, { setName }) => {
    return await combineSetComponents(setName);
});

// Get full inventory
ipcMain.handle("inventory:get", () => loadInventory());

// Get image
ipcMain.handle("item:getImage", async (event, { name, type }) => {
    const cache = loadFarmCache();
    const key = name.trim().toLowerCase();

    if (cache[key]?.imageName) {
        return cache[key].imageName;
    }

    // Not cached yet — trigger a normal farm-data fetch, which will populate it
    await fetchFarmData(name, type);
    const refreshedCache = loadFarmCache();
    return refreshedCache[key]?.imageName || null;
});

// Add item
ipcMain.handle("inventory:add", async (event, { name, slug }) => {
    let inventory = loadInventory();
    const resolvedSlug = (slug || "").trim();

    const tags = await fetchItemDetails(resolvedSlug);

    let existing = inventory.find(i =>
        i.slug.trim().toLowerCase() === resolvedSlug.trim().toLowerCase()
    );

    const setName = (() => {
        const parts = name.split(" ");
        return parts.length > 1 ? parts[0] + " " + parts[1] : parts[0];
    })();

    const itemType = inferTypeFromTags(tags);
    const tier = await resolveTierForItem(name.replace(" Blueprint", ""), itemType, setName);

    if (existing) {
        existing.quantity += 1;
        existing.type = itemType;
        existing.rarity = inferRarityFromTags(tags);
        existing.vaulted = tags.includes("vaulted");
        existing.set = setName;
        existing.tier = tier;
    } else {
        existing = {
            name: name.replace(" Blueprint", ""),
            slug: resolvedSlug,
            quantity: 1,
            price: 0,
            type: itemType,
            rarity: inferRarityFromTags(tags),
            vaulted: tags.includes("vaulted"),
            set: setName,
            tier: tier,
            lastUpdated: Date.now()
        };
        inventory.push(existing);
    }

    existing.price = await fetchPriceForSlug(resolvedSlug);
    existing.lastUpdated = Date.now();

    saveInventory(inventory);

    // Direction 1: ensure this item's parent set is tracked, regardless of whether
    // the added item was the whole set or just one component
    let tracker = loadBuildTracker();
    const trackerKey = normalizeName(existing.set);
    const trackerExisting = tracker.find(i => normalizeName(i.name) === trackerKey);

    if (!trackerExisting) {
        tracker.push({
            name: existing.set,
            type: existing.type
        });
        saveBuildTracker(tracker);
    }

    return inventory;
});

// Add item to build tracker (renderer determines tradable/marketSlug before calling this)
ipcMain.handle("buildTracker:add", (event, { name, set, type, marketSlug, tradable }) => {
    let tracker = loadBuildTracker();
    const key = normalizeName(name);

    const existing = tracker.find(i => normalizeName(i.name) === key);

    if (!existing) {
        tracker.push({
            name,
            set,
            type,
            marketSlug: marketSlug || null,
            tradable: !!tradable
        });
        saveBuildTracker(tracker);
    }

    return tracker;
});

ipcMain.handle("buildTracker:checkPart", (event, { setName, partName }) => {
    let tracker = loadBuildTracker();
    const key = normalizeName(setName);

    const entry = tracker.find(i => normalizeName(i.name) === key);

    if (entry) {
        if (!entry.obtainedParts) {
            entry.obtainedParts = [];
        }
        if (!entry.obtainedParts.includes(partName)) {
            entry.obtainedParts.push(partName);
        }
        saveBuildTracker(tracker);
    }

    return tracker;
});

ipcMain.handle("buildTracker:uncheckPart", (event, { setName, partName }) => {
    let tracker = loadBuildTracker();
    const key = normalizeName(setName);

    const entry = tracker.find(i => normalizeName(i.name) === key);

    if (entry && entry.obtainedParts) {
        entry.obtainedParts = entry.obtainedParts.filter(p => p !== partName);
        saveBuildTracker(tracker);
    }

    return tracker;
});

// Price history handler
ipcMain.handle("item:getPriceHistory", async (event, { slug }) => {
    return await fetchPriceHistory(slug);
});

// Get full build tracker list
ipcMain.handle("buildTracker:get", () => loadBuildTracker());

// Remove item from build tracker
ipcMain.handle("buildTracker:remove", (event, { name }) => {
    let tracker = loadBuildTracker();
    const key = normalizeName(name);

    tracker = tracker.filter(i => normalizeName(i.name) !== key);
    saveBuildTracker(tracker);

    return tracker;
});

// Get Farm Info

ipcMain.handle("item:getFarmInfo", async (event, { set, type }) => {
    if (type === "Mod") {
        return await fetchModFarmData(set);
    }
    return await fetchFarmData(set, type);
});

// Update quantity
ipcMain.handle("inventory:updateQuantity", (event, { slug, newQuantity }) => {
    let inventory = loadInventory();

    const item = inventory.find(i =>
        i.slug.trim().toLowerCase() === slug.trim().toLowerCase()
    );

    if (item) {
        item.quantity = Number(newQuantity);
        saveInventory(inventory);
    }

    return inventory;
});

// Delete item
ipcMain.handle("inventory:delete", (event, { slug }) => {
    let inventory = loadInventory();

    inventory = inventory.filter(i =>
        i.slug.trim().toLowerCase() !== slug.trim().toLowerCase()
    );

    saveInventory(inventory);
    return inventory;
});

// Update prices for all items
ipcMain.handle("inventory:updatePrices", async () => {
    let inventory = loadInventory();

    for (const item of inventory) {
        item.price = await fetchPriceForSlug(item.slug);
        item.lastUpdated = Date.now();
    }

    saveInventory(inventory);
    return inventory;
});

// Get totals
ipcMain.handle("inventory:totals", () => {
    const inventory = loadInventory();

    const uniqueCount = inventory.length;
    const totalPlat = inventory.reduce((sum, item) => {
        return sum + (Number(item.price) * Number(item.quantity));
    }, 0);

    return { uniqueCount, totalPlat };
});

// App lifecycle
app.whenReady().then(() => {
    createWindow();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});
