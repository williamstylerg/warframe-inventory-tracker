// buildTracker.js
import {
    buildTracker, setBuildTracker, inventory, wfcdItems, allItems,
    buildTrackerFilter, buildTrackerPrimeFilter, buildTrackerSearchQuery,
    setBuildTrackerFilterState, setBuildTrackerPrimeFilterState, setBuildTrackerSearchQuery,
    selectedBuildTrackerItem, setSelectedBuildTrackerItem, setInventory
} from "./state.js";
import { isTrackableComponent, normalizeNameClient, isArchwingRelated } from "./shared.js";
import { renderTable, refreshTotals } from "./priceTracker.js";

export function normalizeWfcdType(wfcdType, wfcdCategory) {
    if (wfcdCategory === "Warframes" || wfcdType === "Warframe") return "Warframe Part";
    if (wfcdCategory === "Mods" || wfcdType === "Mod") return "Mod";
    if (wfcdCategory === "Arcanes") return "Arcane";
    if (wfcdCategory === "Relics") return "Relic";
    if (["Rifle", "Pistol", "Melee", "Shotgun", "Sentinel Weapon", "Archwing", "Arch-Gun", "Arch-Melee"].includes(wfcdType)) return "Weapon Part";
    return "Misc";
}

export function setBuildTrackerFilter(filter) {
    setBuildTrackerFilterState(filter);
    renderBuildTracker(buildTracker);
}
export function setBuildTrackerPrimeFilter(filter) {
    setBuildTrackerPrimeFilterState(filter);
    renderBuildTracker(buildTracker);
}
export function filterBuildTracker(query) {
    setBuildTrackerSearchQuery(query.trim().toLowerCase());
    renderBuildTracker(buildTracker);
}
export function toggleBuildTrackerFilterMenu() {
    const menu = document.getElementById("buildTrackerFilterMenu");
    menu.style.display = menu.style.display === "none" ? "block" : "none";
}

export async function checkOffComponent(setName, partName, isPrime, itemCategory) {
    if (isPrime) {
        const fullName = `${setName} ${partName}`;
        const slugBase = fullName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
        const needsSuffix = partName !== "Blueprint" && itemCategory === "Warframe";
        const slug = needsSuffix ? slugBase + "_blueprint" : slugBase;
        const newInv = await window.api.addItem(fullName, slug);
        setInventory(newInv);
        renderTable(newInv);
        await refreshTotals();
    } else {
        await window.api.checkBuildTrackerPart(setName, partName);
    }
    const tracker = await window.api.getBuildTracker();
    await renderBuildTracker(tracker);
}

export async function uncheckOffComponent(setName, partName, isPrime) {
    if (isPrime) {
        const fullName = `${setName} ${partName}`;
        const existingItem = inventory.find((i) => normalizeNameClient(i.name) === normalizeNameClient(fullName));
        if (existingItem) {
            const newInv = await window.api.deleteItem(existingItem.slug);
            setInventory(newInv);
            renderTable(newInv);
            await refreshTotals();
        }
    } else {
        await window.api.uncheckBuildTrackerPart(setName, partName);
    }
    const tracker = await window.api.getBuildTracker();
    await renderBuildTracker(tracker);
}

export async function combineSetFromPanel(setName) {
    const { showAlert } = await import("./settings.js");
    const result = await window.api.combineSet(setName);
    if (!result.success) { await showAlert(result.reason); return; }
    await showAlert(`Combined ${result.setsCreated} set(s) of ${setName}.`);
    const newInv = await window.api.getInventory();
    setInventory(newInv);
    renderTable(newInv);
    await refreshTotals();
    const tracker = await window.api.getBuildTracker();
    await renderBuildTracker(tracker);
}

export async function craftedRemove(setName) {
    const tracker = await window.api.removeFromBuildTracker(setName);
    await renderBuildTracker(tracker);
}

export async function removeItemFromBuildTracker(name) {
    const tracker = await window.api.removeFromBuildTracker(name);
    await renderBuildTracker(tracker);
}

