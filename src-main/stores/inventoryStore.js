const fs = require("fs");
const path = require("path");
const { app } = require("electron");

const inventoryPath = path.join(app.getPath("userData"), "inventory.json");
const cachePath = path.join(app.getPath("userData"), "itemCache.json");

function ensureInventoryFile() {
    if (!fs.existsSync(inventoryPath)) {
        fs.writeFileSync(inventoryPath, "[]");
    }
}

function loadInventory() {
    ensureInventoryFile();

    try {
        const data = fs.readFileSync(inventoryPath, "utf8");
        let inventory = JSON.parse(data);

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

function saveInventory(inventory) {
    fs.writeFileSync(inventoryPath, JSON.stringify(inventory, null, 2));
}

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

module.exports = {
    loadInventory,
    saveInventory,
    loadCache,
    saveCache,
};