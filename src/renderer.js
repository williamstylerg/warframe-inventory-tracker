// src/renderer.js
import {
    inventory,
    setInventory,
    setAllItems,
    setWfcdItems,
    setArchwingRelatedNames,
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
    ...priceTracker,
    ...buildTrackerMod,
    ...relics,
    ...recommendations,
    ...discover,
    ...modals,
    ...settings,
    ...portfolio,
    switchView,
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
        case "show-farm-info":
            await modals.showFarmInfo(JSON.parse(target.getAttribute("data-item")));
            break;
        case "show-farm-info-obj":
            await modals.showFarmInfo({ name: a.name, set: a.set, type: a.type });
            break;
        case "show-price-history":
            await modals.showPriceHistory(a.slug, a.name);
            break;
        case "delete-item":
            await priceTracker.deleteItem(a.slug);
            break;
        case "sort":
            priceTracker.sortBy(a.column);
            break;
        case "pick-suggestion":
            priceTracker.pickSuggestion(a.name, a.slug);
            break;
        case "use-suggested-rate":
            event.preventDefault();
            await priceTracker.updatePlatPerDucat(a.value);
            break;
        case "adjust-relic":
            await relics.adjustRelicQuantity(a.name, Number(a.delta));
            break;
        case "show-relic-rewards":
            await modals.showRelicRewards(a.name);
            break;
        case "pick-relic-suggestion":
            relics.pickRelicSuggestion(a.name);
            break;
        case "pick-build-tracker-suggestion":
            buildTrackerMod.pickBuildTrackerSuggestion(a.name, a.type, a.category);
            break;
        case "combine-set":
            await buildTrackerMod.combineSetFromPanel(a.set);
            break;
        case "crafted-remove":
            await buildTrackerMod.craftedRemove(a.set);
            break;
        case "remove-tracked-set":
            await buildTrackerMod.removeItemFromBuildTracker(a.set);
            break;
        case "track-discovered-set":
            await recommendations.trackDiscoveredSet(a.set, a.type);
            break;
        case "open-discover-result":
            await discover.openDiscoverResult(a.name, a.category, a.type);
            break;
    }
});

document.addEventListener("click", (event) => {
    const menu = document.getElementById("buildTrackerFilterMenu");
    const toggleBtn = document.getElementById("buildTrackerFilterToggle");

    if (
        menu.style.display === "block" &&
        !menu.contains(event.target) &&
        event.target !== toggleBtn
    ) {
        menu.style.display = "none";
    }
});

document.addEventListener("change", async (event) => {
    const target = event.target.closest("[data-action]");
    if (target) {
        const a = target.dataset;
        if (a.action === "update-quantity") {
            await priceTracker.updateQuantity(a.slug, target.value);
        } else if (a.action === "toggle-component") {
            target.blur();
            const isPrime = a.prime === "true";
            if (target.checked)
                await buildTrackerMod.checkOffComponent(a.set, a.part, isPrime, a.category);
            else await buildTrackerMod.uncheckOffComponent(a.set, a.part, isPrime);
        }
    }

    if (event.target.id === "platPerDucatInput") {
        await priceTracker.updatePlatPerDucat(event.target.value);
    }
});

document.addEventListener("input", (event) => {
    if (event.target.id === "itemName") priceTracker.showSuggestions(event.target.value);
    if (event.target.id === "priceSearchInput") priceTracker.filterPriceTable(event.target.value);
    if (event.target.id === "buildTrackerName")
        buildTrackerMod.showBuildTrackerSuggestions(event.target.value);
    if (event.target.id === "buildTrackerSearchInput")
        buildTrackerMod.filterBuildTracker(event.target.value);
    if (event.target.id === "relicSearchName") relics.showRelicSuggestions(event.target.value);
    if (event.target.id === "relicSearchFilterInput") relics.filterRelicGrid(event.target.value);
    if (event.target.id === "discoverSearchInput") discover.searchDiscover(event.target.value);
});

document
    .getElementById("relicSearchName")
    .addEventListener("keydown", relics.handleRelicSearchKeydown);

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        document.getElementById("settingsPanel").style.display = "none";
        document.getElementById("relicRewardsModal").style.display = "none";
        document.getElementById("farmModal").style.display = "none";
        document.getElementById("priceHistoryModal").style.display = "none";
    }
});

