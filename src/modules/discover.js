import { discoverIndex, setDiscoverIndex, wfcdItems, relicNameList } from "./state.js";
import { showFarmInfo, showRelicRewards } from "./modals.js";

export function buildDiscoverIndex() {
    const warframeWeaponEntries = wfcdItems
        .filter((i) => ["Warframes", "Primary", "Secondary", "Melee", "Sentinels", "Archwing", "Arch-Gun", "Arch-Melee", "Mods"].includes(i.category))
        .map((i) => ({ name: i.name, category: i.category === "Mods" ? "mod" : "item", type: i.type }));
    const relicEntries = relicNameList.map((name) => ({ name, category: "relic", type: null }));
    setDiscoverIndex([...warframeWeaponEntries, ...relicEntries]);
}

export function searchDiscover(query) {
    const q = query.trim().toLowerCase();
    if (!q) { document.getElementById("discoverSearchResults").innerHTML = ""; return; }
    const matches = discoverIndex.filter((i) => i.name.toLowerCase().includes(q)).slice(0, 300);
    renderDiscoverSearchResults(matches);
}

function renderDiscoverSearchResults(matches) {
    const container = document.getElementById("discoverSearchResults");
    if (matches.length === 0) { container.innerHTML = "<p>No matches found.</p>"; return; }
    container.innerHTML = matches.map((m) => {
        const safeName = m.name.replace(/'/g, "\\'");
        return `<div class="item-name" style="padding:8px;" data-action="open-discover-result" data-name="${safeName}" data-category="${m.category}" data-type="${m.type || ""}">${m.name}</div>`;
    }).join("");
}

export async function openDiscoverResult(name, category, type) {
    if (category === "relic") {
        await showRelicRewards(name);
    } else if (category === "mod") {
        await showFarmInfo({ name, set: name, type: "Mod" });
    } else {
        const parts = name.split(" ");
        const set = parts.length > 1 ? parts[0] + " " + parts[1] : parts[0];
        await showFarmInfo({ name, set, type });
    }
}