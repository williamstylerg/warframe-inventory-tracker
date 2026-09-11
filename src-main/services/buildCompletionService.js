const { normalizeName } = require("../../farmLogic");
const { loadInventory, saveInventory } = require("../stores/inventoryStore");
const { fetchFarmData } = require("./farmDataService");
const { fetchPriceForSlug } = require("./priceService");

async function combineSetComponents(setName) {
    let inventory = loadInventory();
    const components = await fetchFarmData(setName, "Warframe Part");
    const requiredParts = components.filter((c) => c.ducats !== undefined);

    if (requiredParts.length === 0) {
        return { success: false, reason: "No trackable components found for this set." };
    }

    const partEntries = requiredParts.map((part) => {
        const fullName = `${setName} ${part.name}`;
        const key = normalizeName(fullName);
        const invItem = inventory.find((i) => normalizeName(i.name) === key);
        return { fullName, invItem, quantity: invItem ? invItem.quantity : 0 };
    });

    const completeSets = Math.min(...partEntries.map((p) => p.quantity));

    if (completeSets < 1) {
        return { success: false, reason: "Not all components are owned yet." };
    }

    for (const part of partEntries) {
        part.invItem.quantity -= completeSets;
    }
    inventory = inventory.filter((i) => i.quantity > 0);

    const setKey = normalizeName(setName + " Set");
    let setEntry = inventory.find((i) => normalizeName(i.name) === setKey);
    const setSlug = setName.trim().toLowerCase().replace(/\s+/g, "_") + "_set";

    if (setEntry) {
        setEntry.quantity += completeSets;
    } else {
        setEntry = {
            name: `${setName} Set`,
            slug: setSlug,
            quantity: completeSets,
            price: 0,
            type: "Warframe Part",
            rarity: "Unknown",
            vaulted: false,
            set: setName,
            lastUpdated: Date.now(),
        };
        inventory.push(setEntry);
    }

    setEntry.price = await fetchPriceForSlug(setSlug);
    setEntry.lastUpdated = Date.now();

    saveInventory(inventory);
    return { success: true, setsCreated: completeSets, inventory };
}

module.exports = { combineSetComponents };