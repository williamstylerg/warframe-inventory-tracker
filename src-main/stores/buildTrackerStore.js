const fs = require("fs");
const path = require("path");
const { app } = require("electron");

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

module.exports = {
    loadBuildTracker,
    saveBuildTracker,
};