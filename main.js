const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const { autoUpdater } = require("electron-updater");

const {
    normalizeName,
} = require("./farmLogic");

app.setName("Warframe Inventory Tracker");

let mainWindow;

//  THIS IS THE MAIN.JS UPDATE
const { loadInventory, saveInventory, loadCache, saveCache } = require("./src-main/stores/inventoryStore");
const { loadBuildTracker, saveBuildTracker } = require("./src-main/stores/buildTrackerStore");
const {
    loadRelicInventory,
    addRelic,
    updateRelicQuantity,
    removeRelic,
    updateRelicImage,
    fetchRelicDropData,
    refreshAllRelicData,
} = require("./src-main/stores/relicStore");
const { loadPortfolioHistory, snapshotPortfolioValue } = require("./src-main/stores/portfolioStore");
const { loadAppSettings, saveAppSettings } = require("./src-main/stores/appSettingsStore");
const { exportBackup, importBackup, writeAutoBackup, restoreAutoBackup, exportInventoryCsv } = require("./src-main/services/backupService");
const {
    loadFarmCache, clearFarmCache, fetchFarmData, fetchModFarmData,
    isTrackableComponentServer, resolveTierForItem, resolveDucatsForItem, backfillTiers,
} = require("./src-main/services/farmDataService");


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

    if (cache[key] && Date.now() - cache[key].fetchedAt < maxAge) {
        return cache[key].history;
    }

    const url = `https://api.warframe.market/v1/items/${slug}/statistics?include=item`;

    try {
        const response = await axios.get(url, {
            headers: {
                "User-Agent": "Mozilla/5.0",
                Accept: "application/json",
                Platform: "pc",
                Language: "en",
                Crossplay: "true",
                Referer: "https://warframe.market/",
            },
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


// Auto backup & snapshot price on app close

app.on("before-quit", (event) => {
    event.preventDefault();

    try {
        writeAutoBackup();
        snapshotPortfolioValue();
    } catch (err) {
        console.log("Auto-backup or portfolio snapshot failed:", err.message);
    }

    app.exit();
});


// combine set logic
async function combineSetComponents(setName) {
    let inventory = loadInventory();

    // Get this set's required components (reuses your existing farm-data cache)
    const components = await fetchFarmData(setName, "Warframe Part");

    // Only real trackable parts have ducats — filters out things like Orokin Cell
    const requiredParts = components.filter((c) => c.ducats !== undefined);

    if (requiredParts.length === 0) {
        return { success: false, reason: "No trackable components found for this set." };
    }

    // For each required part, find the matching inventory item and its quantity
    const partEntries = requiredParts.map((part) => {
        const fullName = `${setName} ${part.name}`;
        const key = normalizeName(fullName);
        const invItem = inventory.find((i) => normalizeName(i.name) === key);
        return { fullName, invItem, quantity: invItem ? invItem.quantity : 0 };
    });

    // How many complete sets can we build? Limited by the scarcest component.
    const completeSets = Math.min(...partEntries.map((p) => p.quantity));

    if (completeSets < 1) {
        return { success: false, reason: "Not all components are owned yet." };
    }

    // Decrement/remove each component by the number of sets being combined
    for (const part of partEntries) {
        part.invItem.quantity -= completeSets;
    }
    inventory = inventory.filter((i) => i.quantity > 0);

    // Find or create the merged set entry
    const setKey = normalizeName(setName + " Set");
    let setEntry = inventory.find((i) => normalizeName(i.name) === setKey);

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
            lastUpdated: Date.now(),
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
        width: 1800,
        height: 1000,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
        },
        title: "Warframe Inventory Tracker",
    });

    mainWindow.loadFile("dashboard.html");
}

