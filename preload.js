const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
    // Get full inventory
    getInventory: () => ipcRenderer.invoke("inventory:get"),

    // Add item
    addItem: (name, slug) => ipcRenderer.invoke("inventory:add", { name, slug }),

    // Update quantity
    updateQuantity: (slug, newQuantity) =>
        ipcRenderer.invoke("inventory:updateQuantity", { slug, newQuantity }),

    // Delete item
    deleteItem: (slug) => ipcRenderer.invoke("inventory:delete", { slug }),

    // Update all prices
    updatePrices: () => ipcRenderer.invoke("inventory:updatePrices"),

    // Get totals
    getTotals: () => ipcRenderer.invoke("inventory:totals"),

    // Farm Data
    getFarmInfo: (set, type) => ipcRenderer.invoke("item:getFarmInfo", { set, type }),

    // Build Tracker
    addToBuildTracker: (item) => ipcRenderer.invoke("buildTracker:add", item),

    getBuildTracker: () => ipcRenderer.invoke("buildTracker:get"),

    removeFromBuildTracker: (name) => ipcRenderer.invoke("buildTracker:remove", { name }),

    combineSet: (setName) => ipcRenderer.invoke("inventory:combineSet", { setName }),

    checkBuildTrackerPart: (setName, partName) =>
        ipcRenderer.invoke("buildTracker:checkPart", { setName, partName }),

    uncheckBuildTrackerPart: (setName, partName) =>
        ipcRenderer.invoke("buildTracker:uncheckPart", { setName, partName }),

    getItemImage: (name, type) => ipcRenderer.invoke("item:getImage", { name, type }),

    getPriceHistory: (slug) => ipcRenderer.invoke("item:getPriceHistory", { slug }),

    exportBackup: () => ipcRenderer.invoke("backup:export"),

    importBackup: () => ipcRenderer.invoke("backup:import"),

    restoreAutoBackup: () => ipcRenderer.invoke("backup:restoreAuto"),

    clearFarmCache: () => ipcRenderer.invoke("cache:clearFarmData"),

    backfillTiers: () => ipcRenderer.invoke("inventory:backfillTiers"),

    getRelics: () => ipcRenderer.invoke("relics:get"),

    addRelic: (name, imageName) => ipcRenderer.invoke("relics:add", { name, imageName }),

    updateRelicQuantity: (name, newQuantity) =>
        ipcRenderer.invoke("relics:updateQuantity", { name, newQuantity }),

    removeRelic: (name) => ipcRenderer.invoke("relics:remove", { name }),

    getRelicDropData: (relicName) => ipcRenderer.invoke("relics:getDropData", { relicName }),

    refreshAllRelicData: () => ipcRenderer.invoke("relics:refreshAllData"),

    getRelicRecommendations: () => ipcRenderer.invoke("relics:getRecommendations"),

    updateRelicImage: (name, imageName) =>
        ipcRenderer.invoke("relics:updateImage", { name, imageName }),

    getAppVersion: () => ipcRenderer.invoke("app:getVersion"),

    getVaulted: (name, type) => ipcRenderer.invoke("item:getVaulted", { name, type }),

    getPortfolioHistory: () => ipcRenderer.invoke("portfolio:getHistory"),

    getAppSettings: () => ipcRenderer.invoke("settings:get"),

    updateAppSettings: (updates) => ipcRenderer.invoke("settings:update", updates),

    backfillDucats: () => ipcRenderer.invoke("inventory:backfillDucats"),

    exportInventoryCsv: () => ipcRenderer.invoke("inventory:exportCsv"),

    getScreenSources: () => ipcRenderer.invoke("screen:getSources"),  //test module for ocr

    captureFullRes: (sourceId) => ipcRenderer.invoke("screen:captureFullRes", { sourceId }), //more test

    ocrTestRead: (imageDataUrl) => ipcRenderer.invoke("ocr:testRead", { imageDataUrl }) //even more test


});
