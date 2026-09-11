const { app, BrowserWindow, dialog } = require("electron");
app.setName("Warframe Inventory Tracker");

const path = require("path");
const { autoUpdater } = require("electron-updater");

const { writeAutoBackup } = require("./src-main/services/backupService");
const { snapshotPortfolioValue } = require("./src-main/stores/portfolioStore");
const { registerIpcHandlers } = require("./src-main/ipcHandlers");

let mainWindow;
let handlersRegistered = false;

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

    if (!handlersRegistered) {
        registerIpcHandlers(mainWindow);
        handlersRegistered = true;
    }
}

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

app.whenReady().then(() => {
    createWindow();
    checkForUpdates();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

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

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});
