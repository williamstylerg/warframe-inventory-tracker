// shared.js
// Small, reusable helper functions used across multiple renderer modules.

import { relicInventory, archwingRelatedNames } from "./state.js";

export function normalizeNameClient(name) {
    return name
        .trim()
        .toLowerCase()
        .replace(/\s+blueprint$/i, "")
        .replace(/\s+/g, " ");
}

export function getRowClass(item) {
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

export function getDisplayRarity(item) {
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

export function getDisplayType(item) {
    if (item.name.trim().endsWith(" Set")) {
        return "Set";
    }
    return item.type;
}

export function isTrackableComponent(component, itemCategory) {
    if (itemCategory === "Warframe Part") {
        return ["Blueprint", "Chassis", "Neuroptics", "Systems"].includes(component.name);
    }
    return component.drops && component.drops.length > 0;
}

export function isArchwingRelated(itemName) {
    return archwingRelatedNames.has(itemName.trim().toLowerCase());
}

export function getOwnedRelicQuantity(relicFullName) {
    const key = relicFullName
        .trim()
        .toLowerCase()
        .replace(/\s+relic$/i, "");
    const match = relicInventory.find((r) => r.name.trim().toLowerCase() === key);
    return match ? match.quantity : 0;
}