const { ipcMain, app } = require("electron");
const { normalizeName } = require("../farmLogic");
const { loadInventory, saveInventory } = require("./stores/inventoryStore");
const { loadBuildTracker, saveBuildTracker } = require("./stores/buildTrackerStore");
const {
    loadRelicInventory,
    addRelic,
    updateRelicQuantity,
    removeRelic,
    updateRelicImage,
    fetchRelicDropData,
    refreshAllRelicData,
} = require("./stores/relicStore");
const { loadPortfolioHistory } = require("./stores/portfolioStore");
const { loadAppSettings, saveAppSettings } = require("./stores/appSettingsStore");
const {
    exportBackup,
    importBackup,
    restoreAutoBackup,
    exportInventoryCsv,
} = require("./services/backupService");
const {
    loadFarmCache,
    clearFarmCache,
    fetchFarmData,
    fetchModFarmData,
    resolveTierForItem,
    resolveDucatsForItem,
    backfillTiers,
    backfillDucats,
} = require("./services/farmDataService");
const {
    fetchItemDetails,
    fetchPriceForSlug,
    fetchPriceHistory,
    inferTypeFromTags,
    inferRarityFromTags,
} = require("./services/priceService");
const { getRelicRecommendations } = require("./services/recommendationService");
const { combineSetComponents } = require("./services/buildCompletionService");

function registerIpcHandlers(mainWindow) {
    ipcMain.handle("inventory:exportCsv", async () => await exportInventoryCsv(mainWindow));

    ipcMain.handle("settings:get", () => loadAppSettings());
    ipcMain.handle("settings:update", (event, updates) => {
        const settings = { ...loadAppSettings(), ...updates };
        saveAppSettings(settings);
        return settings;
    });
    ipcMain.handle("inventory:backfillDucats", async () => await backfillDucats());

    ipcMain.handle("portfolio:getHistory", () => loadPortfolioHistory());

    ipcMain.handle("backup:export", async () => await exportBackup(mainWindow));
    ipcMain.handle("backup:import", async () => await importBackup(mainWindow));
    ipcMain.handle("backup:restoreAuto", async () => await restoreAutoBackup());

    ipcMain.handle("cache:clearFarmData", async () => await clearFarmCache());

    ipcMain.handle("inventory:backfillTiers", async () => await backfillTiers());

    ipcMain.handle("inventory:combineSet", async (event, { setName }) => {
        return await combineSetComponents(setName);
    });

    ipcMain.handle("inventory:get", () => loadInventory());

    ipcMain.handle("item:getImage", async (event, { name, type }) => {
        const cache = loadFarmCache();
        const key = name.trim().toLowerCase();

        if (cache[key]?.imageName) {
            return cache[key].imageName;
        }

        await fetchFarmData(name, type);
        const refreshedCache = loadFarmCache();
        return refreshedCache[key]?.imageName || null;
    });

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
        const ducats = await resolveDucatsForItem(
            name.replace(" Blueprint", ""),
            itemType,
            setName,
        );

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

    ipcMain.handle("item:getPriceHistory", async (event, { slug }) => {
        return await fetchPriceHistory(slug);
    });

    ipcMain.handle("buildTracker:get", () => loadBuildTracker());

    ipcMain.handle("buildTracker:remove", (event, { name }) => {
        let tracker = loadBuildTracker();
        const key = normalizeName(name);

        tracker = tracker.filter((i) => normalizeName(i.name) !== key);
        saveBuildTracker(tracker);

        return tracker;
    });

    ipcMain.handle("item:getFarmInfo", async (event, { set, type }) => {
        if (type === "Mod") {
            return await fetchModFarmData(set);
        }
        return await fetchFarmData(set, type);
    });

    ipcMain.handle("inventory:updateQuantity", (event, { slug, newQuantity }) => {
        let inventory = loadInventory();

        const item = inventory.find(
            (i) => i.slug.trim().toLowerCase() === slug.trim().toLowerCase(),
        );

        if (item) {
            item.quantity = Number(newQuantity);
            saveInventory(inventory);
        }

        return inventory;
    });

    ipcMain.handle("inventory:delete", (event, { slug }) => {
        let inventory = loadInventory();

        inventory = inventory.filter(
            (i) => i.slug.trim().toLowerCase() !== slug.trim().toLowerCase(),
        );

        saveInventory(inventory);
        return inventory;
    });

    ipcMain.handle("inventory:updatePrices", async () => {
        let inventory = loadInventory();

        for (const item of inventory) {
            item.price = await fetchPriceForSlug(item.slug);
            item.lastUpdated = Date.now();
        }

        saveInventory(inventory);
        return inventory;
    });

    ipcMain.handle("inventory:totals", () => {
        const inventory = loadInventory();

        const uniqueCount = inventory.length;
        const totalPlat = inventory.reduce((sum, item) => {
            return sum + Number(item.price) * Number(item.quantity);
        }, 0);

        return { uniqueCount, totalPlat };
    });

    ipcMain.handle("relics:get", () => loadRelicInventory());
    ipcMain.handle("relics:add", (event, { name, imageName }) => addRelic(name, imageName));
    ipcMain.handle("relics:updateQuantity", (event, { name, newQuantity }) =>
        updateRelicQuantity(name, newQuantity),
    );
    ipcMain.handle("relics:remove", (event, { name }) => removeRelic(name));

    ipcMain.handle("relics:getDropData", async (event, { relicName }) => {
        return await fetchRelicDropData(relicName);
    });

    ipcMain.handle("relics:refreshAllData", async () => await refreshAllRelicData());

    ipcMain.handle("relics:getRecommendations", async () => await getRelicRecommendations());

    ipcMain.handle("relics:updateImage", (event, { name, imageName }) =>
        updateRelicImage(name, imageName),
    );

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

    ipcMain.handle("app:getVersion", () => app.getVersion());
}

module.exports = { registerIpcHandlers };