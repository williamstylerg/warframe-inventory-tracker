import {
    buildTracker, relicInventory, wfcdItems,
    recommendationGroupMode, setRecommendationGroupMode, currentRecommendations, setCurrentRecommendations,
    lastDiscoveryResults, setLastDiscoveryResults, discoverFilter, setDiscoverFilterState,
    discoverHasRun, setDiscoverHasRun,
} from "./state.js";
import { isTrackableComponent } from "./shared.js";

export async function loadRecommendations() {
    document.getElementById("recommendationsNavBtn").style.display = "block";
    window.switchView("recommendations");
    document.getElementById("recommendationList").innerHTML = `<p><span class="spinner"></span>Loading recommendations...</p>`;
    const recommendations = await window.api.getRelicRecommendations();
    await renderRecommendations(recommendations);
}

export function toggleRecommendationGrouping() {
    setRecommendationGroupMode(recommendationGroupMode === "target" ? "relic" : "target");
    renderRecommendations(currentRecommendations);
}

export async function renderRecommendations(recommendations) {
    setCurrentRecommendations(recommendations);
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
            const trackedEntry = buildTracker.find((t) => t.name === setName);
            const setType = trackedEntry ? trackedEntry.type : "Warframe Part";
            const imageName = await window.api.getItemImage(setName, setType);
            const imageUrl = imageName ? `https://cdn.warframestat.us/img/${imageName}` : null;
            html += `<div class="recommendation-set-group" style="display:flex; justify-content:space-between; align-items:flex-start; gap:16px;"><div style="flex-grow:1;"><h2>${setName}</h2>`;
            for (const itemName in bySet[setName]) {
                html += `<h3>${itemName}</h3><ul>`;
                for (const rec of bySet[setName][itemName]) {
                    html += `<li>${rec.relicName} (${rec.relicQuantity} owned) — ${rec.chance}% at ${rec.minRefinement}</li>`;
                }
                html += `</ul>`;
            }
            html += `</div>`;
            if (imageUrl) html += `<img src="${imageUrl}" style="width:160px; height:160px; object-fit:contain; background:#111; border-radius:6px; flex-shrink:0;" alt="${setName}">`;
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
            html += `<div class="recommendation-set-group"><h3>${key} (${quantity} owned)</h3><ul>`;
            for (const rec of grouped[key]) html += `<li>${rec.targetItem} (${rec.targetSet}) — ${rec.chance}% at ${rec.minRefinement}</li>`;
            html += `</ul></div>`;
        }
    }
    container.innerHTML = html;
}

export function setRecommendationTab(tab) {
    document.getElementById("recommendationTabGaps").style.display = tab === "gaps" ? "block" : "none";
    document.getElementById("recommendationTabDiscover").style.display = tab === "discover" ? "block" : "none";
    if (tab === "discover" && !discoverHasRun) {
        setDiscoverHasRun(true);
        runDiscoverNewSets();
    }
}

async function buildRelicRewardMap() {
    const map = new Set();
    for (const relic of relicInventory) {
        if (relic.quantity <= 0) continue;
        const dropData = await window.api.getRelicDropData(relic.name);
        if (!dropData) continue;
        for (const state of ["Intact", "Exceptional", "Flawless", "Radiant"]) {
            const rewards = dropData.rewards[state] || [];
            for (const reward of rewards) {
                map.add(reward.itemName.trim().toLowerCase().replace(/\s+blueprint$/i, ""));
            }
        }
    }
    return map;
}

function getAllPrimeSetNames() {
    const relevantCategories = ["Warframes", "Primary", "Secondary", "Melee", "Sentinels", "Archwing", "Arch-Gun", "Arch-Melee"];
    return wfcdItems.filter((i) => i.name.includes("Prime") && relevantCategories.includes(i.category));
}

async function discoverNewSets() {
    const allSets = getAllPrimeSetNames();
    const trackedNames = new Set(buildTracker.map((t) => t.name.trim().toLowerCase()));
    const relicRewardMap = await buildRelicRewardMap();
    const discoveries = [];
    for (const set of allSets) {
        if (trackedNames.has(set.name.trim().toLowerCase())) continue;
        const components = await window.api.getFarmInfo(set.name, set.type);
        const requiredParts = components.filter((c) => isTrackableComponent(c, set.type));
        if (requiredParts.length === 0) continue;
        let matchedCount = 0;
        const matchedParts = [];
        for (const part of requiredParts) {
            const fullPartName = `${set.name} ${part.name}`.trim().toLowerCase().replace(/\s+blueprint$/i, "");
            if (relicRewardMap.has(fullPartName)) { matchedCount++; matchedParts.push(part.name); }
        }
        if (matchedCount / requiredParts.length >= 0.75) {
            discoveries.push({ setName: set.name, setType: set.type, matchedCount, totalRequired: requiredParts.length, matchedParts });
        }
    }
    return discoveries;
}

export async function runDiscoverNewSets() {
    document.getElementById("discoverList").innerHTML = `<p><span class="spinner"></span>Scanning your relics against every Prime set... this may take a moment the first time.</p>`;
    setLastDiscoveryResults(await discoverNewSets());
    await renderDiscoverResults(lastDiscoveryResults);
}

export async function trackDiscoveredSet(setName, setType) {
    const { renderBuildTracker } = await import("./buildTracker.js");
    const { showAlert } = await import("./settings.js");
    await window.api.addToBuildTracker({ name: setName, type: setType });
    setLastDiscoveryResults(lastDiscoveryResults.filter((d) => d.setName !== setName));
    await renderDiscoverResults(lastDiscoveryResults);
    const tracker = await window.api.getBuildTracker();
    await renderBuildTracker(tracker);
    await showAlert(`${setName} added to your Build Tracker.`);
}

export function setDiscoverFilter(filter) {
    setDiscoverFilterState(filter);
    renderDiscoverResults(lastDiscoveryResults);
}

export async function renderDiscoverResults(discoveries) {
    const container = document.getElementById("discoverList");
    if (discoveries.length === 0) { container.innerHTML = "<p>No new completable sets found based on your current relics.</p>"; return; }
    const filtered = discoveries.filter((d) => {
        if (discoverFilter === "all") return true;
        if (discoverFilter === "warframe") return d.setType.includes("Warframe");
        if (discoverFilter === "weapon") return !d.setType.includes("Warframe");
        return true;
    });
    filtered.sort((a, b) => b.matchedCount / b.totalRequired - a.matchedCount / a.totalRequired);
    let html = "";
    for (const d of filtered) {
        const safeSetName = d.setName.replace(/'/g, "\\'");
        const imageName = await window.api.getItemImage(d.setName, d.setType);
        const imageUrl = imageName ? `https://cdn.warframestat.us/img/${imageName}` : null;
        html += `<div class="set-card">`;
        if (imageUrl) html += `<img src="${imageUrl}" class="set-card-image" style="height:100px;" alt="${d.setName}">`;
        html += `<h3 class="item-name" data-action="show-farm-info-obj" data-name="${safeSetName}" data-set="${safeSetName}" data-type="${d.setType}">${d.setName}</h3>
            <p>${d.matchedCount} / ${d.totalRequired} components possible from your relics</p>
            <p style="font-size:0.85em; color:#aaa;">${d.matchedParts.join(", ")}</p>
            <button data-action="track-discovered-set" data-set="${safeSetName}" data-type="${d.setType}">Track this Set</button>
        </div>`;
    }
    container.innerHTML = `<div class="build-tracker-grid">${html}</div>`;
}