const fs = require("fs");
const path = require("path");
const { app } = require("electron");

const appSettingsPath = path.join(app.getPath("userData"), "appSettings.json");

function ensureAppSettingsFile() {
    if (!fs.existsSync(appSettingsPath)) {
        fs.writeFileSync(appSettingsPath, JSON.stringify({ platPerDucat: 15 }));
    }
}

function loadAppSettings() {
    ensureAppSettingsFile();
    try {
        return JSON.parse(fs.readFileSync(appSettingsPath, "utf8"));
    } catch {
        return { platPerDucat: 15 };
    }
}

function saveAppSettings(settings) {
    fs.writeFileSync(appSettingsPath, JSON.stringify(settings, null, 2));
}

module.exports = {
    loadAppSettings,
    saveAppSettings,
};