document.getElementById("farmModal").addEventListener("click", (e) => {
    if (e.target.id === "farmModal") modals.closeFarmModal();
});
document.getElementById("relicRewardsModal").addEventListener("click", (e) => {
    if (e.target.id === "relicRewardsModal") modals.closeRelicRewardsModal();
});
document.getElementById("priceHistoryModal").addEventListener("click", (e) => {
    if (e.target.id === "priceHistoryModal") modals.closePriceHistoryModal();
});
document.getElementById("settingsPanel").addEventListener("click", (e) => {
    if (e.target.id === "settingsPanel") settings.toggleSettingsPanel();
});

async function loadItemList() {
    try {
        const response = await fetch("https://api.warframe.market/v2/items");
        const json = await response.json();
        setAllItems(json.data.map((i) => ({ name: i.i18n.en.name, slug: i.slug })));
    } catch (err) {
        console.log("Failed to load item list:", err.message);
        setAllItems([]);
    }
}

async function loadWfcdItemList() {
    try {
        const response = await fetch("https://api.warframestat.us/items?only=name,type,category");
        const json = await response.json();
        setWfcdItems(json.map((i) => ({ name: i.name, type: i.type, category: i.category })));
    } catch (err) {
        console.log("Failed to load WFCD item list:", err.message);
        setWfcdItems([]);
    }
}

