// relics.js

import { relicInventory, setRelicInventory, relicNameList, setRelicNameList } from "./state.js";
import { normalizeRelicName, getRelicImageName, sortRelics } from "./relicLogic.js";
import { showRelicRewards } from "./modals.js";

export async function refreshRelics() {
    setRelicInventory(await window.api.getRelics());
    renderRelicGrid(relicInventory);
}

export function renderRelicGrid(relics) {
    const container = document.getElementById("relicGrid");
    const sorted = sortRelics(relics);

    if (sorted.length === 0) {
        container.innerHTML = "<p>No relics tracked yet.</p>";
        return;
    }

    let html = "";
    for (const relic of sorted) {
        const safeName = relic.name.replace(/'/g, "\\'");
        const imageUrl = relic.imageName
            ? `https://cdn.warframestat.us/img/${relic.imageName}`
            : null;

        html += `<div class="set-card">`;
        if (imageUrl) {
            html += `<img src="${imageUrl}" class="set-card-image" alt="${relic.name}">`;
        }
        html += `<h3 class="item-name" data-action="show-relic-rewards" data-name="${safeName}">${relic.name}</h3>`;
        html += `<div style="display:flex; align-items:center; gap:8px; margin-bottom:10px;">
            <button data-action="adjust-relic" data-name="${safeName}" data-delta="-1">-</button>
            <span>${relic.quantity}</span>
            <button data-action="adjust-relic" data-name="${safeName}" data-delta="1">+</button>
        </div>`;
        html += `</div>`;
    }

    container.innerHTML = html;
}

export async function adjustRelicQuantity(name, delta) {
    const relic = relicInventory.find((r) => r.name === name);
    const newQuantity = (relic ? relic.quantity : 0) + delta;

    setRelicInventory(await window.api.updateRelicQuantity(name, newQuantity));
    renderRelicGrid(relicInventory);
}

export async function removeRelicHandler(name) {
    setRelicInventory(await window.api.removeRelic(name));
    renderRelicGrid(relicInventory);
}

export async function addRelicHandler() {
    const nameInput = document.getElementById("relicSearchName").value.trim();
    if (!nameInput) return;

    const normalizedName = normalizeRelicName(nameInput);
    const imageName = getRelicImageName(normalizedName);

    setRelicInventory(await window.api.addRelic(normalizedName, imageName));
    renderRelicGrid(relicInventory);

    document.getElementById("relicSearchName").value = "";
}

export async function loadRelicNameList() {
    try {
        const response = await fetch("https://drops.warframestat.us/data/relics.json");
        const data = await response.json();
        const relicsList = data.relics || data;

        const seen = new Set();
        const list = [];
        for (const entry of relicsList) {
            if (!entry.tier || !entry.relicName) continue;
            const fullName = `${entry.tier} ${entry.relicName}`;
            if (!seen.has(fullName)) {
                seen.add(fullName);
                list.push(fullName);
            }
        }
        setRelicNameList(list);
    } catch (err) {
        console.log("Failed to load relic name list:", err.message);
        setRelicNameList([]);
    }
}

let relicSuggestionIndex = -1;
let currentRelicSuggestions = [];

export function showRelicSuggestions(value) {
    const box = document.getElementById("relicSuggestions");
    relicSuggestionIndex = -1;

    if (!value.trim()) {
        box.style.display = "none";
        currentRelicSuggestions = [];
        return;
    }

    const v = value.toLowerCase();
    currentRelicSuggestions = relicNameList
        .filter((name) => name.toLowerCase().includes(v))
        .slice(0, 100);

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
            return `<div style="${highlighted}" data-action="pick-relic-suggestion" data-name="${safeName}">${name}</div>`;
        })
        .join("");
}

export function pickRelicSuggestion(name) {
    document.getElementById("relicSearchName").value = name;
    document.getElementById("relicSuggestions").style.display = "none";
    currentRelicSuggestions = [];
    relicSuggestionIndex = -1;
}

export function handleRelicSearchKeydown(event) {
    if (currentRelicSuggestions.length === 0) {
        if (event.key === "Enter") {
            addRelicHandler();
        }
        return;
    }

    if (event.key === "ArrowDown") {
        event.preventDefault();
        relicSuggestionIndex = Math.min(
            relicSuggestionIndex + 1,
            currentRelicSuggestions.length - 1,
        );
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

export function filterRelicGrid(query) {
    const q = query.trim().toLowerCase();
    const filtered = q
        ? relicInventory.filter((r) => r.name.toLowerCase().includes(q))
        : relicInventory;
    renderRelicGrid(filtered);
}