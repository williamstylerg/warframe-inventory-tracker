const fs = require("fs");
const path = require("path");
const { app, dialog } = require("electron");
const { loadInventory, saveInventory } = require("../stores/inventoryStore");
const { loadBuildTracker, saveBuildTracker } = require("../stores/buildTrackerStore");

async function exportBackup(mainWindow) {
    const inventory = loadInventory();
    const buildTracker = loadBuildTracker();

    const backup = {
        appVersion: app.getVersion(),
        exportedAt: Date.now(),
        inventory,
        buildTracker,
    };

    const result = await dialog.showSaveDialog(mainWindow, {
        title: "Export Backup",
        defaultPath: `warframe-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`,
        filters: [{ name: "JSON Backup", extensions: ["json"] }],
    });

    if (result.canceled) {
        return { success: false, reason: "Export cancelled." };
    }

    fs.writeFileSync(result.filePath, JSON.stringify(backup, null, 2));
    return { success: true, path: result.filePath };
}

async function importBackup(mainWindow) {
    const result = await dialog.showOpenDialog(mainWindow, {
        title: "Import Backup",
        filters: [{ name: "JSON Backup", extensions: ["json"] }],
        properties: ["openFile"],
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

function writeAutoBackup() {
    const inventory = loadInventory();
    const buildTracker = loadBuildTracker();
    const backup = {
        appVersion: app.getVersion(),
        exportedAt: Date.now(),
        inventory,
        buildTracker,
    };

    const autoBackupPath = path.join(app.getPath("userData"), "auto-backup.json");
    fs.writeFileSync(autoBackupPath, JSON.stringify(backup, null, 2));
    console.log("Auto-backup saved to:", autoBackupPath);
}

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
            exportedAt: backup.exportedAt,
        };
    } catch (err) {
        return { success: false, reason: "Couldn't read the auto-backup: " + err.message };
    }
}

async function exportInventoryCsv(mainWindow) {
    const inventory = loadInventory();

    const headers = [
        "Name", "Type", "Rarity", "Vaulted", "Set", "Quantity",
        "Price", "Total Value", "Ducats", "Tier", "Last Updated",
    ];

    const rows = inventory.map((item) => [
        item.name, item.type, item.rarity, item.vaulted ? "Yes" : "No", item.set,
        item.quantity, item.price, item.price * item.quantity,
        item.ducats ?? "", item.tier ?? "", new Date(item.lastUpdated).toLocaleDateString(),
    ]);

    function escapeCsvField(field) {
        const str = String(field);
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    }

    const csvLines = [headers, ...rows].map((row) => row.map(escapeCsvField).join(","));
    const csvContent = csvLines.join("\n");

    const result = await dialog.showSaveDialog(mainWindow, {
        title: "Export Inventory to CSV",
        defaultPath: `warframe-inventory-${new Date().toISOString().slice(0, 10)}.csv`,
        filters: [{ name: "CSV File", extensions: ["csv"] }],
    });

    if (result.canceled) {
        return { success: false, reason: "Export cancelled." };
    }

    fs.writeFileSync(result.filePath, csvContent);
    return { success: true, path: result.filePath };
}

module.exports = {
    exportBackup,
    importBackup,
    writeAutoBackup,
    restoreAutoBackup,
    exportInventoryCsv,
};

