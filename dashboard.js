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
// COMBINE SET
// ------------------------------

async function combineSet() {
    const setName = document.getElementById("combineSetName").value.trim();
    if (!setName) {
        alert("Enter a set name");
        return;
    }

    const result = await window.api.combineSet(setName);

    if (!result.success) {
        alert(result.reason);
        return;
    }

    alert(`Combined ${result.setsCreated} set(s) of ${setName}.`);

    inventory = await window.api.getInventory();
    renderTable(inventory);
    await refreshTotals();

    const tracker = await window.api.getBuildTracker();
    await renderBuildTracker(tracker);

    document.getElementById("combineSetName").value = "";
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
    await renderBuildTracker(tracker);
});

// Logic for the sidebar
function switchView(viewName) {
    document.querySelectorAll(".view").forEach(el => el.style.display = "none");
    document.getElementById("view-" + viewName).style.display = "block";

    document.querySelectorAll(".nav-btn").forEach(btn => btn.classList.remove("active"));
    event.target.classList.add("active");
}

// Settings Panel
function toggleSettingsPanel() {
    const panel = document.getElementById("settingsPanel");
    panel.style.display = panel.style.display === "none" ? "block" : "none";
}

document.getElementById("settingsPanel").addEventListener("click", (event) => {
    if (event.target.id === "settingsPanel") {
        toggleSettingsPanel();
    }
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        document.getElementById("settingsPanel").style.display = "none";
    }
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
    await renderBuildTracker(tracker);

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

            <td class="item-name" onclick="showPriceHistory('${item.slug}', '${item.name.replace(/'/g, "\\'")}')">${item.price}</td>
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

async function checkOffComponent(setName, partName, isPrime, itemCategory) {
    if (isPrime) {
        const fullName = `${setName} ${partName}`;
        const slugBase = fullName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

        // Blueprint component itself: no suffix needed (it already ends in "blueprint")
        // Warframe parts (Chassis/Neuroptics/Systems): need "_blueprint" appended
        // Weapon parts (Barrel/Receiver/Stock/etc.): no suffix needed
        const needsSuffix = partName !== "Blueprint" && itemCategory === "Warframe Part";
        const slug = needsSuffix ? slugBase + "_blueprint" : slugBase;

        inventory = await window.api.addItem(fullName, slug);
        renderTable(inventory);
        await refreshTotals();
    } else {
        await window.api.checkBuildTrackerPart(setName, partName);
    }

    const tracker = await window.api.getBuildTracker();
    await renderBuildTracker(tracker);
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
            const safeType = (m.type || "").replace(/'/g, "\\'");
            const safeCategory = (m.category || "").replace(/'/g, "\\'");
            return `<div onclick="pickBuildTrackerSuggestion('${safeName}', '${m.type}')">${m.name}</div>`;
        })
        .join("");

    box.style.display = "block";
}

function pickBuildTrackerSuggestion(name, wfcdType, wfcdCategory) {
    document.getElementById("buildTrackerName").value = name;
    const normalizedType = normalizeWfcdType(wfcdType, wfcdCategory);
    selectedBuildTrackerItem = { name, type: normalizedType };
    document.getElementById("buildTrackerSuggestions").style.display = "none";
}

let buildTracker = []; // current build tracker list, mirrors the `inventory` global pattern

function isTrackableComponent(component, itemCategory) {
    if (itemCategory === "Warframe Part") {
        return ["Blueprint", "Chassis", "Neuroptics", "Systems"].includes(component.name);
    }
    return component.drops && component.drops.length > 0;
}

async function uncheckOffComponent(setName, partName, isPrime) {
    if (isPrime) {
        const fullName = `${setName} ${partName}`;
        const existingItem = inventory.find(
            i => normalizeNameClient(i.name) === normalizeNameClient(fullName)
        );
        if (existingItem) {
            inventory = await window.api.deleteItem(existingItem.slug);
            renderTable(inventory);
            await refreshTotals();
        }
    } else {
        await window.api.uncheckBuildTrackerPart(setName, partName);
    }

    const tracker = await window.api.getBuildTracker();
    await renderBuildTracker(tracker);
}

