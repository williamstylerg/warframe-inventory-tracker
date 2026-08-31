const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
    // Get full inventory
    getInventory: () => ipcRenderer.invoke("inventory:get"),

    // Add item
    addItem: (name, slug) =>
        ipcRenderer.invoke("inventory:add", { name, slug }),

    // Update quantity
    updateQuantity: (slug, newQuantity) =>
        ipcRenderer.invoke("inventory:updateQuantity", { slug, newQuantity }),

    // Delete item
    deleteItem: (slug) =>
        ipcRenderer.invoke("inventory:delete", { slug }),

    // Update all prices
    updatePrices: () =>
        ipcRenderer.invoke("inventory:updatePrices"),

    // Get totals
    getTotals: () =>
        ipcRenderer.invoke("inventory:totals"),

    // Farm Data
    getFarmInfo: (set, type) =>
        ipcRenderer.invoke("item:getFarmInfo", { set, type }),

    // Build Tracker
    addToBuildTracker: (item) =>
        ipcRenderer.invoke("buildTracker:add", item),

    getBuildTracker: () =>
        ipcRenderer.invoke("buildTracker:get"),

    removeFromBuildTracker: (name) =>
        ipcRenderer.invoke("buildTracker:remove", { name }),

    combineSet: (setName) =>
        ipcRenderer.invoke("inventory:combineSet", { setName }),

    checkBuildTrackerPart: (setName, partName) =>
        ipcRenderer.invoke("buildTracker:checkPart", { setName, partName }),

    uncheckBuildTrackerPart: (setName, partName) =>
        ipcRenderer.invoke("buildTracker:uncheckPart", { setName, partName }),

    getItemImage: (name, type) =>
        ipcRenderer.invoke("item:getImage", { name, type }),

    getPriceHistory: (slug) =>
        ipcRenderer.invoke("item:getPriceHistory", { slug })
});
