const express = require("express");
const cors = require("cors");
const fs = require("fs");
const axios = require("axios");
const { exec } = require("child_process");

const app = express();
app.use(cors());
app.use(express.json());

// Serve dashboard.html and dashboard.js
app.use(express.static(__dirname));

let allItems = [];
let slugLookup = {};   // name → slug lookup table
let inventory = [];    // inventory loaded later

const inventoryPath = __dirname + "/inventory.json";


// -------------------------------------------------------------
// Normalize item names (remove " Blueprint")
// -------------------------------------------------------------
function normalizeName(name) {
    return name.trim().toLowerCase().replace(" blueprint", "");
}


// -------------------------------------------------------------
// Load full item list from Warframe Market API + build slugLookup
// -------------------------------------------------------------
async function loadItemList() {
    return new Promise((resolve) => {
        exec(
            `curl -s https://api.warframe.market/v2/items`,
            { maxBuffer: 1024 * 1024 * 10 },
            (error, stdout) => {
                if (error) {
                    console.log("❌ curl failed:", error);
                    return resolve([]);
                }

                try {
                    const json = JSON.parse(stdout);
                    const items = json.data;

                    allItems = items.map(i => ({
                        name: i.i18n.en.name,
                        slug: i.slug
                    }));

                    slugLookup = {};
                    allItems.forEach(item => {
                        const key = normalizeName(item.name);
                        slugLookup[key] = item.slug;
                    });

                    console.log("Loaded item list:", allItems.length, "items");

                    mergeInventory();

                    resolve(allItems);
                } catch (err) {
                    console.log("❌ JSON parse failed:", err);
                    resolve([]);
                }
            }
        );
    });
}


// -------------------------------------------------------------
// Load inventory.json (before merging)
// -------------------------------------------------------------
if (!fs.existsSync(inventoryPath)) {
    fs.writeFileSync(inventoryPath, "[]");
}

inventory = JSON.parse(fs.readFileSync(inventoryPath, "utf8"));


// -------------------------------------------------------------
// Merge duplicates using slugLookup
// -------------------------------------------------------------
function mergeInventory() {
    const merged = [];

    for (const item of inventory) {
        let normalizedName = normalizeName(item.name);

        // Use slugLookup if possible, otherwise keep existing slug
        const resolvedSlug = slugLookup[normalizedName] || item.slug;

        const existing = merged.find(i =>
            i.slug.trim().toLowerCase() === resolvedSlug.trim().toLowerCase()
        );

        if (existing) {
            existing.quantity += Number(item.quantity);
            existing.price = Math.max(existing.price, item.price);
        } else {
            merged.push({
                name: item.name.replace(" Blueprint", ""),
                slug: resolvedSlug,
                quantity: Number(item.quantity),
                price: item.price
            });
        }
    }

    inventory = merged;
    fs.writeFileSync(inventoryPath, JSON.stringify(inventory, null, 2));

    console.log("Inventory merged. Items:", inventory.length);
}


// -------------------------------------------------------------
// Start loading item list
// -------------------------------------------------------------
loadItemList();


// -------------------------------------------------------------
// Routes
// -------------------------------------------------------------
app.get("/items", (req, res) => {
    res.json({ items: allItems });
});

app.get("/summary", (req, res) => {
    res.json({ rows: inventory });
});


