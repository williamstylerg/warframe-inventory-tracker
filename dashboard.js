// ------------------------------
// GLOBALS
// ------------------------------
let allItems = [];        // autocomplete list (from Warframe Market API)
let inventory = [];       // current inventory rows
let sortColumn = null;
let sortAsc = true;
let wfcdItems = []; // WFCD catalog for build-tracker autocomplete

// ------------------------------
// CUSTOM DIALOGS (replaces native confirm()/alert())
// ------------------------------

function showAlert(message) {
    return new Promise((resolve) => {
        const modal = document.getElementById("customDialogModal");
        document.getElementById("customDialogMessage").textContent = message;
        const buttonsDiv = document.getElementById("customDialogButtons");
        buttonsDiv.innerHTML = "";

        const okBtn = document.createElement("button");
        okBtn.textContent = "OK";
        okBtn.onclick = () => {
            modal.style.display = "none";
            resolve();
        };
        buttonsDiv.appendChild(okBtn);

        modal.style.display = "block";
        okBtn.focus();
    });
}

function showConfirm(message) {
    return new Promise((resolve) => {
        const modal = document.getElementById("customDialogModal");
        document.getElementById("customDialogMessage").textContent = message;
        const buttonsDiv = document.getElementById("customDialogButtons");
        buttonsDiv.innerHTML = "";

        const yesBtn = document.createElement("button");
        yesBtn.textContent = "Yes";
        yesBtn.onclick = () => {
            modal.style.display = "none";
            resolve(true);
        };

        const noBtn = document.createElement("button");
        noBtn.textContent = "Cancel";
        noBtn.style.background = "#444";
        noBtn.onclick = () => {
            modal.style.display = "none";
            resolve(false);
        };

        buttonsDiv.appendChild(yesBtn);
        buttonsDiv.appendChild(noBtn);

        modal.style.display = "block";
        yesBtn.focus();
    });
}

// ------------------------------
// INITIALIZATION
// ------------------------------
document.addEventListener("DOMContentLoaded", async () => {
    const version = await window.api.getAppVersion();
    document.getElementById("appVersionDisplay").textContent = `v${version}`;
    await loadAppSettings();
    await refreshInventory();
    await refreshTotals();
    const tracker = await window.api.getBuildTracker();
    await renderBuildTracker(tracker);
    await refreshRelics();
});


// ------------------------------
// Helper Function For Table Visuals
// ------------------------------

function getRowClass(item) {
    const isSet = item.name.trim().endsWith(" Set");
    if (isSet) return "row-set";

    if (item.type === "Mod") {
        if (item.rarity === "Common") return "mod-common";
        if (item.rarity === "Uncommon") return "mod-uncommon";
        if (item.rarity === "Rare") return "mod-rare";
        return "";
    }

    if (item.tier === "gold") return "tier-gold";
    if (item.tier === "silver") return "tier-silver";
    if (item.tier === "bronze") return "tier-bronze";
    return "";
}

function getDisplayRarity(item) {
    if (item.name.trim().endsWith(" Set")) {
        return "";
    }
    if (item.rarity && item.rarity !== "Unknown") {
        return item.rarity;
    }
    if (item.tier === "gold") return "Rare";
    if (item.tier === "silver") return "Uncommon";
    if (item.tier === "bronze") return "Common";
    return "Unknown";
}

function getDisplayType(item) {
    if (item.name.trim().endsWith(" Set")) {
        return "Set";
    }
    return item.type;
}


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
        await showAlert("Enter a set name");
        return;
    }

    const result = await window.api.combineSet(setName);

    if (!result.success) {
        await showAlert(result.reason);
        return;
    }

    await showAlert(`Combined ${result.setsCreated} set(s) of ${setName}.`);

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
    const version = await window.api.getAppVersion();
    document.getElementById("appVersionDisplay").textContent = `v${version}`;

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
    const targetBtn = document.querySelector(`.nav-btn[data-view="${viewName}"]`);
    if (targetBtn) targetBtn.classList.add("active");

    if (viewName === "portfolio") {
        renderPortfolioChart();
    }
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
        document.getElementById("relicRewardsModal").style.display = "none";
    }
});

async function backfillTiersHandler() {
    document.getElementById("settingsPanel").style.display = "none";
    const result = await window.api.backfillTiers();
    inventory = await window.api.getInventory();
    renderTable(inventory);
    await showAlert(`Updated tier data for ${result.updated} of ${result.total} items.`);
}

async function refreshAllRelicDataHandler() {
    document.getElementById("settingsPanel").style.display = "none";
    const confirmed = await showConfirm(
        "This will refetch all relic drop data from the live source. It may take a moment. Continue?"
    );
    if (!confirmed) return;

    const result = await window.api.refreshAllRelicData();

    if (result.success) {
        await showAlert(`Updated ${result.count} relics.`);
    } else {
        await showAlert("Failed to update relic data: " + result.reason);
    }
}

