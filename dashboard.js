// ------------------------------
// GLOBALS
// ------------------------------
let allItems = [];        // autocomplete list (from Warframe Market API)
let inventory = [];       // current inventory rows
let sortColumn = null;
let sortAsc = true;
let wfcdItems = []; // WFCD catalog for build-tracker autocomplete

// ------------------------------
// INITIALIZATION
// ------------------------------
document.addEventListener("DOMContentLoaded", async () => {
    await refreshInventory();
    await refreshTotals();
});


// ------------------------------
// REFRESH INVENTORY TABLE
// ------------------------------
async function refreshInventory() {
    inventory = await window.api.getInventory();
    renderTable(inventory);
}


// ------------------------------
// REFRESH TOTALS
// ------------------------------
async function refreshTotals() {
    const totals = await window.api.getTotals();
    document.getElementById("totalUnique").innerText = totals.uniqueCount;
    document.getElementById("totalPlat").innerText = totals.totalPlat;
}

// Load build tracker on startup

document.addEventListener("DOMContentLoaded", async () => {
    await refreshInventory();
    await refreshTotals();
    const tracker = await window.api.getBuildTracker();
    renderBuildTracker(tracker);
});

// ------------------------------
// ADD ITEM
// ------------------------------
async function addItem() {
    const name = document.getElementById("itemName").value.trim();
    const slug = document.getElementById("itemSlug").value.trim();

    if (!name || !slug) {
        alert("Item name and slug required");
        return;
    }

    inventory = await window.api.addItem(name, slug);
    renderTable(inventory);
    await refreshTotals();

    const tracker = await window.api.getBuildTracker();
    renderBuildTracker(tracker);

    document.getElementById("itemName").value = "";
    document.getElementById("itemSlug").value = "";
    hideSuggestions();
}


// ------------------------------
// UPDATE PRICES
// ------------------------------
async function updatePrices() {
    inventory = await window.api.updatePrices();
    renderTable(inventory);
    await refreshTotals();
}


// ------------------------------
// UPDATE QUANTITY
// ------------------------------
async function updateQuantity(slug, newQuantity) {
    const updated = await window.api.updateQuantity(slug, newQuantity);
    renderTable(updated);
    await refreshTotals();
}


// ------------------------------
// DELETE ITEM
// ------------------------------
async function deleteItem(slug) {
    inventory = await window.api.deleteItem(slug);
    renderTable(inventory);
    await refreshTotals();
}


// ------------------------------
// SORT ARROW HELPER
// ------------------------------
function sortArrow(column) {
    if (sortColumn !== column) return "";
    return sortAsc ? " ▲" : " ▼";
}

// ------------------------------
// RENDER TABLE
// ------------------------------
function renderTable(rows) {
    const table = document.getElementById("inventoryTable");

    let html = `
        <tr>
            <th onclick="sortBy('name')">Name${sortArrow('name')}</th>
            <th onclick="sortBy('type')">Type${sortArrow('type')}</th>
            <th onclick="sortBy('rarity')">Rarity${sortArrow('rarity')}</th>
            <th onclick="sortBy('vaulted')">Vaulted${sortArrow('vaulted')}</th>
            <th onclick="sortBy('set')">Set${sortArrow('set')}</th>
            <th onclick="sortBy('quantity')">Qty${sortArrow('quantity')}</th>
            <th onclick="sortBy('price')">Price${sortArrow('price')}</th>
            <th onclick="sortBy('total')">Total${sortArrow('total')}</th>
            <th onclick="sortBy('lastUpdated')">Updated${sortArrow('lastUpdated')}</th>
            <th>Delete</th>
        </tr>
        `;

    for (const item of rows) {
        const total = item.price * item.quantity;

        html += `
        <tr>
            <td class="item-name" onclick="showFarmInfo(inventory[${rows.indexOf(item)}])">${item.name}</td>
            <td>${item.type}</td>
            <td>${item.rarity}</td>
            <td>${item.vaulted ? "Yes" : "No"}</td>
            <td>${item.set}</td>

            <td>
                <input class="qty-input" type="number" min="1" value="${item.quantity}"
                    onchange="updateQuantity('${item.slug}', this.value)">
            </td>

            <td>${item.price}</td>
            <td>${total}</td>
            <td>${new Date(item.lastUpdated).toLocaleDateString()}</td>

            <td>
                <button class="delete-btn" onclick="deleteItem('${item.slug}')">X</button>
            </td>
        </tr>
        `;

    }

    table.innerHTML = html;
}