// -------------------------------------------------------------
// Add item (keep blueprint slugs; v2 orders endpoint expects them)
// -------------------------------------------------------------
app.post("/add", async (req, res) => {
    const { itemName, slug } = req.body;

    // Always default quantity to 1
    const quantity = 1;

    let normalizedName = normalizeName(itemName);
    let resolvedSlug = slugLookup[normalizedName] || (slug || "").trim();

    let existing = inventory.find(i =>
        i.slug.trim().toLowerCase() === resolvedSlug.trim().toLowerCase()
    );

    if (existing) {
        existing.quantity += 1;
    } else {
        inventory.push({
            name: itemName.replace(" Blueprint", ""),
            slug: resolvedSlug,
            quantity: 1,
            price: 0
        });
        existing = inventory[inventory.length - 1];
    }

    // ⭐ Fetch price immediately for this item
    try {
        const url = `https://api.warframe.market/v2/orders/item/${resolvedSlug}/top`;

        const response = await axios.get(url, {
            headers: {
                "User-Agent": "Mozilla/5.0",
                "Accept": "application/json",
                "Platform": "pc",
                "Language": "en",
                "Crossplay": "true"
            }
        });

        const json = response.data;

        if (json.data && json.data.sell && json.data.sell.length > 0) {
            const sellOrders = json.data.sell
                .filter(o => o.visible)
                .sort((a, b) => a.platinum - b.platinum);

            existing.price = sellOrders.length ? sellOrders[0].platinum : 0;
        } else {
            existing.price = 0;
        }

    } catch (err) {
        console.log("Price fetch failed for", resolvedSlug, err.message);
        existing.price = 0;
    }

    fs.writeFileSync(inventoryPath, JSON.stringify(inventory, null, 2));
    res.json({ rows: inventory });
});



// -------------------------------------------------------------
// Update Quantity
// -------------------------------------------------------------
app.post("/updateQuantity", (req, res) => {
    const { itemName, newQuantity } = req.body;

    let normalizedName = normalizeName(itemName);
    const resolvedSlug = slugLookup[normalizedName];

    const item = inventory.find(i =>
        i.slug.trim().toLowerCase() === (resolvedSlug || item.slug).trim().toLowerCase()
    );

    if (item) {
        item.quantity = Number(newQuantity);
        fs.writeFileSync(inventoryPath, JSON.stringify(inventory, null, 2));
    }

    res.json({ rows: inventory });
});


// -------------------------------------------------------------
// Update Prices using v2 orders endpoint (data.sell)
// -------------------------------------------------------------
app.post("/updatePrices", async (req, res) => {
    console.log("BACKEND: /updatePrices route hit");

    for (const item of inventory) {
        try {
            const url = `https://api.warframe.market/v2/orders/item/${item.slug}/top`;

            console.log("Fetching:", url);

            const response = await axios.get(url, {
                headers: {
                    "User-Agent": "Mozilla/5.0",
                    "Accept": "application/json",
                    "Platform": "pc",
                    "Language": "en",
                    "Crossplay": "true"
                }
            });

            const json = response.data;

            // v2 orders/item/<slug>/top → json.data.sell / json.data.buy
            if (!json.data || !json.data.sell || json.data.sell.length === 0) {
                console.log("No sell orders for:", item.slug);
                item.price = 0;
                continue;
            }

            const sellOrders = json.data.sell
                .filter(o => o.visible)
                .sort((a, b) => a.platinum - b.platinum);

            const lowest = sellOrders.length ? sellOrders[0].platinum : 0;

            item.price = lowest;

            console.log(item.name + ": " + lowest);
        } catch (err) {
            console.log("ERROR for", item.slug);
            console.log("Message:", err.message);

            if (err.response) {
                console.log("Status:", err.response.status);
                console.log("Data:", err.response.data);
            }

            item.price = 0;
        }
    }

    fs.writeFileSync(inventoryPath, JSON.stringify(inventory, null, 2));
    res.json({ rows: inventory });
});


// -------------------------------------------------------------
// Total value
// -------------------------------------------------------------
app.get("/totalValue", (req, res) => {
    const total = inventory.reduce((sum, item) => {
        return sum + (Number(item.quantity) * Number(item.price));
    }, 0);
    res.json({ total });
});

// -------------------------------------------------------------
// DELETER
// -------------------------------------------------------------
app.post("/deleteItem", (req, res) => {
    const { slug } = req.body;

    inventory = inventory.filter(i =>
        i.slug.trim().toLowerCase() !== slug.trim().toLowerCase()
    );

    fs.writeFileSync(inventoryPath, JSON.stringify(inventory, null, 2));
    res.json({ rows: inventory });
});



// -------------------------------------------------------------
// START SERVER
// -------------------------------------------------------------
console.log("Reached end of server.js — starting server");

app.listen(3000, () => {
    console.log("Dashboard running at http://localhost:3000");
});