// Fetch price from Warframe Market v2 orders endpoint
async function fetchPriceForSlug(slug) {
    try {
        const url = `https://api.warframe.market/v2/orders/item/${slug}/top`;

        const response = await axios.get(url, {
            headers: {
                "User-Agent": "Mozilla/5.0",
                Accept: "application/json",
                Platform: "pc",
                Language: "en",
                Crossplay: "true",
            },
        });

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
                Accept: "application/json",
                Platform: "pc",
                Language: "en",
                Crossplay: "true",
            },
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
    if (tags.includes("mod")) return "Mod";
    if (tags.includes("warframe")) return "Warframe Part";
    if (tags.includes("weapon")) return "Weapon Part";
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
// Relic Recommendation Engine
// ------------------------------

async function getRelicRecommendations() {
    const relics = loadRelicInventory();
    const buildTracker = loadBuildTracker();
    const inventory = loadInventory();
    const recommendations = [];

    for (const relic of relics) {
        if (relic.quantity <= 0) continue;

        const dropData = await fetchRelicDropData(relic.name);
        if (!dropData) continue;

        for (const trackedSet of buildTracker) {
            const components = await fetchFarmData(trackedSet.name, trackedSet.type);
            const requiredParts = components.filter((c) =>
                isTrackableComponentServer(c, trackedSet.type),
            );

            for (const part of requiredParts) {
                const isPrime = part.ducats !== undefined;
                const fullPartName = `${trackedSet.name} ${part.name}`;

                const owned = isPrime
                    ? inventory.some(
                          (i) =>
                              normalizeName(i.name) === normalizeName(fullPartName) &&
                              i.quantity > 0,
                      )
                    : (trackedSet.obtainedParts || []).includes(part.name);

                if (owned) continue;

                const states = ["Intact", "Exceptional", "Flawless", "Radiant"];
                for (const state of states) {
                    const rewards = dropData.rewards[state] || [];
                    const match = rewards.find((r) => {
                        const normalized = r.itemName
                            .trim()
                            .toLowerCase()
                            .replace(/\s+blueprint$/i, "");
                        return normalized === fullPartName.trim().toLowerCase();
                    });

                    if (match) {
                        recommendations.push({
                            relicName: relic.name,
                            relicQuantity: relic.quantity,
                            targetItem: fullPartName,
                            targetSet: trackedSet.name,
                            minRefinement: state,
                            chance: match.chance,
                        });
                        break;
                    }
                }
            }
        }
    }

    return recommendations;
}


// backfill for ducats
async function backfillDucats() {
    let inventory = loadInventory();
    let updated = 0;

    for (const item of inventory) {
        if (!item.type.includes("Warframe") && !item.type.includes("Weapon")) continue;

        const ducats = await resolveDucatsForItem(item.name, item.type, item.set);
        if (ducats !== item.ducats) {
            item.ducats = ducats;
            updated++;
        }
    }

    saveInventory(inventory);
    return { success: true, updated, total: inventory.length };
}

// ------------------------------
// IPC handlers
// ------------------------------

// CSV Export
ipcMain.handle("inventory:exportCsv", async () => await exportInventoryCsv(mainWindow));

// Settings IPCs
ipcMain.handle("settings:get", () => loadAppSettings());
ipcMain.handle("settings:update", (event, updates) => {
    const settings = { ...loadAppSettings(), ...updates };
    saveAppSettings(settings);
    return settings;
});
ipcMain.handle("inventory:backfillDucats", async () => await backfillDucats());

// Value Snapshot
ipcMain.handle("portfolio:getHistory", () => loadPortfolioHistory());

// Backup - export and import and auto restore
ipcMain.handle("backup:export", async () => await exportBackup(mainWindow));
ipcMain.handle("backup:import", async () => await importBackup(mainWindow));
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

    let existing = inventory.find(
        (i) => i.slug.trim().toLowerCase() === resolvedSlug.trim().toLowerCase(),
    );

    const setName = (() => {
        const parts = name.split(" ");
        return parts.length > 1 ? parts[0] + " " + parts[1] : parts[0];
    })();

    const itemType = inferTypeFromTags(tags);
    const tier = await resolveTierForItem(name.replace(" Blueprint", ""), itemType, setName);
    const ducats = await resolveDucatsForItem(name.replace(" Blueprint", ""), itemType, setName);

    let isVaulted = false;
    if (itemType.includes("Warframe") || itemType.includes("Weapon")) {
        await fetchFarmData(setName, itemType);
        const farmCache = loadFarmCache();
        isVaulted = farmCache[setName.trim().toLowerCase()]?.vaulted || false;
    }

    if (existing) {
        existing.quantity += 1;
        existing.type = itemType;
        existing.rarity = inferRarityFromTags(tags);
        existing.vaulted = isVaulted;
        existing.set = setName;
        existing.tier = tier;
        existing.ducats = ducats;
    } else {
        existing = {
            name: name.replace(" Blueprint", ""),
            slug: resolvedSlug,
            quantity: 1,
            price: 0,
            type: itemType,
            rarity: inferRarityFromTags(tags),
            vaulted: isVaulted,
            set: setName,
            tier: tier,
            ducats: ducats,
            lastUpdated: Date.now(),
        };
        inventory.push(existing);
    }

    existing.price = await fetchPriceForSlug(resolvedSlug);
    existing.lastUpdated = Date.now();

    saveInventory(inventory);

    // Direction 1: ensure this item's parent set is tracked, regardless of whether
    // the added item was the whole set or just one component
    if (existing.type === "Warframe Part" || existing.type === "Weapon Part") {
        let tracker = loadBuildTracker();
        const trackerKey = normalizeName(existing.set);
        const trackerExisting = tracker.find((i) => normalizeName(i.name) === trackerKey);

        if (!trackerExisting) {
            tracker.push({
                name: existing.set,
                type: existing.type,
            });
            saveBuildTracker(tracker);
        }
    }

    return inventory;
});