// ------------------------------
// ADD ITEM
// ------------------------------
async function addItem() {
    const name = document.getElementById("itemName").value.trim();
    const slug = document.getElementById("itemSlug").value.trim();

    if (!name || !slug) {
        await showAlert("Item name and slug required");
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

    const suggested = calculateAveragePlatPerDucat(inventory);
    const suggestionEl = document.getElementById("platPerDucatSuggestion");
    if (suggested) {
        suggestionEl.innerHTML = `Your items currently average ~${suggested}. <a href="#" onclick="event.preventDefault(); updatePlatPerDucat(${suggested});">Use this</a>`;
    }
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
// CLEAR CACHE BUTTON HELPER
// ------------------------------

async function clearFarmCacheHandler() {
    document.getElementById("settingsPanel").style.display = "none";

    const confirmed = await showConfirm("This will clear cached farm/component data. It will be refetched automatically as needed. Continue?");
    if (!confirmed) return;

    const result = await window.api.clearFarmCache();
    if (result.success) {
        await showAlert("Farm data cache cleared.");
    } else {
        await showAlert("Failed to clear cache: " + result.reason);
    }
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
            <th>Ducats</th>
            <th onclick="sortBy('price')">Price${sortArrow('price')}</th>
            <th onclick="sortBy('total')">Total${sortArrow('total')}</th>
            <th onclick="sortBy('lastUpdated')">Updated${sortArrow('lastUpdated')}</th>
            <th>Delete</th>
        </tr>
        `;

    for (const item of rows) {
        const total = item.price * item.quantity;

        const rowClass = getRowClass(item);
        html += `
        <tr class="${rowClass}">
            <td class="item-name" onclick="showFarmInfo(inventory[${rows.indexOf(item)}])">${item.name}</td>
            <td>${getDisplayType(item)}</td>
            <td>${getDisplayRarity(item)}</td>
            <td>${item.vaulted ? "Yes" : "No"}</td>
            <td>${item.set}</td>

            <td>
                <input class="qty-input" type="number" min="1" value="${item.quantity}"
                    onchange="updateQuantity('${item.slug}', this.value)">
            </td>

            <td>
                ${getDucatComparisonCell(item)}
            </td>

            <td>
                <div style="display:flex; align-items:center; gap:6px;">
                    <span style="min-width:36px; display:inline-block; text-align:right;">${item.price}</span>
                    <button onclick="showPriceHistory('${item.slug}', '${item.name.replace(/'/g, "\\'")}')" title="View price history" style="background:#2a2a2a; border:1px solid #444; border-radius:4px; padding:4px 8px;">📈</button>
                </div>
            </td>

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

function getOwnedRelicQuantity(relicFullName) {
    const key = relicFullName.trim().toLowerCase().replace(/\s+relic$/i, "");
    const match = relicInventory.find(r => r.name.trim().toLowerCase() === key);
    return match ? match.quantity : 0;
}

function renderFarmModal(setName, components, itemType) {
    const modal = document.getElementById("farmModal");
    const body = document.getElementById("farmModalBody");

    if (!components || components.length === 0) {
        body.innerHTML = `<p>No farm data found for ${setName}.</p>`;
        modal.style.display = "block";
        return;
    }

    const isFlatDropsList = components[0] && components[0].relic !== undefined;

    function renderDropLine(drop) {
        const owned = getOwnedRelicQuantity(drop.relic);
        const ownedTag = owned > 0
            ? ` <span style="color:#4dd9ec; font-weight:bold;">(${owned} owned)</span>`
            : "";
        return `<li>${drop.relic} — ${drop.chance}% (${drop.rarity})${ownedTag}</li>`;
    }

    let html = `<h2>${setName}</h2>`;

    if (isFlatDropsList) {
        html += `<ul>`;
        for (const drop of components) {
            html += renderDropLine(drop);
        }
        html += `</ul>`;
    } else {
        const trackableComponents = components.filter(c => isTrackableComponent(c, itemType));
        html += `<div class="farm-component-grid">`;
        for (const comp of trackableComponents) {
            const imageUrl = comp.imageName ? `https://cdn.warframestat.us/img/${comp.imageName}` : null;

            html += `<div class="farm-component-box">`;
            if (imageUrl) {
                html += `<img src="${imageUrl}" class="farm-component-image" alt="${comp.name}">`;
            }
            html += `<h3>${comp.name}</h3>`;
            if (!comp.drops || comp.drops.length === 0) {
                html += `<p><em>No relic drop data (likely a resource or non-relic item).</em></p>`;
            } else {
                html += `<ul class="farm-component-drops">`;
                for (const drop of comp.drops) {
                    html += renderDropLine(drop);
                }
                html += `</ul>`;
            }
            html += `</div>`;
        }
        html += `</div>`;
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
        const needsSuffix = partName !== "Blueprint" && itemCategory === "Warframe";
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

let buildTrackerFilter = "all";
let buildTrackerPrimeFilter = "all"; // "all" | "prime" | "nonprime"

function setBuildTrackerFilter(filter) {
    buildTrackerFilter = filter;
    renderBuildTracker(buildTracker);
}

function setBuildTrackerPrimeFilter(filter) {
    buildTrackerPrimeFilter = filter;
    renderBuildTracker(buildTracker);
}

async function renderBuildTracker(rows) {
    buildTracker = rows;
    const container = document.getElementById("buildTrackerTable");
    const scrollContainer = document.querySelector(".content");
    const scrollPos = scrollContainer.scrollTop;

    // container.innerHTML = "<p>Loading...</p>";

    let html = `<div class="build-tracker-grid">`;

    const filteredRows = rows.filter(trackedSet => {
        const typeMatch =
            buildTrackerFilter === "all" ? true :
            buildTrackerFilter === "warframe" ? trackedSet.type.includes("Warframe") :
            !trackedSet.type.includes("Warframe");

        const primeMatch =
            buildTrackerPrimeFilter === "all" ? true :
            buildTrackerPrimeFilter === "prime" ? trackedSet.name.includes("Prime") :
            !trackedSet.name.includes("Prime");

            const searchMatch = buildTrackerSearchQuery
            ? trackedSet.name.toLowerCase().includes(buildTrackerSearchQuery)
            : true;

        return typeMatch && primeMatch && searchMatch;
    }).sort((a, b) => {
    const aIsPrime = a.name.includes("Prime");
    const bIsPrime = b.name.includes("Prime");

    if (aIsPrime !== bIsPrime) {
        return aIsPrime ? -1 : 1; // Primes always sort first
    }
    });

    for (const trackedSet of filteredRows) {
        const components = await window.api.getFarmInfo(trackedSet.name, trackedSet.type);
        const requiredParts = components.filter(c => isTrackableComponent(c, trackedSet.type));
        const imageName = await window.api.getItemImage(trackedSet.name, trackedSet.type);
        const imageUrl = imageName ? `https://cdn.warframestat.us/img/${imageName}` : null;

        const safeSetName = trackedSet.name.replace(/'/g, "\\'");
        const safeSetNameForClick = trackedSet.name.replace(/'/g, "\\'").replace(/"/g, "&quot;");

        html += `<div class="set-card">`;

        if (imageUrl) {
            const showBadge = isArchwingRelated(trackedSet.name);
            html += `<div class="image-container">
                <img src="${imageUrl}" class="set-card-image" alt="${trackedSet.name}">
                ${showBadge ? `<img src="assets/archwing-icon.png" class="archwing-badge" title="Archwing-related">` : ""}
            </div>`;
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
                    <span class="part-label">${part.name}</span>
                    <input type="checkbox" ${owned ? "checked" : ""}
                        onchange="this.blur(); this.checked ? checkOffComponent('${safeSetName}', '${safePartName}', ${isPrime}, '${trackedSet.type}') : uncheckOffComponent('${safeSetName}', '${safePartName}', ${isPrime})">
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
    await renderAlmostCompleteDigest();
}

async function combineSetFromPanel(setName) {
    const result = await window.api.combineSet(setName);

    if (!result.success) {
        await showAlert(result.reason);
        return;
    }

    await showAlert(`Combined ${result.setsCreated} set(s) of ${setName}.`);

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
        await showAlert("Enter an item name");
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

// sorting for build tracker page

function setBuildTrackerFilter(filter) {
    buildTrackerFilter = filter;
    renderBuildTracker(buildTracker);
}

function toggleBuildTrackerFilterMenu() {
    const menu = document.getElementById("buildTrackerFilterMenu");
    menu.style.display = menu.style.display === "none" ? "block" : "none";
}

document.addEventListener("click", (event) => {
    const menu = document.getElementById("buildTrackerFilterMenu");
    if (menu.style.display === "block" && !menu.contains(event.target) && event.target.getAttribute("onclick") !== "toggleBuildTrackerFilterMenu()") {
        menu.style.display = "none";
    }
});

// NEAR COMPLETED SETS

async function getAlmostCompleteSets() {
    const almostComplete = [];

    for (const trackedSet of buildTracker) {
        const components = await window.api.getFarmInfo(trackedSet.name, trackedSet.type);
        const requiredParts = components.filter(c => isTrackableComponent(c, trackedSet.type));

        if (requiredParts.length === 0) continue;

        let ownedCount = 0;
        const missingParts = [];

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

            if (owned) {
                ownedCount++;
            } else {
                missingParts.push(part.name);
            }
        }

        const missingCount = requiredParts.length - ownedCount;

        if (missingCount === 1) {
            almostComplete.push({
                setName: trackedSet.name,
                setType: trackedSet.type,
                missingPart: missingParts[0],
                ownedCount,
                totalRequired: requiredParts.length
            });
        }
    }

    return almostComplete;
}

async function renderAlmostCompleteDigest() {
    const container = document.getElementById("almostCompleteDigest");
    if (!container) return;

    const almostComplete = await getAlmostCompleteSets();

    if (almostComplete.length === 0) {
        container.innerHTML = "";
        return;
    }

    let html = `<h3 style="margin-bottom:8px;">Almost There</h3><div class="build-tracker-grid" style="margin-bottom:24px;">`;
    for (const item of almostComplete) {
        const safeSetName = item.setName.replace(/'/g, "\\'");
        const safeSetNameForClick = item.setName.replace(/'/g, "\\'").replace(/"/g, "&quot;");

        html += `<div class="set-card" style="border-color:#eac435;">
            <h3 class="item-name" onclick="showFarmInfo({name: '${safeSetNameForClick}', set: '${safeSetNameForClick}', type: '${item.setType}'})">${item.setName}</h3>
            <p>${item.ownedCount} / ${item.totalRequired} components — missing <strong>${item.missingPart}</strong></p>
        </div>`;
    }
    html += `</div>`;

    container.innerHTML = html;
}


// ------------------------------
// RELIC INVENTORY
// ------------------------------

let relicInventory = [];

async function refreshRelics() {
    relicInventory = await window.api.getRelics();
    renderRelicGrid(relicInventory);
}

function renderRelicGrid(relics) {
    const container = document.getElementById("relicGrid");
    const sorted = sortRelics(relics);

    if (sorted.length === 0) {
        container.innerHTML = "<p>No relics tracked yet.</p>";
        return;
    }

    let html = "";
    for (const relic of sorted) {
        const safeName = relic.name.replace(/'/g, "\\'");
        const imageUrl = relic.imageName ? `https://cdn.warframestat.us/img/${relic.imageName}` : null;

        html += `<div class="set-card">`;
        if (imageUrl) {
            html += `<img src="${imageUrl}" class="set-card-image" alt="${relic.name}">`;
        }
        const safeNameForClick = relic.name.replace(/'/g, "\\'");
        html += `<h3 class="item-name" onclick="showRelicRewards('${safeNameForClick}')">${relic.name}</h3>`;
        html += `<div style="display:flex; align-items:center; gap:8px; margin-bottom:10px;">
            <button onclick="adjustRelicQuantity('${safeName}', -1)">-</button>
            <span>${relic.quantity}</span>
            <button onclick="adjustRelicQuantity('${safeName}', 1)">+</button>
        </div>`;
        html += `</div>`;
    }

    container.innerHTML = html;
}


async function adjustRelicQuantity(name, delta) {
    const relic = relicInventory.find(r => r.name === name);
    const newQuantity = (relic ? relic.quantity : 0) + delta;

    relicInventory = await window.api.updateRelicQuantity(name, newQuantity);
    renderRelicGrid(relicInventory);
}

async function removeRelicHandler(name) {
    relicInventory = await window.api.removeRelic(name);
    renderRelicGrid(relicInventory);
}

async function addRelicHandler() {
    const nameInput = document.getElementById("relicSearchName").value.trim();
    if (!nameInput) return;

    const normalizedName = normalizeRelicName(nameInput);
    const imageName = getRelicImageName(normalizedName);

    relicInventory = await window.api.addRelic(normalizedName, imageName);
    renderRelicGrid(relicInventory);

    document.getElementById("relicSearchName").value = "";
}

// Relic page ordering

const RELIC_TIER_ORDER = ["Lith", "Meso", "Neo", "Axi"];

function sortRelics(relics) {
    return [...relics].sort((a, b) => {
        const [tierA, nameA] = a.name.split(" ");
        const [tierB, nameB] = b.name.split(" ");

        const tierIndexA = RELIC_TIER_ORDER.indexOf(tierA);
        const tierIndexB = RELIC_TIER_ORDER.indexOf(tierB);

        if (tierIndexA !== tierIndexB) return tierIndexA - tierIndexB;
        return nameA.localeCompare(nameB);
    });
}


// Relic front end for Autofill

let relicNameList = [];

(async function loadRelicNameList() {
    try {
        const response = await fetch("https://drops.warframestat.us/data/relics.json");
        const data = await response.json();
        const relicsList = data.relics || data;

        const seen = new Set();
        relicNameList = [];
        for (const entry of relicsList) {
            if (!entry.tier || !entry.relicName) continue;
            const fullName = `${entry.tier} ${entry.relicName}`;
            if (!seen.has(fullName)) {
                seen.add(fullName);
                relicNameList.push(fullName);
            }
        }
    } catch (err) {
        console.log("Failed to load relic name list:", err.message);
        relicNameList = [];
    }
})();

// Relic Autofill Function

let relicSuggestionIndex = -1;
let currentRelicSuggestions = [];

function showRelicSuggestions(value) {
    const box = document.getElementById("relicSuggestions");
    relicSuggestionIndex = -1;

    if (!value.trim()) {
        box.style.display = "none";
        currentRelicSuggestions = [];
        return;
    }

    const v = value.toLowerCase();
    currentRelicSuggestions = relicNameList.filter(name => name.toLowerCase().includes(v)).slice(0, 10);

    if (currentRelicSuggestions.length === 0) {
        box.style.display = "none";
        return;
    }

    renderRelicSuggestionBox();
    box.style.display = "block";
}

function renderRelicSuggestionBox() {
    const box = document.getElementById("relicSuggestions");
    box.innerHTML = currentRelicSuggestions
        .map((name, i) => {
            const highlighted = i === relicSuggestionIndex ? "background:#444;" : "";
            const safeName = name.replace(/'/g, "\\'");
            return `<div style="${highlighted}" onclick="pickRelicSuggestion('${safeName}')">${name}</div>`;
        })
        .join("");
}

function pickRelicSuggestion(name) {
    document.getElementById("relicSearchName").value = name;
    document.getElementById("relicSuggestions").style.display = "none";
    currentRelicSuggestions = [];
    relicSuggestionIndex = -1;
}

function handleRelicSearchKeydown(event) {
    if (currentRelicSuggestions.length === 0) {
        if (event.key === "Enter") {
            addRelicHandler();
        }
        return;
    }

    if (event.key === "ArrowDown") {
        event.preventDefault();
        relicSuggestionIndex = Math.min(relicSuggestionIndex + 1, currentRelicSuggestions.length - 1);
        renderRelicSuggestionBox();
    } else if (event.key === "ArrowUp") {
        event.preventDefault();
        relicSuggestionIndex = Math.max(relicSuggestionIndex - 1, -1);
        renderRelicSuggestionBox();
    } else if (event.key === "Enter") {
        event.preventDefault();
        if (relicSuggestionIndex >= 0) {
            pickRelicSuggestion(currentRelicSuggestions[relicSuggestionIndex]);
        }
        addRelicHandler();
    } else if (event.key === "Escape") {
        document.getElementById("relicSuggestions").style.display = "none";
        currentRelicSuggestions = [];
        relicSuggestionIndex = -1;
    }
}

function normalizeRelicName(input) {
    const parts = input.trim().split(/\s+/);
    if (parts.length < 2) return input.trim();
    const tier = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
    const code = parts[1].toUpperCase();
    return `${tier} ${code}`;
}

function getRelicImageName(relicFullName) {
    const tier = relicFullName.trim().split(" ")[0];
    const tierMap = {
        Lith: "RelicLithD.png",
        Meso: "RelicMesoD.png",
        Neo: "RelicNeoD.png",
        Axi: "RelicAxiD.png"
    };
    return tierMap[tier] || null;
}

async function backfillRelicImagesHandler() {
    document.getElementById("settingsPanel").style.display = "none";
    for (const relic of relicInventory) {
        if (!relic.imageName) {
            const imageName = getRelicImageName(relic.name);
            if (imageName) {
                await window.api.updateRelicImage(relic.name, imageName);
            }
        }
    }
    await refreshRelics();
    await showAlert("Relic images updated.");
}

// Relic Reward Map for Suggested Builds

async function buildRelicRewardMap() {
    const map = new Set();

    for (const relic of relicInventory) {
        if (relic.quantity <= 0) continue;

        const dropData = await window.api.getRelicDropData(relic.name);
        if (!dropData) continue;

        for (const state of ["Intact", "Exceptional", "Flawless", "Radiant"]) {
            const rewards = dropData.rewards[state] || [];
            for (const reward of rewards) {
                const normalized = reward.itemName.trim().toLowerCase().replace(/\s+blueprint$/i, "");
                map.add(normalized);
            }
        }
    }

    return map;
}

let lastDiscoveryResults = [];

async function runDiscoverNewSets() {
    document.getElementById("discoverList").innerHTML = `
        <p><span class="spinner"></span>Scanning your relics against every Prime set... this may take a moment the first time.</p>
    `;

    lastDiscoveryResults = await discoverNewSets();
    await renderDiscoverResults(lastDiscoveryResults);
}

async function trackDiscoveredSet(setName, setType) {
    await window.api.addToBuildTracker({ name: setName, type: setType });

    lastDiscoveryResults = lastDiscoveryResults.filter(d => d.setName !== setName);
    await renderDiscoverResults(lastDiscoveryResults);

    const tracker = await window.api.getBuildTracker();
    await renderBuildTracker(tracker);

    await showAlert(`${setName} added to your Build Tracker.`);
}

function getAllPrimeSetNames() {
    const relevantCategories = ["Warframes", "Primary", "Secondary", "Melee", "Sentinels", "Archwing", "Arch-Gun", "Arch-Melee"];
    return wfcdItems.filter(i => i.name.includes("Prime") && relevantCategories.includes(i.category));
}

async function discoverNewSets() {
    const allSets = getAllPrimeSetNames();
    const trackedNames = new Set(buildTracker.map(t => t.name.trim().toLowerCase()));
    const relicRewardMap = await buildRelicRewardMap();

    const discoveries = [];

    for (const set of allSets) {
        if (trackedNames.has(set.name.trim().toLowerCase())) continue;

        const components = await window.api.getFarmInfo(set.name, set.type);
        const requiredParts = components.filter(c => isTrackableComponent(c, set.type));

        if (requiredParts.length === 0) continue;

        let matchedCount = 0;
        const matchedParts = [];

        for (const part of requiredParts) {
            const fullPartName = `${set.name} ${part.name}`.trim().toLowerCase().replace(/\s+blueprint$/i, "");
            if (relicRewardMap.has(fullPartName)) {
                matchedCount++;
                matchedParts.push(part.name);
            }
        }

        if (matchedCount / requiredParts.length >= 0.75) {
            discoveries.push({
                setName: set.name,
                setType: set.type,
                matchedCount,
                totalRequired: requiredParts.length,
                matchedParts
            });
        }
    }

    return discoveries;
}

async function renderDiscoverResults(discoveries) {
    const container = document.getElementById("discoverList");

    if (discoveries.length === 0) {
        container.innerHTML = "<p>No new completable sets found based on your current relics.</p>";
        return;
    }

    const filtered = discoveries.filter(d => {
        if (discoverFilter === "all") return true;
        if (discoverFilter === "warframe") return d.setType.includes("Warframe");
        if (discoverFilter === "weapon") return !d.setType.includes("Warframe");
        return true;
    });

    filtered.sort((a, b) => (b.matchedCount / b.totalRequired) - (a.matchedCount / a.totalRequired));

    let html = "";
    for (const d of filtered) {
        const safeSetName = d.setName.replace(/'/g, "\\'");
        const safeSetNameForClick = d.setName.replace(/'/g, "\\'").replace(/"/g, "&quot;");
        const imageName = await window.api.getItemImage(d.setName, d.setType);
        const imageUrl = imageName ? `https://cdn.warframestat.us/img/${imageName}` : null;

        html += `<div class="set-card">`;
        if (imageUrl) {
            html += `<img src="${imageUrl}" class="set-card-image" style="height:100px;" alt="${d.setName}">`;
        }
        html += `<h3 class="item-name" onclick="showFarmInfo({name: '${safeSetNameForClick}', set: '${safeSetNameForClick}', type: '${d.setType}'})">${d.setName}</h3>
            <p>${d.matchedCount} / ${d.totalRequired} components possible from your relics</p>
            <p style="font-size:0.85em; color:#aaa;">${d.matchedParts.join(", ")}</p>
            <button onclick="trackDiscoveredSet('${safeSetName}', '${d.setType}')">Track this Set</button>
        </div>`;
    }

    container.innerHTML = `<div class="build-tracker-grid">${html}</div>`;
}

//Recommendation Filter

let discoverFilter = "all";

function setDiscoverFilter(filter) {
    discoverFilter = filter;
    renderDiscoverResults(lastDiscoveryResults);
}


// ------------------------------
// Relic Reward Modal
// ------------------------------

async function showRelicRewards(relicName) {
    const dropData = await window.api.getRelicDropData(relicName);
    const body = document.getElementById("relicRewardsBody");

    if (!dropData) {
        body.innerHTML = `<p>No drop data found for ${relicName}.</p>`;
        document.getElementById("relicRewardsModal").style.display = "block";
        return;
    }

    const intactRewards = dropData.rewards.Intact || [];

    let html = `<h2>${relicName} (Intact)</h2><ul>`;
    for (const reward of intactRewards) {
        html += `<li>${reward.itemName} — ${reward.chance}% (${reward.rarity})</li>`;
    }
    html += `</ul>`;

    body.innerHTML = html;
    document.getElementById("relicRewardsModal").style.display = "block";
}

function closeRelicRewardsModal() {
    document.getElementById("relicRewardsModal").style.display = "none";
}

document.getElementById("relicRewardsModal").addEventListener("click", (event) => {
    if (event.target.id === "relicRewardsModal") {
        closeRelicRewardsModal();
    }
});


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
        } else if (column === 'rarity') {
            const rarityRank = { "": -1, "Common": 0, "Uncommon": 1, "Rare": 2 };
            valA = rarityRank[getDisplayRarity(a)] ?? -1;
            valB = rarityRank[getDisplayRarity(b)] ?? -1;
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
// Relic Recommendation Sorting
// ------------------------------

let recommendationGroupMode = "target";
let currentRecommendations = [];

async function loadRecommendations() {
    document.getElementById("recommendationsNavBtn").style.display = "block";
    switchView("recommendations");

    document.getElementById("recommendationList").innerHTML = `
        <p><span class="spinner"></span>Loading recommendations...</p>
    `;
    const recommendations = await window.api.getRelicRecommendations();
    await renderRecommendations(recommendations);
}

function toggleRecommendationGrouping() {
    recommendationGroupMode = recommendationGroupMode === "target" ? "relic" : "target";
    renderRecommendations(currentRecommendations);
}

async function renderRecommendations(recommendations) {
    currentRecommendations = recommendations;
    const container = document.getElementById("recommendationList");

    if (recommendations.length === 0) {
        container.innerHTML = "<p>No recommendations yet — add relics or track sets to see suggestions.</p>";
        return;
    }

    let html = "";

    if (recommendationGroupMode === "target") {
        const bySet = {};
        for (const rec of recommendations) {
            if (!bySet[rec.targetSet]) bySet[rec.targetSet] = {};
            if (!bySet[rec.targetSet][rec.targetItem]) bySet[rec.targetSet][rec.targetItem] = [];
            bySet[rec.targetSet][rec.targetItem].push(rec);
        }

        const sortedSets = Object.keys(bySet).sort();
        for (const setName of sortedSets) {
            const trackedEntry = buildTracker.find(t => t.name === setName);
            const setType = trackedEntry ? trackedEntry.type : "Warframe Part";
            const imageName = await window.api.getItemImage(setName, setType);
            const imageUrl = imageName ? `https://cdn.warframestat.us/img/${imageName}` : null;

            html += `<div class="recommendation-set-group" style="display:flex; justify-content:space-between; align-items:flex-start; gap:16px;">`;
            html += `<div style="flex-grow:1;">`;
            html += `<h2>${setName}</h2>`;
            for (const itemName in bySet[setName]) {
                html += `<h3>${itemName}</h3><ul>`;
                for (const rec of bySet[setName][itemName]) {
                    html += `<li>${rec.relicName} (${rec.relicQuantity} owned) — ${rec.chance}% at ${rec.minRefinement}</li>`;
                }
                html += `</ul>`;
            }
            html += `</div>`;
            if (imageUrl) {
                html += `<img src="${imageUrl}" style="width:160px; height:160px; object-fit:contain; background:#111; border-radius:6px; flex-shrink:0;" alt="${setName}">`;
            }
            html += `</div>`;
        }
    } else {
        const grouped = {};
        for (const rec of recommendations) {
            if (!grouped[rec.relicName]) grouped[rec.relicName] = [];
            grouped[rec.relicName].push(rec);
        }
        for (const key in grouped) {
            const quantity = grouped[key][0].relicQuantity;
            html += `<div class="recommendation-set-group">`;
            html += `<h3>${key} (${quantity} owned)</h3><ul>`;
            for (const rec of grouped[key]) {
                html += `<li>${rec.targetItem} (${rec.targetSet}) — ${rec.chance}% at ${rec.minRefinement}</li>`;
            }
            html += `</ul>`;
            html += `</div>`;
        }
    }

    container.innerHTML = html;
}

// toggle for relic recommendation engine:
let discoverHasRun = false;

function setRecommendationTab(tab) {
    document.getElementById("recommendationTabGaps").style.display = tab === "gaps" ? "block" : "none";
    document.getElementById("recommendationTabDiscover").style.display = tab === "discover" ? "block" : "none";

    if (tab === "discover" && !discoverHasRun) {
        discoverHasRun = true;
        runDiscoverNewSets();
    }
}


// ------------------------------
// BACKUP / RESTORE
// ------------------------------

async function exportBackupHandler() {
    document.getElementById("settingsPanel").style.display = "none";
    const result = await window.api.exportBackup();

    if (!result.success) {
        if (result.reason !== "Export cancelled.") {
            await showAlert(result.reason);
        }
        return;
    }

    await showAlert(`Backup saved to:\n${result.path}`);
}

async function importBackupHandler() {
    document.getElementById("settingsPanel").style.display = "none";
    const confirmed = await showConfirm(
        "Importing a backup will overwrite your current inventory and build tracker data. This cannot be undone. Continue?"
    );

    if (!confirmed) return;

    const result = await window.api.importBackup();

    if (!result.success) {
        if (result.reason !== "Import cancelled.") {
            await showAlert(result.reason);
        }
        return;
    }

    inventory = result.inventory;
    renderTable(inventory);
    await refreshTotals();

    const tracker = await window.api.getBuildTracker();
    await renderBuildTracker(tracker);

    await showAlert("Backup imported successfully.");
}

// Restore Auto Bakcup

async function restoreAutoBackupHandler() {
    document.getElementById("settingsPanel").style.display = "none";
    const confirmed = await showConfirm(
        "This will restore your most recent auto-backup, overwriting your current inventory and build tracker. Continue?"
    );

    if (!confirmed) return;

    const result = await window.api.restoreAutoBackup();

    if (!result.success) {
        await showAlert(result.reason);
        return;
    }

    inventory = result.inventory;
    renderTable(inventory);
    await refreshTotals();

    const tracker = await window.api.getBuildTracker();
    await renderBuildTracker(tracker);

    const backupDate = new Date(result.exportedAt).toLocaleString();
    await showAlert(`Restored auto-backup from ${backupDate}.`);
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

// ArchWing Specific Lookup

let archwingRelatedNames = new Set();

(async function loadArchwingRelatedNames() {
    try {
        const response = await fetch("https://api.warframestat.us/items?only=name,type");
        const items = await response.json();

        archwingRelatedNames = new Set(
            items
                .filter(i => i.type && i.type.includes("Arch"))
                .map(i => i.name.trim().toLowerCase())
        );
    } catch (err) {
        console.log("Failed to load archwing-related names:", err.message);
        archwingRelatedNames = new Set();
    }
})();

function isArchwingRelated(itemName) {
    return archwingRelatedNames.has(itemName.trim().toLowerCase());
}


//--------------------------
// PORTFOLIO SNAPSHOT
//--------------------------

let portfolioChartInstance = null;

async function renderPortfolioChart() {
    const history = await window.api.getPortfolioHistory();
    const container = document.getElementById("view-portfolio");

    if (history.length === 0) {
        return; // canvas just stays empty; could add a placeholder message if you prefer
    }

    const labels = history.map(h => h.date);
    const platValues = history.map(h => h.totalPlat);
    const uniqueValues = history.map(h => h.totalUnique);
    const itemValues = history.map(h => h.totalItems);

    const ctx = document.getElementById("portfolioChart").getContext("2d");

    if (portfolioChartInstance) portfolioChartInstance.destroy();

    portfolioChartInstance = new Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
            datasets: [
                {
                    label: "Total Platinum Value",
                    data: platValues,
                    borderColor: "#2a6df4",
                    backgroundColor: "#2a6df4",
                    yAxisID: "y",
                    tension: 0.2,
                    pointRadius: 3
                },
                {
                    label: "Unique Items",
                    data: uniqueValues,
                    borderColor: "#eac435",
                    backgroundColor: "#eac435",
                    yAxisID: "y1",
                    tension: 0.2,
                    pointRadius: 3,
                    borderDash: [4, 4]
                },
                {
                    label: "Total Items",
                    data: itemValues,
                    borderColor: "#8c9aa8",
                    backgroundColor: "#8c9aa8",
                    yAxisID: "y1",
                    tension: 0.2,
                    pointRadius: 3,
                    borderDash: [2, 2]
                }
            ]
        },
        options: {
            responsive: false,
            interaction: { mode: "index", intersect: false },
            scales: {
                y: {
                    type: "linear",
                    position: "left",
                    title: { display: true, text: "Platinum", color: "#eee" },
                    ticks: { color: "#eee" },
                    grid: { color: "#333" }
                },
                y1: {
                    type: "linear",
                    position: "right",
                    title: { display: true, text: "Item Count", color: "#eee" },
                    ticks: { color: "#eee" },
                    grid: { display: false }
                },
                x: {
                    ticks: { color: "#eee" },
                    grid: { color: "#222" }
                }
            },
            plugins: {
                legend: { labels: { color: "#eee" } }
            }
        }
    });
}


//--------------------------
// DUCATS/PLAT LOGIC
//--------------------------

async function backfillDucatsHandler() {
    document.getElementById("settingsPanel").style.display = "none";
    const result = await window.api.backfillDucats();
    inventory = await window.api.getInventory();
    renderTable(inventory);
    await showAlert(`Updated ducat data for ${result.updated} of ${result.total} items.`);
}

let platPerDucat = 15;

async function loadAppSettings() {
    const settings = await window.api.getAppSettings();
    platPerDucat = settings.platPerDucat || 15;
    document.getElementById("platPerDucatInput").value = platPerDucat;
}

async function updatePlatPerDucat(value) {
    const numValue = Math.max(0.01, Number(value) || 15);
    platPerDucat = numValue;
    await window.api.updateAppSettings({ platPerDucat: numValue });
    document.getElementById("platPerDucatInput").value = numValue;
    renderTable(inventory);
}
// helper for ducats

function getDucatComparisonCell(item) {
    if (item.ducats === null || item.ducats === undefined) return "—";

    const ducatEquivalent = item.ducats * platPerDucat;
    const platPrice = Number(item.price);

    let label = "";
    if (platPrice > ducatEquivalent) {
        label = `<div style="color:#4dd9ec; font-size:0.8em;">Sell for Plat</div>`;
    } else if (ducatEquivalent > platPrice) {
        label = `<div style="color:#eac435; font-size:0.8em;">Trade for Ducats</div>`;
    } else {
        label = `<div style="font-size:0.8em;">Even</div>`;
    }

    return `<div>${item.ducats}d</div>${label}`;
}

function calculateAveragePlatPerDucat(inv) {
    const validItems = inv.filter(i => i.ducats && i.ducats > 0 && i.price > 0);
    if (validItems.length === 0) return null;

    const ratios = validItems.map(i => i.price / i.ducats);
    const average = ratios.reduce((sum, r) => sum + r, 0) / ratios.length;
    return Math.round(average * 100) / 100;
}

//-----------------------
//SEARCH FUNCTIONS IN PAGES
//-----------------------

function filterPriceTable(query) {
    const q = query.trim().toLowerCase();
    const filtered = q ? inventory.filter(i => i.name.toLowerCase().includes(q)) : inventory;
    renderTable(filtered);
}

let buildTrackerSearchQuery = "";

function filterBuildTracker(query) {
    buildTrackerSearchQuery = query.trim().toLowerCase();
    renderBuildTracker(buildTracker);
}

function filterRelicGrid(query) {
    const q = query.trim().toLowerCase();
    const filtered = q ? relicInventory.filter(r => r.name.toLowerCase().includes(q)) : relicInventory;
    renderRelicGrid(filtered);
}