export function showBuildTrackerSuggestions(value) {
    const box = document.getElementById("buildTrackerSuggestions");
    if (!value.trim()) { box.style.display = "none"; return; }
    const v = value.toLowerCase();
    const matches = wfcdItems.filter((i) => i.name.toLowerCase().includes(v)).slice(0, 10);
    if (matches.length === 0) { box.style.display = "none"; return; }
    box.innerHTML = matches.map((m) => {
        const safeName = m.name.replace(/'/g, "\\'");
        return `<div data-action="pick-build-tracker-suggestion" data-name="${safeName}" data-type="${m.type}" data-category="${m.category || ""}">${m.name}</div>`;
    }).join("");
    box.style.display = "block";
}

export function pickBuildTrackerSuggestion(name, wfcdType, wfcdCategory) {
    document.getElementById("buildTrackerName").value = name;
    const normalizedType = normalizeWfcdType(wfcdType, wfcdCategory);
    setSelectedBuildTrackerItem({ name, type: normalizedType });
    document.getElementById("buildTrackerSuggestions").style.display = "none";
}

export async function addItemToBuildTracker() {
    const nameInput = document.getElementById("buildTrackerName").value.trim();
    if (!nameInput) {
        const { showAlert } = await import("./settings.js");
        await showAlert("Enter an item name");
        return;
    }
    const name = selectedBuildTrackerItem?.name || nameInput;
    const type = selectedBuildTrackerItem?.type || "Misc";
    const parts = name.split(" ");
    const set = parts.length > 1 ? parts[0] + " " + parts[1] : parts[0];
    const normalizedName = normalizeNameClient(name);
    const marketMatch = allItems.find((i) => normalizeNameClient(i.name) === normalizedName);
    const tracker = await window.api.addToBuildTracker({
        name, set, type, marketSlug: marketMatch ? marketMatch.slug : null, tradable: !!marketMatch,
    });
    await renderBuildTracker(tracker);
    document.getElementById("buildTrackerName").value = "";
    setSelectedBuildTrackerItem(null);
}

export async function getAlmostCompleteSets() {
    const almostComplete = [];
    for (const trackedSet of buildTracker) {
        const components = await window.api.getFarmInfo(trackedSet.name, trackedSet.type);
        const requiredParts = components.filter((c) => isTrackableComponent(c, trackedSet.type));
        if (requiredParts.length === 0) continue;
        let ownedCount = 0;
        const missingParts = [];
        for (const part of requiredParts) {
            const isPrime = part.ducats !== undefined;
            let owned;
            if (isPrime) {
                const fullName = `${trackedSet.name} ${part.name}`;
                owned = inventory.some((invItem) => normalizeNameClient(invItem.name) === normalizeNameClient(fullName) && invItem.quantity > 0);
            } else {
                owned = (trackedSet.obtainedParts || []).includes(part.name);
            }
            if (owned) ownedCount++; else missingParts.push(part.name);
        }
        const missingCount = requiredParts.length - ownedCount;
        if (missingCount === 1) {
            almostComplete.push({ setName: trackedSet.name, setType: trackedSet.type, missingPart: missingParts[0], ownedCount, totalRequired: requiredParts.length });
        }
    }
    return almostComplete;
}

export async function renderAlmostCompleteDigest() {
    const container = document.getElementById("almostCompleteDigest");
    if (!container) return;
    const almostComplete = await getAlmostCompleteSets();
    if (almostComplete.length === 0) { container.innerHTML = ""; return; }
    let html = `<h3 style="margin-bottom:8px;">Almost There</h3><div class="build-tracker-grid" style="margin-bottom:24px;">`;
    for (const item of almostComplete) {
        const safeSetName = item.setName.replace(/'/g, "\\'");
        html += `<div class="set-card" style="border-color:#eac435;">
            <h3 class="item-name" data-action="show-farm-info-obj" data-name="${safeSetName}" data-set="${safeSetName}" data-type="${item.setType}">${item.setName}</h3>
            <p>${item.ownedCount} / ${item.totalRequired} components — missing <strong>${item.missingPart}</strong></p>
        </div>`;
    }
    html += `</div>`;
    container.innerHTML = html;
}

export async function renderBuildTracker(rows) {
    setBuildTracker(rows);
    const container = document.getElementById("buildTrackerTable");
    const scrollContainer = document.querySelector(".content");
    const scrollPos = scrollContainer.scrollTop;
    let html = `<div class="build-tracker-grid">`;

    const filteredRows = rows.filter((trackedSet) => {
        const typeMatch = buildTrackerFilter === "all" ? true : buildTrackerFilter === "warframe" ? trackedSet.type.includes("Warframe") : !trackedSet.type.includes("Warframe");
        const primeMatch = buildTrackerPrimeFilter === "all" ? true : buildTrackerPrimeFilter === "prime" ? trackedSet.name.includes("Prime") : !trackedSet.name.includes("Prime");
        const searchMatch = buildTrackerSearchQuery ? trackedSet.name.toLowerCase().includes(buildTrackerSearchQuery) : true;
        return typeMatch && primeMatch && searchMatch;
    }).sort((a, b) => {
        const aIsPrime = a.name.includes("Prime");
        const bIsPrime = b.name.includes("Prime");
        if (aIsPrime !== bIsPrime) return aIsPrime ? -1 : 1;
        return a.name.localeCompare(b.name);
    });

    for (const trackedSet of filteredRows) {
        const components = await window.api.getFarmInfo(trackedSet.name, trackedSet.type);
        const requiredParts = components.filter((c) => isTrackableComponent(c, trackedSet.type));
        const imageName = await window.api.getItemImage(trackedSet.name, trackedSet.type);
        const imageUrl = imageName ? `https://cdn.warframestat.us/img/${imageName}` : null;
        const safeSetName = trackedSet.name.replace(/'/g, "\\'");

        html += `<div class="set-card">`;
        if (imageUrl) {
            const showBadge = isArchwingRelated(trackedSet.name);
            html += `<div class="image-container">
                <img src="${imageUrl}" class="set-card-image" alt="${trackedSet.name}">
                ${showBadge ? `<img src="assets/archwing-icon.png" class="archwing-badge" title="Archwing-related">` : ""}
            </div>`;
        }
        html += `<h3 data-action="show-farm-info-obj" data-name="${safeSetName}" data-set="${safeSetName}" data-type="${trackedSet.type}">${trackedSet.name}</h3>`;

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
                    owned = inventory.some((invItem) => normalizeNameClient(invItem.name) === normalizeNameClient(fullName) && invItem.quantity > 0);
                } else {
                    owned = (trackedSet.obtainedParts || []).includes(part.name);
                }
                if (!owned) allOwned = false;
                const safePartName = part.name.replace(/'/g, "\\'");
                html += `<li>
                    <span class="part-label">${part.name}</span>
                    <input type="checkbox" ${owned ? "checked" : ""}
                        data-action="toggle-component" data-set="${safeSetName}" data-part="${safePartName}" data-prime="${isPrime}" data-category="${trackedSet.type}">
                </li>`;
            }
            html += `</ul>`;
            if (allOwned) {
                const isPrimeSet = requiredParts.some((p) => p.ducats !== undefined);
                if (isPrimeSet) {
                    html += `<button data-action="combine-set" data-set="${safeSetName}">Combine Set</button>`;
                } else {
                    html += `<button data-action="crafted-remove" data-set="${safeSetName}">I've Crafted This — Remove</button>`;
                }
            }
        }
        html += `<button class="delete-btn" data-action="remove-tracked-set" data-set="${safeSetName}">Remove from Tracker</button>`;
        html += `</div>`;
    }
    html += `</div>`;
    container.innerHTML = html || "<p>No sets being tracked yet.</p>";
    scrollContainer.scrollTop = scrollPos;
    await renderAlmostCompleteDigest();
}