// ------------------------------
// FARM INFO MODAL
// ------------------------------
async function showFarmInfo(item) {
    const lookupName = item.type === "Mod" ? item.name : item.set;
    const components = await window.api.getFarmInfo(lookupName, item.type);
    renderFarmModal(lookupName, components);
}

// Listener for closing popups
document.getElementById("farmModal").addEventListener("click", (event) => {
    if (event.target.id === "farmModal") {
        closeFarmModal();
    }
});
document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        closeFarmModal();
    }
});

function renderFarmModal(setName, components) {
    const modal = document.getElementById("farmModal");
    const body = document.getElementById("farmModalBody");

    if (!components || components.length === 0) {
        body.innerHTML = `<p>No farm data found for ${setName}.</p>`;
        modal.style.display = "block";
        return;
    }

    const isFlatDropsList = components[0] && components[0].relic !== undefined;

    let html = `<h2>${setName}</h2>`;

    if (isFlatDropsList) {
        html += `<ul>`;
        for (const drop of components) {
            html += `<li>${drop.relic} — ${drop.chance}% (${drop.rarity})</li>`;
        }
        html += `</ul>`;
    } else {
        for (const comp of components) {
            html += `<h3>${comp.name}</h3>`;
            if (!comp.drops || comp.drops.length === 0) {
                html += `<p><em>No relic drop data (likely a resource or non-relic item).</em></p>`;
            } else {
                html += `<ul>`;
                for (const drop of comp.drops) {
                    html += `<li>${drop.relic} — ${drop.chance}% (${drop.rarity})</li>`;
                }
                html += `</ul>`;
            }
        }
    }

    body.innerHTML = html;
    modal.style.display = "block";
}

function closeFarmModal() {
    document.getElementById("farmModal").style.display = "none";
}


// ------------------------------
// BUILD TRACKER
// ------------------------------

async function addToBuildTracker(name, set, type) {
    const normalized = name.trim().toLowerCase();

    // Check if this name matches something on warframe.market
    const marketMatch = allItems.find(
        i => i.name.trim().toLowerCase() === normalized
    );

    const tracker = await window.api.addToBuildTracker({
        name,
        set,
        type,
        marketSlug: marketMatch ? marketMatch.slug : null,
        tradable: !!marketMatch
    });

    return tracker;
}

let selectedBuildTrackerItem = null; // holds {name, type} once picked from suggestions