async function loadArchwingRelatedNames() {
    try {
        const response = await fetch("https://api.warframestat.us/items?only=name,type");
        const items = await response.json();
        setArchwingRelatedNames(
            new Set(
                items
                    .filter((i) => i.type && i.type.includes("Arch"))
                    .map((i) => i.name.trim().toLowerCase()),
            ),
        );
    } catch (err) {
        console.log("Failed to load archwing-related names:", err.message);
        setArchwingRelatedNames(new Set());
    }
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


///// TEST FOR OCR
async function ocrListSources() {
    const sources = await window.api.getScreenSources();
    console.log("Available sources:");
    sources.forEach((s, i) => console.log(`${i}: ${s.name}`));
    window._ocrSources = sources; // stash for the next step
}

async function ocrSaveChoice(playMode, index) {
    const selected = window._ocrSources[index];
    if (!selected) {
        console.log("Invalid selection.");
        return;
    }

    await window.api.updateAppSettings({
        playMode,
        captureSourceName: selected.name,
    });

    console.log("Saved:", { playMode, captureSourceName: selected.name });
}

window.ocrListSources = ocrListSources;
window.ocrSaveChoice = ocrSaveChoice;

function findWarframeSource(sources) {
    const excludePatterns = [
        "warframe inventory tracker",
        " - opera",
        " - chrome",
        " - firefox",
        " - edge",
        " - visual studio code",
        " - notepad",
        ".js",
        ".json",
        ".html",
    ];

    return sources.filter((s) => {
        const name = s.name.toLowerCase();
        const isExcluded = excludePatterns.some((pattern) => name.includes(pattern));
        return name.includes("warframe") && !isExcluded;
    });
}

async function ocrAutoDetect() {
    const sources = await window.api.getScreenSources();
    const matches = findWarframeSource(sources);

    if (matches.length === 1) {
        const selected = matches[0];
        await window.api.updateAppSettings({
            playMode: "auto-detected",
            captureSourceName: selected.name,
        });
        console.log("Auto-detected and saved:", selected.name);
        return selected;
    } else if (matches.length === 0) {
        console.log("No Warframe window found. Is the game running?");
        return null;
    } else {
        console.log("Multiple possible matches, manual selection needed:");
        matches.forEach((s, i) => console.log(`${i}: ${s.name}`));
        return null;
    }
}

window.ocrAutoDetect = ocrAutoDetect;

// ============================================================
// TEMPORARY OCR EXPLORATION TEST CODE — remove before real feature work
// ============================================================

window._testResults = [];

async function runFullRewardTest() {
    const startTime = Date.now();
    const timestamp = new Date().toLocaleTimeString();

    const settings = await window.api.getAppSettings();
    const sources = await window.api.getScreenSources();
    const match = sources.find((s) => s.name === settings.captureSourceName);
    const capture = await captureViaStream(match.id);
    window._lastCapture = capture;

    const regions = [
        { x: 639, y: 555, width: 314, height: 58 },
        { x: 960, y: 557, width: 312, height: 53 },
        { x: 1284, y: 537, width: 311, height: 71 },
        { x: 1609, y: 550, width: 304, height: 56 },
    ];

    const ocrResults = await Promise.all(
        regions.map(async (r) => {
            const img = new Image();
            img.src = capture;
            await new Promise((resolve) => (img.onload = resolve));

            const canvas = document.createElement("canvas");
            canvas.width = r.width;
            canvas.height = r.height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, r.x, r.y, r.width, r.height, 0, 0, r.width, r.height);

            const imageData = ctx.getImageData(0, 0, r.width, r.height);
            const data = imageData.data;
            const contrast = 80;
            const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
            for (let i = 0; i < data.length; i += 4) {
                const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
                const adjusted = factor * (gray - 128) + 128;
                const clamped = Math.max(0, Math.min(255, adjusted));
                data[i] = data[i + 1] = data[i + 2] = clamped;
            }
            ctx.putImageData(imageData, 0, 0);

            const croppedDataUrl = canvas.toDataURL();
            return await window.api.ocrTestRead(croppedDataUrl);
        }),
    );

    if (!window._cachedItemList) {
        const res = await fetch("https://api.warframe.market/v2/items");
        const json = await res.json();
        window._cachedItemList = json.data.map((i) => ({ name: i.i18n.en.name, slug: i.slug }));
    }
    const itemList = window._cachedItemList;

    const identified = ocrResults.map((text) => {
        const normalized = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
        return itemList.find((item) => {
            const itemName = item.name.toLowerCase();
            return itemName.length >= 6 && normalized.includes(itemName);
        });
    });

    const priceResults = await Promise.all(
        identified.map(async (item) => {
            if (!item) return null;
            try {
                const res = await fetch(
                    `https://api.warframe.market/v2/orders/item/${item.slug}/top`,
                    {
                        headers: {
                            "User-Agent": "Mozilla/5.0",
                            Accept: "application/json",
                            Platform: "pc",
                            Language: "en",
                            Crossplay: "true",
                        },
                    },
                );
                const data = await res.json();
                const sellOrders = (data.data?.sell || [])
                    .filter((o) => o.visible)
                    .sort((a, b) => a.platinum - b.platinum);
                return { name: item.name, price: sellOrders[0]?.platinum ?? "N/A" };
            } catch {
                return { name: item.name, price: "N/A" };
            }
        }),
    );

    const elapsed = Date.now() - startTime;

    const runRecord = {
        timestamp,
        elapsed,
        ocrResults,
        identified: identified.map((i) => i?.name || null),
        priceResults,
        capture,
    };
    window._testResults.push(runRecord);

    console.log(`[${timestamp}] Run #${window._testResults.length} — ${elapsed}ms`, runRecord);

    const popup = document.createElement("div");
    popup.style.cssText =
        "position:fixed; top:100px; left:100px; background:#222; border:2px solid #4dd9ec; border-radius:8px; padding:20px; z-index:999999; color:#eee; font-family:sans-serif;";
    popup.innerHTML =
        `<h2>Reward Prices (${elapsed}ms) — Run #${window._testResults.length}</h2>` +
        priceResults
            .map((r) => (r ? `<p><strong>${r.name}</strong>: ${r.price} plat</p>` : `<p>Unidentified</p>`))
            .join("") +
        `<button id="closeTestPopup" style="margin-top:10px;">Close</button>`;
    document.body.appendChild(popup);
    document.getElementById("closeTestPopup").onclick = () => popup.remove();
}

async function captureViaStream(sourceId) {
    const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
            mandatory: {
                chromeMediaSource: "desktop",
                chromeMediaSourceId: sourceId,
            },
        },
    });

    const video = document.createElement("video");
    video.srcObject = stream;
    await video.play();
    await new Promise((resolve) => setTimeout(resolve, 100));

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    stream.getTracks().forEach((track) => track.stop());

    return canvas.toDataURL();
}

document.addEventListener("DOMContentLoaded", () => {
    const triggerBtn = document.createElement("button");
    triggerBtn.textContent = "📸 Capture Reward";
    triggerBtn.style.cssText =
        "position:fixed; bottom:20px; right:20px; z-index:999998; padding:12px 20px; background:#4dd9ec; color:#111; font-weight:bold; border:none; border-radius:8px; cursor:pointer; font-size:14px;";
    triggerBtn.onclick = () => runFullRewardTest();
    document.body.appendChild(triggerBtn);
});

// ============================================================
// END TEMPORARY OCR EXPLORATION TEST CODE
// ============================================================