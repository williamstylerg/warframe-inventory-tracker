const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const axios = require("axios");

app.setName("Warframe Inventory Tracker Sandbox");

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

// Create the main window
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 700,
        webPreferences: {
            preload: path.join(__dirname, "preload.js")
        },
        title: "Warframe Inventory Tracker"
    });

    mainWindow.loadFile("dashboard.html");
}

// Normalize item names (remove " Blueprint")
function normalizeName(name) {
    return name.trim().toLowerCase().replace(" blueprint", "");
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
// IPC handlers
// ------------------------------

// Get full inventory
ipcMain.handle("inventory:get", () => loadInventory());

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

    if (existing) {
        existing.quantity += 1;
        existing.type = inferTypeFromTags(tags);
        existing.rarity = inferRarityFromTags(tags);
        existing.vaulted = tags.includes("vaulted");
        existing.set = setName;
    } else {
        existing = {
            name: name.replace(" Blueprint", ""),
            slug: resolvedSlug,
            quantity: 1,
            price: 0,
            type: inferTypeFromTags(tags),
            rarity: inferRarityFromTags(tags),
            vaulted: tags.includes("vaulted"),
            set: setName,
            lastUpdated: Date.now()
        };
        inventory.push(existing);
    }

    existing.price = await fetchPriceForSlug(resolvedSlug);
    existing.lastUpdated = Date.now();

    saveInventory(inventory);
    return inventory;
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