async function renderBuildTracker(rows) {
    buildTracker = rows;
    const container = document.getElementById("buildTrackerTable");
    const scrollContainer = document.querySelector(".content");
    const scrollPos = scrollContainer.scrollTop;

    container.innerHTML = "<p>Loading...</p>";

    let html = `<div class="build-tracker-grid">`;

    for (const trackedSet of rows) {
        const components = await window.api.getFarmInfo(trackedSet.name, trackedSet.type);
        const requiredParts = components.filter(c => isTrackableComponent(c, trackedSet.type));
        const imageName = await window.api.getItemImage(trackedSet.name, trackedSet.type);
        const imageUrl = imageName ? `https://cdn.warframestat.us/img/${imageName}` : null;

        const safeSetName = trackedSet.name.replace(/'/g, "\\'");
        const safeSetNameForClick = trackedSet.name.replace(/'/g, "\\'").replace(/"/g, "&quot;");

        html += `<div class="set-card">`;

        if (imageUrl) {
            html += `<img src="${imageUrl}" class="set-card-image" alt="${trackedSet.name}">`;
        }

        html += `<h3 onclick="showFarmInfo({name: '${safeSetNameForClick}', set: '${safeSetNameForClick}', type: '${trackedSet.type}'})">${trackedSet.name}</h3>`;

        if (requiredParts.length === 0) {
            html += `<p><em>No component data available for this set.</em></p>`;
        } else {
            let allOwned = true;

            html += `<ul class="component-checklist">`;
            for (const part of requiredParts) {
                const isPrime = part.ducats !== undefined;
                let owned;

                if (isPrime) {
                    const fullName = `${trackedSet.name} ${part.name}`;
                    owned = inventory.some(
                        invItem => normalizeNameClient(invItem.name) === normalizeNameClient(fullName) && invItem.quantity > 0
                    );
                } else {
                    owned = (trackedSet.obtainedParts || []).includes(part.name);
                }

                if (!owned) allOwned = false;

                const safePartName = part.name.replace(/'/g, "\\'");

                html += `<li>
                    <input type="checkbox" ${owned ? "checked" : ""}
                        onchange="this.blur(); this.checked ? checkOffComponent('${safeSetName}', '${safePartName}', ${isPrime}, '${trackedSet.type}') : uncheckOffComponent('${safeSetName}', '${safePartName}', ${isPrime})">
                    ${part.name}
                </li>`;
            }
            html += `</ul>`;

            if (allOwned) {
                const isPrimeSet = requiredParts.some(p => p.ducats !== undefined);
                if (isPrimeSet) {
                    html += `<button onclick="combineSetFromPanel('${safeSetName}')">Combine Set</button>`;
                } else {
                    html += `<button onclick="craftedRemove('${safeSetName}')">I've Crafted This — Remove</button>`;
                }
            }
        }

        html += `<button class="delete-btn" onclick="removeItemFromBuildTracker('${safeSetName}')">Remove from Tracker</button>`;
        html += `</div>`;
    }

    html += `</div>`;

    container.innerHTML = html || "<p>No sets being tracked yet.</p>";
    scrollContainer.scrollTop = scrollPos;
}

async function combineSetFromPanel(setName) {
    const result = await window.api.combineSet(setName);

    if (!result.success) {
        alert(result.reason);
        return;
    }

    alert(`Combined ${result.setsCreated} set(s) of ${setName}.`);

    inventory = await window.api.getInventory();
    renderTable(inventory);
    await refreshTotals();

    const tracker = await window.api.getBuildTracker();
    await renderBuildTracker(tracker);
}

async function craftedRemove(setName) {
    const tracker = await window.api.removeFromBuildTracker(setName);
    await renderBuildTracker(tracker);
}

async function promoteToInventory(name, slug) {
    inventory = await window.api.addItem(name, slug);
    renderTable(inventory);
    await refreshTotals();

    const tracker = await window.api.getBuildTracker();
    await renderBuildTracker(tracker);
}

// The normalize name function is duplicated into main.js as well.  any changes here or there need to be duplicated (for now)

function normalizeNameClient(name) {
    return name.trim().toLowerCase().replace(/\s+blueprint$/i, "").replace(/\s+/g, " ");
}

async function removeItemFromBuildTracker(name) {
    const tracker = await window.api.removeFromBuildTracker(name);
    await renderBuildTracker(tracker);
}

function normalizeWfcdType(wfcdType, wfcdCategory) {
    if (wfcdCategory === "Warframes" || wfcdType === "Warframe") return "Warframe Part";
    if (wfcdCategory === "Mods" || wfcdType === "Mod") return "Mod";
    if (wfcdCategory === "Arcanes") return "Arcane";
    if (wfcdCategory === "Relics") return "Relic";
    // Weapons cover many WFCD "type" values (Rifle, Pistol, Melee, Shotgun, etc.)
    if (["Rifle", "Pistol", "Melee", "Shotgun", "Sentinel Weapon", "Archwing", "Archgun", "Archmelee"].includes(wfcdType)) return "Weapon Part";
    return "Misc";
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

    await renderBuildTracker(tracker);

    document.getElementById("buildTrackerName").value = "";
    selectedBuildTrackerItem = null;
}

// ------------------------------
// PRICE HISTORY MODAL
// ------------------------------

let priceHistoryChartInstance = null;
let volumeChartInstance = null;

async function showPriceHistory(slug, itemName) {
    const history = await window.api.getPriceHistory(slug);

    document.getElementById("priceHistoryTitle").textContent = `${itemName} — 90 Day Price History`;

    if (!history || history.length === 0) {
        document.getElementById("priceHistoryModal").style.display = "block";
        return;
    }

    const labels = history.map(d => new Date(d.date).toLocaleDateString());
    const movingAvgData = history.map(d => d.movingAvg);
    const medianData = history.map(d => d.median);
    const volumeData = history.map(d => d.volume);

    const priceCtx = document.getElementById("priceHistoryChart").getContext("2d");
    const volumeCtx = document.getElementById("volumeChart").getContext("2d");

    if (priceHistoryChartInstance) priceHistoryChartInstance.destroy();
    if (volumeChartInstance) volumeChartInstance.destroy();

    priceHistoryChartInstance = new Chart(priceCtx, {
        type: "line",
        data: {
            labels: labels,
            datasets: [
                {
                    label: "Moving Avg (Plat)",
                    data: movingAvgData,
                    borderColor: "#2a6df4",
                    backgroundColor: "#2a6df4",
                    tension: 0.2,
                    pointRadius: 0,
                    borderWidth: 2
                },
                {
                    label: "Median (Plat)",
                    data: medianData,
                    borderColor: "#888",
                    backgroundColor: "#888",
                    tension: 0.2,
                    pointRadius: 0,
                    borderWidth: 1,
                    borderDash: [3, 3]
                }
            ]
        },
        options: {
            responsive: false,
            interaction: { mode: "index", intersect: false },
            scales: {
                y: {
                    title: { display: true, text: "Platinum", color: "#eee" },
                    ticks: { color: "#eee" },
                    grid: { color: "#333" }
                },
                x: {
                    ticks: { display: false },
                    grid: { color: "#222" }
                }
            },
            plugins: {
                legend: { labels: { color: "#eee" } }
            }
        }
    });

    const rawMax = Math.max(...volumeData) * 1.15;
    const volumeMax = Math.ceil(rawMax / 50) * 50;

    volumeChartInstance = new Chart(volumeCtx, {
        type: "bar",
        data: {
            labels: labels,
            datasets: [{
                label: "Volume",
                data: volumeData,
                backgroundColor: "rgba(237, 160, 46, 0.6)"
            }]
        },
        options: {
            responsive: false,
            scales: {
                y: {
                    title: { display: true, text: "Volume", color: "#eee" },
                    ticks: { color: "#eee", stepSize: 50 },
                    grid: { color: "#333" },
                    max: volumeMax
                },
                x: {
                    ticks: { color: "#eee", maxTicksLimit: 12 },
                    grid: { color: "#222" }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });

    document.getElementById("priceHistoryModal").style.display = "block";
}

function closePriceHistoryModal() {
    document.getElementById("priceHistoryModal").style.display = "none";
}

document.getElementById("priceHistoryModal").addEventListener("click", (event) => {
    if (event.target.id === "priceHistoryModal") {
        closePriceHistoryModal();
    }
});

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
// BACKUP / RESTORE
// ------------------------------

async function exportBackupHandler() {
    const result = await window.api.exportBackup();

    if (!result.success) {
        if (result.reason !== "Export cancelled.") {
            alert(result.reason);
        }
        return;
    }

    alert(`Backup saved to:\n${result.path}`);
}

async function importBackupHandler() {
    const confirmed = confirm(
        "Importing a backup will overwrite your current inventory and build tracker data. This cannot be undone. Continue?"
    );

    if (!confirmed) return;

    const result = await window.api.importBackup();

    if (!result.success) {
        if (result.reason !== "Import cancelled.") {
            alert(result.reason);
        }
        return;
    }

    inventory = result.inventory;
    renderTable(inventory);
    await refreshTotals();

    const tracker = await window.api.getBuildTracker();
    await renderBuildTracker(tracker);

    alert("Backup imported successfully.");
}

// Restore Auto Bakcup

async function restoreAutoBackupHandler() {
    const confirmed = confirm(
        "This will restore your most recent auto-backup, overwriting your current inventory and build tracker. Continue?"
    );

    if (!confirmed) return;

    const result = await window.api.restoreAutoBackup();

    if (!result.success) {
        alert(result.reason);
        return;
    }

    inventory = result.inventory;
    renderTable(inventory);
    await refreshTotals();

    const tracker = await window.api.getBuildTracker();
    await renderBuildTracker(tracker);

    const backupDate = new Date(result.exportedAt).toLocaleString();
    alert(`Restored auto-backup from ${backupDate}.`);
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
