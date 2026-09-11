const { normalizeName } = require("../../farmLogic");
const { loadRelicInventory, fetchRelicDropData } = require("../stores/relicStore");
const { loadBuildTracker } = require("../stores/buildTrackerStore");
const { loadInventory } = require("../stores/inventoryStore");
const { fetchFarmData, isTrackableComponentServer } = require("./farmDataService");

async function getRelicRecommendations() {
    const relics = loadRelicInventory();
    const buildTracker = loadBuildTracker();
    const inventory = loadInventory();
    const recommendations = [];

    for (const relic of relics) {
        if (relic.quantity <= 0) continue;

        const dropData = await fetchRelicDropData(relic.name);
        if (!dropData) continue;

        for (const trackedSet of buildTracker) {
            const components = await fetchFarmData(trackedSet.name, trackedSet.type);
            const requiredParts = components.filter((c) =>
                isTrackableComponentServer(c, trackedSet.type),
            );

            for (const part of requiredParts) {
                const isPrime = part.ducats !== undefined;
                const fullPartName = `${trackedSet.name} ${part.name}`;

                const owned = isPrime
                    ? inventory.some(
                          (i) =>
                              normalizeName(i.name) === normalizeName(fullPartName) &&
                              i.quantity > 0,
                      )
                    : (trackedSet.obtainedParts || []).includes(part.name);

                if (owned) continue;

                const states = ["Intact", "Exceptional", "Flawless", "Radiant"];
                for (const state of states) {
                    const rewards = dropData.rewards[state] || [];
                    const match = rewards.find((r) => {
                        const normalized = r.itemName
                            .trim()
                            .toLowerCase()
                            .replace(/\s+blueprint$/i, "");
                        return normalized === fullPartName.trim().toLowerCase();
                    });

                    if (match) {
                        recommendations.push({
                            relicName: relic.name,
                            relicQuantity: relic.quantity,
                            targetItem: fullPartName,
                            targetSet: trackedSet.name,
                            minRefinement: state,
                            chance: match.chance,
                        });
                        break;
                    }
                }
            }
        }
    }

    return recommendations;
}

module.exports = { getRelicRecommendations };