function showBuildTrackerSuggestions(value) {
    const box = document.getElementById("buildTrackerSuggestions");

    if (!value.trim()) {
        box.style.display = "none";
        return;
    }

    const v = value.toLowerCase();
    const matches = wfcdItems.filter(i => i.name.toLowerCase().includes(v)).slice(0, 10);

    if (matches.length === 0) {
        box.style.display = "none";
        return;
    }

    box.innerHTML = matches
        .map(m => {
            const safeName = m.name.replace(/'/g, "\\'");
            return `<div onclick="pickBuildTrackerSuggestion('${safeName}', '${m.type}')">${m.name}</div>`;
        })
        .join("");

    box.style.display = "block";
}

let buildTracker = []; // current build tracker list, mirrors the `inventory` global pattern

function renderBuildTracker(rows) {
    buildTracker = rows;
    const table = document.getElementById("buildTrackerTable");

    let html = `
        <tr>
            <th>Name</th>
            <th>Set</th>
            <th>Type</th>
            <th>Obtained</th>
            <th>Tradable</th>
            <th>Action</th>
            <th>Remove</th>
        </tr>
    `;

    for (const item of rows) {
        const isObtained = inventory.some(
            invItem => normalizeNameClient(invItem.name) === normalizeNameClient(item.name) && invItem.quantity > 0
        );

        const actionCell = item.tradable && !isObtained
            ? `<button onclick="promoteToInventory('${item.name.replace(/'/g, "\\'")}', '${item.marketSlug}')">Add to Price Tracker</button>`
            : "";

        html += `
        <tr>
            <td class="item-name" onclick="showFarmInfo(${JSON.stringify(item).replace(/"/g, "&quot;")})">${item.name}</td>
            <td>${item.set}</td>
            <td>${item.type}</td>
            <td>${isObtained ? "Yes" : "No"}</td>
            <td>${item.tradable ? "Yes" : "No"}</td>
            <td>${actionCell}</td>
            <td>
                <button class="delete-btn" onclick="removeItemFromBuildTracker('${item.name.replace(/'/g, "\\'")}')">X</button>
            </td>
        </tr>
        `;
    }

    table.innerHTML = html;
}

async function promoteToInventory(name, slug) {
    inventory = await window.api.addItem(name, slug);
    renderTable(inventory);
    await refreshTotals();

    const tracker = await window.api.getBuildTracker();
    renderBuildTracker(tracker);
}

// The normalize name function is duplicated into main.js as well.  any changes here or there need to be duplicated (for now)

function normalizeNameClient(name) {
    return name.trim().toLowerCase().replace(/\s+blueprint$/i, "").replace(/\s+/g, " ");
}

async function removeItemFromBuildTracker(name) {
    const tracker = await window.api.removeFromBuildTracker(name);
    renderBuildTracker(tracker);
}

function pickBuildTrackerSuggestion(name, type) {
    document.getElementById("buildTrackerName").value = name;
    selectedBuildTrackerItem = { name, type };
    document.getElementById("buildTrackerSuggestions").style.display = "none";
}

async function addItemToBuildTracker() {
    const nameInput = document.getElementById("buildTrackerName").value.trim();

    if (!nameInput) {
        alert("Enter an item name");
        return;
    }

    const name = selectedBuildTrackerItem?.name || nameInput;
    const type = selectedBuildTrackerItem?.type || "Misc";

    const parts = name.split(" ");
    const set = parts.length > 1 ? parts[0] + " " + parts[1] : parts[0];

    // Check whether this item exists on warframe.market
    const normalizedName = normalizeNameClient(name);
    const marketMatch = allItems.find(
        i => normalizeNameClient(i.name) === normalizedName
    );

    const tracker = await window.api.addToBuildTracker({
        name,
        set,
        type,
        marketSlug: marketMatch ? marketMatch.slug : null,
        tradable: !!marketMatch
    });

    renderBuildTracker(tracker);

    document.getElementById("buildTrackerName").value = "";
    selectedBuildTrackerItem = null;
}

// ------------------------------
// SORTING
// ------------------------------
function sortBy(column) {
    if (sortColumn === column) {
        sortAsc = !sortAsc;
    } else {
        sortColumn = column;
        sortAsc = true;
    }

    inventory.sort((a, b) => {
        let valA, valB;

        if (column === 'total') {
            valA = a.price * a.quantity;
            valB = b.price * b.quantity;
        } else if (column === 'vaulted') {
            valA = a.vaulted ? 1 : 0;
            valB = b.vaulted ? 1 : 0;
        } else if (column === 'lastUpdated') {
            valA = a.lastUpdated;
            valB = b.lastUpdated;
        } else {
            valA = a[column];
            valB = b[column];
        }

        if (valA < valB) return sortAsc ? -1 : 1;
        if (valA > valB) return sortAsc ? 1 : -1;
        return 0;
    });

    renderTable(inventory);
}



// ------------------------------
// AUTOCOMPLETE (local only)
// ------------------------------
function showSuggestions(value) {
    const box = document.getElementById("suggestions");

    if (!value.trim()) {
        hideSuggestions();
        return;
    }

    const v = value.toLowerCase();
    const matches = allItems.filter(i => i.name.toLowerCase().includes(v)).slice(0, 10);

    if (matches.length === 0) {
        hideSuggestions();
        return;
    }

    box.innerHTML = matches
        .map(m => {
            const safeName = m.name.replace(/'/g, "\\'");
            const safeSlug = m.slug.replace(/'/g, "\\'");
            return `<div onclick="pickSuggestion('${safeName}', '${safeSlug}')">${m.name}</div>`;
        })
        .join("");

    box.style.display = "block";
}

function pickSuggestion(name, slug) {
    document.getElementById("itemName").value = name;
    document.getElementById("itemSlug").value = slug;
    hideSuggestions();
}

function hideSuggestions() {
    const box = document.getElementById("suggestions");
    box.style.display = "none";
}


// ------------------------------
// LOAD AUTOCOMPLETE LIST (Warframe Market & WFCD)
// ------------------------------

// Warframe.Market
(async function loadItemList() {
    try {
        const response = await fetch("https://api.warframe.market/v2/items");
        const json = await response.json();
        allItems = json.data.map(i => ({
            name: i.i18n.en.name,
            slug: i.slug
        }));
    } catch (err) {
        console.log("Failed to load item list:", err.message);
        allItems = [];
    }
})();

// WFCD
(async function loadWfcdItemList() {
    try {
        const response = await fetch("https://api.warframestat.us/items?only=name,type,category");
        const json = await response.json();
        wfcdItems = json.map(i => ({
            name: i.name,
            type: i.type,
            category: i.category
        }));
    } catch (err) {
        console.log("Failed to load WFCD item list:", err.message);
        wfcdItems = [];
    }
})();
