// relicLogic.js
// Pure logic functions for relic naming, image lookup, and sorting —
// no DOM/Electron dependencies, so these are directly testable in isolation.

function normalizeRelicName(input) {
    const parts = input.trim().split(/\s+/);
    if (parts.length < 2) return input.trim();
    const tier = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
    const code = parts[1].toUpperCase();
    return `${tier} ${code}`;
}

function getRelicImageName(relicFullName) {
    const tier = relicFullName.trim().split(" ")[0];
    const tierMap = {
        Lith: "RelicLithD.png",
        Meso: "RelicMesoD.png",
        Neo: "RelicNeoD.png",
        Axi: "RelicAxiD.png",
    };
    return tierMap[tier] || null;
}

const RELIC_TIER_ORDER = ["Lith", "Meso", "Neo", "Axi"];

function sortRelics(relics) {
    return [...relics].sort((a, b) => {
        const [tierA, nameA] = a.name.split(" ");
        const [tierB, nameB] = b.name.split(" ");

        const tierIndexA = RELIC_TIER_ORDER.indexOf(tierA);
        const tierIndexB = RELIC_TIER_ORDER.indexOf(tierB);

        if (tierIndexA !== tierIndexB) return tierIndexA - tierIndexB;
        return nameA.localeCompare(nameB);
    });
}

module.exports = {
    normalizeRelicName,
    getRelicImageName,
    RELIC_TIER_ORDER,
    sortRelics,
};