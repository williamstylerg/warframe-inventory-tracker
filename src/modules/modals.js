// modals.js
// Farm-info and relic-rewards modal rendering and control.

let priceHistoryChartInstance = null;
let volumeChartInstance = null;

import { isTrackableComponent, getOwnedRelicQuantity } from "./shared.js";

export async function showFarmInfo(item) {
    const lookupName = item.type === "Mod" ? item.name : item.set;
    const components = await window.api.getFarmInfo(lookupName, item.type);
    renderFarmModal(lookupName, components, item.type);
}

export function renderFarmModal(setName, components, itemType) {
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
        const ownedTag =
            owned > 0
                ? `<div style="margin-left:16px; color:#4dd9ec; font-weight:bold; font-size:0.85em;">${owned} owned</div>`
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
        const trackableComponents = components.filter((c) => isTrackableComponent(c, itemType));

        if (trackableComponents.length === 0) {
            html += `<p>No farmable components found for ${setName}. It may be purchased directly, or built from resources without a relic source or blueprint drops.</p>`;
        } else {
            html += `<div class="farm-component-grid">`;
            for (const comp of trackableComponents) {
                const imageUrl = comp.imageName
                    ? `https://cdn.warframestat.us/img/${comp.imageName}`
                    : null;

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
    }

    body.innerHTML = html;
    modal.style.display = "block";
}

export function closeFarmModal() {
    document.getElementById("farmModal").style.display = "none";
}

export async function showRelicRewards(relicName) {
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

export function closeRelicRewardsModal() {
    document.getElementById("relicRewardsModal").style.display = "none";
}

export async function showPriceHistory(slug, itemName) {
    const history = await window.api.getPriceHistory(slug);

    document.getElementById("priceHistoryTitle").textContent = `${itemName} — 90 Day Price History`;

    if (!history || history.length === 0) {
        document.getElementById("priceHistoryModal").style.display = "block";
        return;
    }

    const labels = history.map((d) => new Date(d.date).toLocaleDateString());
    const movingAvgData = history.map((d) => d.movingAvg);
    const medianData = history.map((d) => d.median);
    const volumeData = history.map((d) => d.volume);

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
                    borderWidth: 2,
                },
                {
                    label: "Median (Plat)",
                    data: medianData,
                    borderColor: "#888",
                    backgroundColor: "#888",
                    tension: 0.2,
                    pointRadius: 0,
                    borderWidth: 1,
                    borderDash: [3, 3],
                },
            ],
        },
        options: {
            responsive: false,
            interaction: { mode: "index", intersect: false },
            scales: {
                y: {
                    title: { display: true, text: "Platinum", color: "#eee" },
                    ticks: { color: "#eee" },
                    grid: { color: "#333" },
                },
                x: {
                    ticks: { display: false },
                    grid: { color: "#222" },
                },
            },
            plugins: {
                legend: { labels: { color: "#eee" } },
            },
        },
    });

    const rawMax = Math.max(...volumeData) * 1.15;
    const volumeMax = Math.ceil(rawMax / 50) * 50;

    volumeChartInstance = new Chart(volumeCtx, {
        type: "bar",
        data: {
            labels: labels,
            datasets: [
                {
                    label: "Volume",
                    data: volumeData,
                    backgroundColor: "rgba(237, 160, 46, 0.6)",
                },
            ],
        },
        options: {
            responsive: false,
            scales: {
                y: {
                    title: { display: true, text: "Volume", color: "#eee" },
                    ticks: { color: "#eee", stepSize: 50 },
                    grid: { color: "#333" },
                    max: volumeMax,
                },
                x: {
                    ticks: { color: "#eee", maxTicksLimit: 12 },
                    grid: { color: "#222" },
                },
            },
            plugins: {
                legend: { display: false },
            },
        },
    });

    document.getElementById("priceHistoryModal").style.display = "block";
}

export function closePriceHistoryModal() {
    document.getElementById("priceHistoryModal").style.display = "none";
}
