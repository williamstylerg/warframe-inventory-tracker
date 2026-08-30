const fs = require("fs");
const axios = require("axios");
const path = require("path");

const dataPath = path.join(__dirname, "inventory.json");

// Load inventory
function loadInventory() {
    try {
        const data = fs.readFileSync(dataPath, "utf8");
        return JSON.parse(data);
    } catch {
        return [];
    }
}

// Save inventory
function saveInventory(inventory) {
    fs.writeFileSync(dataPath, JSON.stringify(inventory, null, 2));
}

// Fetch price from Warframe.market
async function fetchPrice(itemName) {
    try {
        const urlName = itemName.toLowerCase().replace(/ /g, "_");
        const response = await axios.get(
            `https://api.warframe.market/v1/items/${urlName}/orders`
        );

        const orders = response.data.payload.orders;
        const sellOrders = orders.filter(o => o.order_type === "sell");

        if (sellOrders.length === 0) return 0;

        const cheapest = sellOrders.sort((a, b) => a.platinum - b.platinum)[0];
        return cheapest.platinum;
    } catch {
        return 0;
    }
}

async function updateAllPrices() {
    const inventory = loadInventory();

    for (const item of inventory) {
        item.price = await fetchPrice(item.name);
    }

    saveInventory(inventory);
    console.log("✅ Prices updated in inventory.json");
}

updateAllPrices();
