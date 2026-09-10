// farmLogic.js
// Pure logic functions for farm-data processing — no fs/axios/Electron dependencies,
// so these are directly testable in isolation.

function median(numbers) {
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function chanceToTier(chance) {
    if (chance === undefined || chance === null) return null;
    if (chance <= 15) return "gold";
    if (chance <= 22.665) return "silver";
    return "bronze";
}

function summarizeDrops(drops) {
    const bestByRelic = {};

    for (const drop of drops) {
        const baseRelicName = drop.location
            .replace(/\s*\((Intact|Exceptional|Flawless|Radiant)\)\s*$/i, "")
            .trim();

        if (!bestByRelic[baseRelicName] || drop.chance > bestByRelic[baseRelicName].chance) {
            bestByRelic[baseRelicName] = {
                relic: baseRelicName,
                chance: drop.chance,
                rarity: drop.rarity,
            };
        }
    }

    return Object.values(bestByRelic).sort((a, b) => b.chance - a.chance);
}

function assignRarityTiers(components) {
    return components.map((comp) => {
        const summarized = summarizeDrops(comp.drops || []);
        const medianChance = summarized.length ? median(summarized.map((d) => d.chance)) : null;
        return {
            name: comp.name,
            ducats: comp.ducats,
            tier: chanceToTier(medianChance),
            imageName: comp.imageName || null,
            drops: summarized,
        };
    });
}

function normalizeName(name) {
    return name
        .trim()
        .toLowerCase()
        .replace(/\s+blueprint$/i, "")
        .replace(/\s+/g, " ");
}

function getEndpointForType(itemType) {
    if (itemType.includes("Warframe")) return "warframes";
    if (itemType === "Mod") return "mods";
    const weaponTypes = [
        "Weapon",
        "Rifle",
        "Pistol",
        "Melee",
        "Shotgun",
        "Sentinel",
        "Archwing",
        "Arch-Gun",
        "Arch-Melee",
        "Secondary",
        "Primary",
    ];
    if (weaponTypes.some((t) => itemType.includes(t))) return "weapons";
    return null;
}

module.exports = {
    median,
    chanceToTier,
    summarizeDrops,
    assignRarityTiers,
    normalizeName,
    getEndpointForType,
};