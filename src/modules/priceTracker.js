// priceTracker.js

import {
    inventory,
    setInventory,
    sortColumn,
    sortAsc,
    setSortColumn,
    setSortAsc,
    platPerDucat,
    setPlatPerDucat,
    allItems,
} from "./state.js";
import { getRowClass, getDisplayType, getDisplayRarity } from "./shared.js";
import { showAlert } from "./settings.js";
import { renderBuildTracker } from "./buildTracker.js";

export function sortArrow(column) {
    if (sortColumn !== column) return "";
    return sortAsc ? " ▲" : " ▼";
}

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

export function calculateAveragePlatPerDucat(inv) {
    const validItems = inv.filter((i) => i.ducats && i.ducats > 0 && i.price > 0);
    if (validItems.length === 0) return null;

    const ratios = validItems.map((i) => i.price / i.ducats);
    const average = ratios.reduce((sum, r) => sum + r, 0) / ratios.length;
    return Math.round(average * 100) / 100;
}

export async function updatePlatPerDucat(value) {
    const numValue = Math.max(0.01, Number(value) || 15);
    setPlatPerDucat(numValue);
    await window.api.updateAppSettings({ platPerDucat: numValue });
    document.getElementById("platPerDucatInput").value = numValue;
    renderTable(inventory);
}

export function renderTable(rows) {
    const table = document.getElementById("inventoryTable");

    let html = `
        <tr>
            <th data-action="sort" data-column="name">Name${sortArrow("name")}</th>
            <th data-action="sort" data-column="type">Type${sortArrow("type")}</th>
            <th data-action="sort" data-column="rarity">Rarity${sortArrow("rarity")}</th>
            <th data-action="sort" data-column="vaulted">Vaulted${sortArrow("vaulted")}</th>
            <th data-action="sort" data-column="set">Set${sortArrow("set")}</th>
            <th data-action="sort" data-column="quantity">Qty${sortArrow("quantity")}</th>
            <th>Ducats</th>
            <th data-action="sort" data-column="price">Price${sortArrow("price")}</th>
            <th data-action="sort" data-column="total">Total${sortArrow("total")}</th>
            <th data-action="sort" data-column="lastUpdated">Updated${sortArrow("lastUpdated")}</th>
            <th>Delete</th>
        </tr>
        `;

    for (const item of rows) {
        const total = item.price * item.quantity;
        const rowClass = getRowClass(item);
        const safeName = item.name.replace(/'/g, "\\'");

        html += `
        <tr class="${rowClass}">
            <td class="item-name" data-action="show-farm-info" data-item='${JSON.stringify(item)}'>${item.name}</td>
            <td>${getDisplayType(item)}</td>
            <td>${getDisplayRarity(item)}</td>
            <td>${item.vaulted ? "Yes" : "No"}</td>
            <td>${item.set}</td>

            <td>
                <input class="qty-input" type="number" min="1" value="${item.quantity}"
                    data-action="update-quantity" data-slug="${item.slug}">
            </td>

            <td>
                ${getDucatComparisonCell(item)}
            </td>

            <td>
                <div style="display:flex; align-items:center; gap:6px;">
                    <span style="min-width:36px; display:inline-block; text-align:right;">${item.price}</span>
                    <button data-action="show-price-history" data-slug="${item.slug}" data-name="${safeName}" title="View price history" style="background:#2a2a2a; border:1px solid #444; border-radius:4px; padding:4px 8px;">📈</button>
                </div>
            </td>

            <td>${total}</td>
            <td>${new Date(item.lastUpdated).toLocaleDateString()}</td>

            <td>
                <button class="delete-btn" data-action="delete-item" data-slug="${item.slug}">X</button>
            </td>
        </tr>
        `;
    }

    table.innerHTML = html;
}

export async function addItem() {
    const name = document.getElementById("itemName").value.trim();
    const slug = document.getElementById("itemSlug").value.trim();

    if (!name || !slug) {
        await showAlert("Item name and slug required");
        return;
    }

    setInventory(await window.api.addItem(name, slug));
    renderTable(inventory);
    await refreshTotals();

    const tracker = await window.api.getBuildTracker();
    await renderBuildTracker(tracker);

    document.getElementById("itemName").value = "";
    document.getElementById("itemSlug").value = "";
    hideSuggestions();
}

export async function deleteItem(slug) {
    setInventory(await window.api.deleteItem(slug));
    renderTable(inventory);
    await refreshTotals();
}

export async function updateQuantity(slug, newQuantity) {
    const updated = await window.api.updateQuantity(slug, newQuantity);
    setInventory(updated);
    renderTable(inventory);
    await refreshTotals();
}

export async function updatePrices() {
    setInventory(await window.api.updatePrices());
    renderTable(inventory);
    await refreshTotals();

    const suggested = calculateAveragePlatPerDucat(inventory);
    const suggestionEl = document.getElementById("platPerDucatSuggestion");
    if (suggested) {
        suggestionEl.innerHTML = `Your items currently average ~${suggested}. <a href="#" data-action="use-suggested-rate" data-value="${suggested}">Use this</a>`;
    }
}

export function sortBy(column) {
    if (sortColumn === column) {
        setSortAsc(!sortAsc);
    } else {
        setSortColumn(column);
        setSortAsc(true);
    }

    inventory.sort((a, b) => {
        let valA, valB;

        if (column === "total") {
            valA = a.price * a.quantity;
            valB = b.price * b.quantity;
        } else if (column === "vaulted") {
            valA = a.vaulted ? 1 : 0;
            valB = b.vaulted ? 1 : 0;
        } else if (column === "lastUpdated") {
            valA = a.lastUpdated;
            valB = b.lastUpdated;
        } else if (column === "rarity") {
            const rarityRank = { "": -1, Common: 0, Uncommon: 1, Rare: 2 };
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

export async function refreshTotals() {
    const totals = await window.api.getTotals();
    document.getElementById("totalUnique").innerText = totals.uniqueCount;
    document.getElementById("totalPlat").innerText = totals.totalPlat;
}

export function showSuggestions(value) {
    const box = document.getElementById("suggestions");

    if (!value.trim()) {
        hideSuggestions();
        return;
    }

    const v = value.toLowerCase();
    const matches = allItems.filter((i) => i.name.toLowerCase().includes(v)).slice(0, 10);

    if (matches.length === 0) {
        hideSuggestions();
        return;
    }

    box.innerHTML = matches
        .map((m) => {
            const safeName = m.name.replace(/'/g, "\\'");
            const safeSlug = m.slug.replace(/'/g, "\\'");
            return `<div data-action="pick-suggestion" data-name="${safeName}" data-slug="${safeSlug}">${m.name}</div>`;
        })
        .join("");

    box.style.display = "block";
}

export function pickSuggestion(name, slug) {
    document.getElementById("itemName").value = name;
    document.getElementById("itemSlug").value = slug;
    hideSuggestions();
}

export function hideSuggestions() {
    const box = document.getElementById("suggestions");
    box.style.display = "none";
}

export function filterPriceTable(query) {
    const q = query.trim().toLowerCase();
    const filtered = q ? inventory.filter((i) => i.name.toLowerCase().includes(q)) : inventory;
    renderTable(filtered);
}