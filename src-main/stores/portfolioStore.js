const fs = require("fs");
const path = require("path");
const { app } = require("electron");
const { loadInventory } = require("./inventoryStore");

const portfolioHistoryPath = path.join(app.getPath("userData"), "portfolioHistory.json");

function ensurePortfolioHistoryFile() {
    if (!fs.existsSync(portfolioHistoryPath)) {
        fs.writeFileSync(portfolioHistoryPath, "[]");
    }
}

function loadPortfolioHistory() {
    ensurePortfolioHistoryFile();
    try {
        return JSON.parse(fs.readFileSync(portfolioHistoryPath, "utf8"));
    } catch {
        return [];
    }
}

function savePortfolioHistory(history) {
    fs.writeFileSync(portfolioHistoryPath, JSON.stringify(history, null, 2));
}

function snapshotPortfolioValue() {
    const inventory = loadInventory();
    const totalPlat = inventory.reduce(
        (sum, item) => sum + Number(item.price) * Number(item.quantity),
        0,
    );
    const totalUnique = inventory.length;
    const totalItems = inventory.reduce((sum, item) => sum + Number(item.quantity), 0);
    const today = new Date().toISOString().slice(0, 10);

    let history = loadPortfolioHistory();
    const existingEntry = history.find((h) => h.date === today);

    if (existingEntry) {
        existingEntry.totalPlat = totalPlat;
        existingEntry.totalUnique = totalUnique;
        existingEntry.totalItems = totalItems;
    } else {
        history.push({ date: today, totalPlat, totalUnique, totalItems });
    }

    savePortfolioHistory(history);
    return history;
}

module.exports = {
    loadPortfolioHistory,
    snapshotPortfolioValue,
};