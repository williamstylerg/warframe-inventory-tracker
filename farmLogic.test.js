const {
    median,
    chanceToTier,
    summarizeDrops,
    assignRarityTiers,
    normalizeName,
    getEndpointForType,
} = require("./farmLogic");

describe("median", () => {
    test("returns the middle value for an odd-length array", () => {
        expect(median([10, 20, 25.33])).toBe(20);
    });

    test("averages the two middle values for an even-length array", () => {
        expect(median([10, 20])).toBe(15);
    });

    test("handles a single value", () => {
        expect(median([25.33])).toBe(25.33);
    });
});

describe("chanceToTier", () => {
    test("classifies 10% as gold", () => {
        expect(chanceToTier(10)).toBe("gold");
    });

    test("classifies 20% as silver", () => {
        expect(chanceToTier(20)).toBe("silver");
    });

    test("classifies 25.33% as bronze", () => {
        expect(chanceToTier(25.33)).toBe("bronze");
    });

    test("rounds an ambiguous median toward the rarer tier (gold/silver boundary)", () => {
        expect(chanceToTier(15)).toBe("gold");
        expect(chanceToTier(15.01)).toBe("silver");
    });

    test("returns null for missing input", () => {
        expect(chanceToTier(undefined)).toBeNull();
        expect(chanceToTier(null)).toBeNull();
    });
});

describe("summarizeDrops", () => {
    test("collapses refinement-tier duplicates to the best chance per relic", () => {
        const raw = [
            { location: "Axi K12 Relic", chance: 20, rarity: "Uncommon" },
            { location: "Axi K12 Relic (Exceptional)", chance: 23.33, rarity: "Uncommon" },
            { location: "Axi K12 Relic (Radiant)", chance: 25.33, rarity: "Uncommon" },
        ];
        const result = summarizeDrops(raw);
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({ relic: "Axi K12 Relic", chance: 25.33, rarity: "Uncommon" });
    });

    test("sorts multiple relics by chance descending", () => {
        const raw = [
            { location: "Lith A1 Relic", chance: 10, rarity: "Rare" },
            { location: "Meso B2 Relic", chance: 25.33, rarity: "Uncommon" },
        ];
        const result = summarizeDrops(raw);
        expect(result[0].relic).toBe("Meso B2 Relic");
        expect(result[1].relic).toBe("Lith A1 Relic");
    });

    test("returns an empty array for no drops", () => {
        expect(summarizeDrops([])).toEqual([]);
    });
});

describe("assignRarityTiers", () => {
    test("correctly tiers Burston Prime Barrel (regression test for the median-on-raw-data bug)", () => {
        // Historical bug: computing median on raw, duplicated per-refinement drops
        // misclassified this as gold instead of silver. This test locks in the fix:
        // summarizeDrops must run first, so the median is computed on real, deduped rates.
        const rawDrops = [];
        for (let i = 0; i < 32; i++) rawDrops.push({ location: `RelicA (Intact)`, chance: 11, rarity: "Uncommon" });
        for (let i = 0; i < 32; i++) rawDrops.push({ location: `RelicA (Exceptional)`, chance: 13, rarity: "Uncommon" });
        for (let i = 0; i < 32; i++) rawDrops.push({ location: `RelicA (Flawless)`, chance: 17, rarity: "Uncommon" });
        for (let i = 0; i < 32; i++) rawDrops.push({ location: `RelicA (Radiant)`, chance: 20, rarity: "Uncommon" });

        const result = assignRarityTiers([{ name: "Barrel", ducats: 15, drops: rawDrops }]);
        expect(result[0].tier).toBe("silver");
    });

    test("component with no drops gets a null tier", () => {
        const result = assignRarityTiers([{ name: "Orokin Cell", drops: [] }]);
        expect(result[0].tier).toBeNull();
    });
});

describe("normalizeName", () => {
    test("strips trailing 'Blueprint' case-insensitively", () => {
        expect(normalizeName("Ash Prime Neuroptics Blueprint")).toBe("ash prime neuroptics");
        expect(normalizeName("Ash Prime Neuroptics BLUEPRINT")).toBe("ash prime neuroptics");
    });

    test("collapses multiple spaces", () => {
        expect(normalizeName("Ash  Prime   Neuroptics")).toBe("ash prime neuroptics");
    });

    test("does not strip 'blueprint' from the middle of a name", () => {
        expect(normalizeName("Blueprint Something")).toBe("blueprint something");
    });
});

describe("getEndpointForType", () => {
    test("routes Warframe-related types correctly", () => {
        expect(getEndpointForType("Warframe Part")).toBe("warframes");
        expect(getEndpointForType("Warframe")).toBe("warframes");
    });

    test("routes weapon-related types correctly, including raw WFCD vocabulary", () => {
        expect(getEndpointForType("Rifle")).toBe("weapons");
        expect(getEndpointForType("Weapon Part")).toBe("weapons");
        expect(getEndpointForType("Arch-Gun")).toBe("weapons");
    });

    test("routes Mod exactly", () => {
        expect(getEndpointForType("Mod")).toBe("mods");
    });

    test("returns null for unrecognized types", () => {
        expect(getEndpointForType("Relic")).toBeNull();
    });
});