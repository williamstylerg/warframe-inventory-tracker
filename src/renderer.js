// src/renderer.js
import {
    inventory, setInventory, buildTracker, setBuildTracker,
    setAllItems, setWfcdItems, setArchwingRelatedNames, setRelicNameList,
} from "./modules/state.js";
import * as priceTracker from "./modules/priceTracker.js";
import * as buildTrackerMod from "./modules/buildTracker.js";
import * as relics from "./modules/relics.js";
import * as recommendations from "./modules/recommendations.js";
import * as discover from "./modules/discover.js";
import * as modals from "./modules/modals.js";
import * as settings from "./modules/settings.js";
import * as portfolio from "./modules/portfolio.js";

Object.assign(window, {
    ...priceTracker, ...buildTrackerMod, ...relics, ...recommendations,
    ...discover, ...modals, ...settings, ...portfolio, switchView,
});

function switchView(viewName) {
    document.querySelectorAll(".view").forEach((el) => (el.style.display = "none"));
    document.getElementById("view-" + viewName).style.display = "block";
    document.querySelectorAll(".nav-btn").forEach((btn) => btn.classList.remove("active"));
    const targetBtn = document.querySelector(`.nav-btn[data-view="${viewName}"]`);
    if (targetBtn) targetBtn.classList.add("active");
    if (viewName === "portfolio") portfolio.renderPortfolioChart();
    if (viewName === "discover") discover.buildDiscoverIndex();
}
window.switchView = switchView;

document.addEventListener("click", async (event) => {
    const target = event.target.closest("[data-action]");
    if (!target) return;
    const a = target.dataset;
    switch (a.action) {
        case "show-farm-info": await modals.showFarmInfo(JSON.parse(target.getAttribute("data-item"))); break;
        case "show-farm-info-obj": await modals.showFarmInfo({ name: a.name, set: a.set, type: a.type }); break;
        case "show-price-history": await modals.showPriceHistory(a.slug, a.name); break;
        case "delete-item": await priceTracker.deleteItem(a.slug); break;
        case "sort": priceTracker.sortBy(a.column); break;
        case "pick-suggestion": priceTracker.pickSuggestion(a.name, a.slug); break;
        case "use-suggested-rate": event.preventDefault(); await priceTracker.updatePlatPerDucat(a.value); break;
        case "adjust-relic": await relics.adjustRelicQuantity(a.name, Number(a.delta)); break;
        case "show-relic-rewards": await modals.showRelicRewards(a.name); break;
        case "pick-relic-suggestion": relics.pickRelicSuggestion(a.name); break;
        case "pick-build-tracker-suggestion": buildTrackerMod.pickBuildTrackerSuggestion(a.name, a.type, a.category); break;
        case "combine-set": await buildTrackerMod.combineSetFromPanel(a.set); break;
        case "crafted-remove": await buildTrackerMod.craftedRemove(a.set); break;
        case "remove-tracked-set": await buildTrackerMod.removeItemFromBuildTracker(a.set); break;
        case "track-discovered-set": await recommendations.trackDiscoveredSet(a.set, a.type); break;
        case "open-discover-result": await discover.openDiscoverResult(a.name, a.category, a.type); break;
    }
});

document.addEventListener("change", async (event) => {
    const target = event.target.closest("[data-action]");
    if (!target) return;
    const a = target.dataset;
    if (a.action === "update-quantity") {
        await priceTracker.updateQuantity(a.slug, target.value);
    } else if (a.action === "toggle-component") {
        target.blur();
        const isPrime = a.prime === "true";
        if (target.checked) await buildTrackerMod.checkOffComponent(a.set, a.part, isPrime, a.category);
        else await buildTrackerMod.uncheckOffComponent(a.set, a.part, isPrime);
    }
});

document.addEventListener("input", (event) => {
    if (event.target.id === "itemName") priceTracker.showSuggestions(event.target.value);
    if (event.target.id === "priceSearchInput") priceTracker.filterPriceTable(event.target.value);
    if (event.target.id === "buildTrackerName") buildTrackerMod.showBuildTrackerSuggestions(event.target.value);
    if (event.target.id === "buildTrackerSearchInput") buildTrackerMod.filterBuildTracker(event.target.value);
    if (event.target.id === "relicSearchName") relics.showRelicSuggestions(event.target.value);
    if (event.target.id === "relicSearchFilterInput") relics.filterRelicGrid(event.target.value);
    if (event.target.id === "discoverSearchInput") discover.searchDiscover(event.target.value);
});

document.getElementById("relicSearchName").addEventListener("keydown", relics.handleRelicSearchKeydown);

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        document.getElementById("settingsPanel").style.display = "none";
        document.getElementById("relicRewardsModal").style.display = "none";
        document.getElementById("farmModal").style.display = "none";
        document.getElementById("priceHistoryModal").style.display = "none";
    }
});

document.getElementById("farmModal").addEventListener("click", (e) => { if (e.target.id === "farmModal") modals.closeFarmModal(); });
document.getElementById("relicRewardsModal").addEventListener("click", (e) => { if (e.target.id === "relicRewardsModal") modals.closeRelicRewardsModal(); });
document.getElementById("priceHistoryModal").addEventListener("click", (e) => { if (e.target.id === "priceHistoryModal") modals.closePriceHistoryModal(); });
document.getElementById("settingsPanel").addEventListener("click", (e) => { if (e.target.id === "settingsPanel") settings.toggleSettingsPanel(); });

async function loadItemList() {
    try {
        const response = await fetch("https://api.warframe.market/v2/items");
        const json = await response.json();
        setAllItems(json.data.map((i) => ({ name: i.i18n.en.name, slug: i.slug })));
    } catch (err) { console.log("Failed to load item list:", err.message); setAllItems([]); }
}

async function loadWfcdItemList() {
    try {
        const response = await fetch("https://api.warframestat.us/items?only=name,type,category");
        const json = await response.json();
        setWfcdItems(json.map((i) => ({ name: i.name, type: i.type, category: i.category })));
    } catch (err) { console.log("Failed to load WFCD item list:", err.message); setWfcdItems([]); }
}

async function loadArchwingRelatedNames() {
    try {
        const response = await fetch("https://api.warframestat.us/items?only=name,type");
        const items = await response.json();
        setArchwingRelatedNames(new Set(items.filter((i) => i.type && i.type.includes("Arch")).map((i) => i.name.trim().toLowerCase())));
    } catch (err) { console.log("Failed to load archwing-related names:", err.message); setArchwingRelatedNames(new Set()); }
}

document.addEventListener("DOMContentLoaded", async () => {
    const version = await window.api.getAppVersion();
    document.getElementById("appVersionDisplay").textContent = `v${version}`;
    await settings.loadAppSettings();

    loadItemList();
    loadWfcdItemList();
    loadArchwingRelatedNames();
    relics.loadRelicNameList();

    setInventory(await window.api.getInventory());
    priceTracker.renderTable(inventory);
    await priceTracker.refreshTotals();

    const tracker = await window.api.getBuildTracker();
    await buildTrackerMod.renderBuildTracker(tracker);

    await relics.refreshRelics();
});