// Add item to build tracker (renderer determines tradable/marketSlug before calling this)
ipcMain.handle("buildTracker:add", (event, { name, set, type, marketSlug, tradable }) => {
    let tracker = loadBuildTracker();
    const key = normalizeName(name);

    const existing = tracker.find((i) => normalizeName(i.name) === key);

    if (!existing) {
        tracker.push({
            name,
            set,
            type,
            marketSlug: marketSlug || null,
            tradable: !!tradable,
        });
        saveBuildTracker(tracker);
    }

    return tracker;
});

ipcMain.handle("buildTracker:checkPart", (event, { setName, partName }) => {
    let tracker = loadBuildTracker();
    const key = normalizeName(setName);

    const entry = tracker.find((i) => normalizeName(i.name) === key);

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

    const entry = tracker.find((i) => normalizeName(i.name) === key);

    if (entry && entry.obtainedParts) {
        entry.obtainedParts = entry.obtainedParts.filter((p) => p !== partName);
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

    tracker = tracker.filter((i) => normalizeName(i.name) !== key);
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

    const item = inventory.find((i) => i.slug.trim().toLowerCase() === slug.trim().toLowerCase());

    if (item) {
        item.quantity = Number(newQuantity);
        saveInventory(inventory);
    }

    return inventory;
});

// Delete item
ipcMain.handle("inventory:delete", (event, { slug }) => {
    let inventory = loadInventory();

    inventory = inventory.filter((i) => i.slug.trim().toLowerCase() !== slug.trim().toLowerCase());

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
        return sum + Number(item.price) * Number(item.quantity);
    }, 0);

    return { uniqueCount, totalPlat };
});

// Relic handlers
ipcMain.handle("relics:get", () => loadRelicInventory());
ipcMain.handle("relics:add", (event, { name, imageName }) => addRelic(name, imageName));
ipcMain.handle("relics:updateQuantity", (event, { name, newQuantity }) =>
    updateRelicQuantity(name, newQuantity),
);
ipcMain.handle("relics:remove", (event, { name }) => removeRelic(name));

// Relic Data
ipcMain.handle("relics:getDropData", async (event, { relicName }) => {
    return await fetchRelicDropData(relicName);
});

// Relic Cache Refresh
ipcMain.handle("relics:refreshAllData", async () => await refreshAllRelicData());

// Relic Recommendation Handler
ipcMain.handle("relics:getRecommendations", async () => await getRelicRecommendations());

// Relic Image handler
ipcMain.handle("relics:updateImage", (event, { name, imageName }) =>
    updateRelicImage(name, imageName),
);

// App lifecycle
app.whenReady().then(() => {
    createWindow();
    checkForUpdates();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// updater
function checkForUpdates() {
    autoUpdater.checkForUpdatesAndNotify();
}

autoUpdater.on("update-available", (info) => {
    console.log("Update available:", info.version);
});

autoUpdater.on("update-downloaded", (info) => {
    dialog
        .showMessageBox(mainWindow, {
            type: "info",
            title: "Update Ready",
            message: `Version ${info.version} has been downloaded. Restart now to install it?`,
            buttons: ["Restart Now", "Later"],
        })
        .then((result) => {
            if (result.response === 0) {
                autoUpdater.quitAndInstall();
            }
        });
});

autoUpdater.on("error", (err) => {
    console.log("Auto-update error:", err.message);
});

// vaulted status
ipcMain.handle("item:getVaulted", async (event, { name, type }) => {
    const cache = loadFarmCache();
    const key = name.trim().toLowerCase();

    if (cache[key]?.vaulted !== undefined) {
        return cache[key].vaulted;
    }

    await fetchFarmData(name, type);
    const refreshedCache = loadFarmCache();
    return refreshedCache[key]?.vaulted || false;
});

// show app version
ipcMain.handle("app:getVersion", () => app.getVersion());

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});
