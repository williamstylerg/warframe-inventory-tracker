(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res, err) => function __init() {
    if (err) throw err[0];
    try {
      return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
    } catch (e) {
      throw err = [e], e;
    }
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // src/modules/state.js
  function setDiscoverHasRun(v) {
    discoverHasRun = v;
  }
  function setDiscoverFilterState(v) {
    discoverFilter = v;
  }
  function setRecommendationGroupMode(v) {
    recommendationGroupMode = v;
  }
  function setCurrentRecommendations(v) {
    currentRecommendations = v;
  }
  function setLastDiscoveryResults(v) {
    lastDiscoveryResults = v;
  }
  function setBuildTrackerFilterState(v) {
    buildTrackerFilter = v;
  }
  function setBuildTrackerPrimeFilterState(v) {
    buildTrackerPrimeFilter = v;
  }
  function setBuildTrackerSearchQuery(v) {
    buildTrackerSearchQuery = v;
  }
  function setSelectedBuildTrackerItem(v) {
    selectedBuildTrackerItem = v;
  }
  function setSortColumn(column) {
    sortColumn = column;
  }
  function setSortAsc(value) {
    sortAsc = value;
  }
  function setPlatPerDucat(value) {
    platPerDucat = value;
  }
  function setInventory(newInventory) {
    inventory = newInventory;
  }
  function setBuildTracker(newBuildTracker) {
    buildTracker = newBuildTracker;
  }
  function setRelicInventory(newRelicInventory) {
    relicInventory = newRelicInventory;
  }
  function setArchwingRelatedNames(newSet) {
    archwingRelatedNames = newSet;
  }
  function setAllItems(newItems) {
    allItems = newItems;
  }
  function setWfcdItems(newItems) {
    wfcdItems = newItems;
  }
  function setRelicNameList(newList) {
    relicNameList = newList;
  }
  function setDiscoverIndex(newIndex) {
    discoverIndex = newIndex;
  }
  var inventory, buildTracker, relicInventory, archwingRelatedNames, allItems, wfcdItems, relicNameList, discoverIndex, sortColumn, sortAsc, platPerDucat, buildTrackerFilter, buildTrackerPrimeFilter, buildTrackerSearchQuery, selectedBuildTrackerItem, recommendationGroupMode, currentRecommendations, lastDiscoveryResults, discoverFilter, discoverHasRun;
  var init_state = __esm({
    "src/modules/state.js"() {
      inventory = [];
      buildTracker = [];
      relicInventory = [];
      archwingRelatedNames = /* @__PURE__ */ new Set();
      allItems = [];
      wfcdItems = [];
      relicNameList = [];
      discoverIndex = [];
      sortColumn = null;
      sortAsc = true;
      platPerDucat = 15;
      buildTrackerFilter = "all";
      buildTrackerPrimeFilter = "all";
      buildTrackerSearchQuery = "";
      selectedBuildTrackerItem = null;
      recommendationGroupMode = "target";
      currentRecommendations = [];
      lastDiscoveryResults = [];
      discoverFilter = "all";
      discoverHasRun = false;
    }
  });

  // src/modules/shared.js
  function normalizeNameClient(name) {
    return name.trim().toLowerCase().replace(/\s+blueprint$/i, "").replace(/\s+/g, " ");
  }
  function getRowClass(item) {
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
  function getDisplayRarity(item) {
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
  function getDisplayType(item) {
    if (item.name.trim().endsWith(" Set")) {
      return "Set";
    }
    return item.type;
  }
  function isTrackableComponent(component, itemCategory) {
    if (itemCategory === "Warframe Part") {
      return ["Blueprint", "Chassis", "Neuroptics", "Systems"].includes(component.name);
    }
    return component.drops && component.drops.length > 0;
  }
  function isArchwingRelated(itemName) {
    return archwingRelatedNames.has(itemName.trim().toLowerCase());
  }
  function getOwnedRelicQuantity(relicFullName) {
    const key = relicFullName.trim().toLowerCase().replace(/\s+relic$/i, "");
    const match = relicInventory.find((r) => r.name.trim().toLowerCase() === key);
    return match ? match.quantity : 0;
  }
  var init_shared = __esm({
    "src/modules/shared.js"() {
      init_state();
    }
  });

  // src/modules/relicLogic.js
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
      Axi: "RelicAxiD.png"
    };
    return tierMap[tier] || null;
  }
  function sortRelics(relics) {
    return [...relics].sort((a, b) => {
      const [tierA, nameA] = a.name.split(" ");
      const [tierB, nameB] = b.name.split(" ");
      const tierIndexA = RELIC_TIER_ORDER.indexOf(tierA);
      const tierIndexB = RELIC_TIER_ORDER.indexOf(tierB);
      if (tierIndexA !== tierIndexB) return tierIndexA - tierIndexB;
      return nameA.localeCompare(nameB, void 0, { numeric: true, sensitivity: "base" });
    });
  }
  var RELIC_TIER_ORDER;
  var init_relicLogic = __esm({
    "src/modules/relicLogic.js"() {
      RELIC_TIER_ORDER = ["Lith", "Meso", "Neo", "Axi"];
    }
  });

  // src/modules/buildTracker.js
  var buildTracker_exports = {};
  __export(buildTracker_exports, {
    addItemToBuildTracker: () => addItemToBuildTracker,
    checkOffComponent: () => checkOffComponent,
    combineSetFromPanel: () => combineSetFromPanel,
    craftedRemove: () => craftedRemove,
    filterBuildTracker: () => filterBuildTracker,
    getAlmostCompleteSets: () => getAlmostCompleteSets,
    normalizeWfcdType: () => normalizeWfcdType,
    pickBuildTrackerSuggestion: () => pickBuildTrackerSuggestion,
    removeItemFromBuildTracker: () => removeItemFromBuildTracker,
    renderAlmostCompleteDigest: () => renderAlmostCompleteDigest,
    renderBuildTracker: () => renderBuildTracker,
    setBuildTrackerFilter: () => setBuildTrackerFilter,
    setBuildTrackerPrimeFilter: () => setBuildTrackerPrimeFilter,
    showBuildTrackerSuggestions: () => showBuildTrackerSuggestions,
    toggleBuildTrackerFilterMenu: () => toggleBuildTrackerFilterMenu,
    uncheckOffComponent: () => uncheckOffComponent
  });
  function normalizeWfcdType(wfcdType, wfcdCategory) {
    if (wfcdCategory === "Warframes" || wfcdType === "Warframe") return "Warframe Part";
    if (wfcdCategory === "Mods" || wfcdType === "Mod") return "Mod";
    if (wfcdCategory === "Arcanes") return "Arcane";
    if (wfcdCategory === "Relics") return "Relic";
    if (["Rifle", "Pistol", "Melee", "Shotgun", "Sentinel Weapon", "Archwing", "Archgun", "Archmelee"].includes(wfcdType)) return "Weapon Part";
    return "Misc";
  }
  function setBuildTrackerFilter(filter) {
    setBuildTrackerFilterState(filter);
    renderBuildTracker(buildTracker);
  }
  function setBuildTrackerPrimeFilter(filter) {
    setBuildTrackerPrimeFilterState(filter);
    renderBuildTracker(buildTracker);
  }
  function filterBuildTracker(query) {
    setBuildTrackerSearchQuery(query.trim().toLowerCase());
    renderBuildTracker(buildTracker);
  }
  function toggleBuildTrackerFilterMenu() {
    const menu = document.getElementById("buildTrackerFilterMenu");
    menu.style.display = menu.style.display === "none" ? "block" : "none";
  }
  async function checkOffComponent(setName, partName, isPrime, itemCategory) {
    if (isPrime) {
      const fullName = `${setName} ${partName}`;
      const slugBase = fullName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
      const needsSuffix = partName !== "Blueprint" && itemCategory === "Warframe";
      const slug = needsSuffix ? slugBase + "_blueprint" : slugBase;
      const newInv = await window.api.addItem(fullName, slug);
      setInventory(newInv);
      renderTable(newInv);
      await refreshTotals();
    } else {
      await window.api.checkBuildTrackerPart(setName, partName);
    }
    const tracker = await window.api.getBuildTracker();
    await renderBuildTracker(tracker);
  }
  async function uncheckOffComponent(setName, partName, isPrime) {
    if (isPrime) {
      const fullName = `${setName} ${partName}`;
      const existingItem = inventory.find((i) => normalizeNameClient(i.name) === normalizeNameClient(fullName));
      if (existingItem) {
        const newInv = await window.api.deleteItem(existingItem.slug);
        setInventory(newInv);
        renderTable(newInv);
        await refreshTotals();
      }
    } else {
      await window.api.uncheckBuildTrackerPart(setName, partName);
    }
    const tracker = await window.api.getBuildTracker();
    await renderBuildTracker(tracker);
  }
  async function combineSetFromPanel(setName) {
    const { showAlert: showAlert2 } = await Promise.resolve().then(() => (init_settings(), settings_exports));
    const result = await window.api.combineSet(setName);
    if (!result.success) {
      await showAlert2(result.reason);
      return;
    }
    await showAlert2(`Combined ${result.setsCreated} set(s) of ${setName}.`);
    const newInv = await window.api.getInventory();
    setInventory(newInv);
    renderTable(newInv);
    await refreshTotals();
    const tracker = await window.api.getBuildTracker();
    await renderBuildTracker(tracker);
  }
  async function craftedRemove(setName) {
    const tracker = await window.api.removeFromBuildTracker(setName);
    await renderBuildTracker(tracker);
  }
  async function removeItemFromBuildTracker(name) {
    const tracker = await window.api.removeFromBuildTracker(name);
    await renderBuildTracker(tracker);
  }
  function showBuildTrackerSuggestions(value) {
    const box = document.getElementById("buildTrackerSuggestions");
    if (!value.trim()) {
      box.style.display = "none";
      return;
    }
    const v = value.toLowerCase();
    const matches = wfcdItems.filter((i) => i.name.toLowerCase().includes(v)).slice(0, 10);
    if (matches.length === 0) {
      box.style.display = "none";
      return;
    }
    box.innerHTML = matches.map((m) => {
      const safeName = m.name.replace(/'/g, "\\'");
      return `<div data-action="pick-build-tracker-suggestion" data-name="${safeName}" data-type="${m.type}" data-category="${m.category || ""}">${m.name}</div>`;
    }).join("");
    box.style.display = "block";
  }
  function pickBuildTrackerSuggestion(name, wfcdType, wfcdCategory) {
    document.getElementById("buildTrackerName").value = name;
    const normalizedType = normalizeWfcdType(wfcdType, wfcdCategory);
    setSelectedBuildTrackerItem({ name, type: normalizedType });
    document.getElementById("buildTrackerSuggestions").style.display = "none";
  }
  async function addItemToBuildTracker() {
    const nameInput = document.getElementById("buildTrackerName").value.trim();
    if (!nameInput) {
      const { showAlert: showAlert2 } = await Promise.resolve().then(() => (init_settings(), settings_exports));
      await showAlert2("Enter an item name");
      return;
    }
    const name = selectedBuildTrackerItem?.name || nameInput;
    const type = selectedBuildTrackerItem?.type || "Misc";
    const parts = name.split(" ");
    const set = parts.length > 1 ? parts[0] + " " + parts[1] : parts[0];
    const normalizedName = normalizeNameClient(name);
    const marketMatch = allItems.find((i) => normalizeNameClient(i.name) === normalizedName);
    const tracker = await window.api.addToBuildTracker({
      name,
      set,
      type,
      marketSlug: marketMatch ? marketMatch.slug : null,
      tradable: !!marketMatch
    });
    await renderBuildTracker(tracker);
    document.getElementById("buildTrackerName").value = "";
    setSelectedBuildTrackerItem(null);
  }
  async function getAlmostCompleteSets() {
    const almostComplete = [];
    for (const trackedSet of buildTracker) {
      const components = await window.api.getFarmInfo(trackedSet.name, trackedSet.type);
      const requiredParts = components.filter((c) => isTrackableComponent(c, trackedSet.type));
      if (requiredParts.length === 0) continue;
      let ownedCount = 0;
      const missingParts = [];
      for (const part of requiredParts) {
        const isPrime = part.ducats !== void 0;
        let owned;
        if (isPrime) {
          const fullName = `${trackedSet.name} ${part.name}`;
          owned = inventory.some((invItem) => normalizeNameClient(invItem.name) === normalizeNameClient(fullName) && invItem.quantity > 0);
        } else {
          owned = (trackedSet.obtainedParts || []).includes(part.name);
        }
        if (owned) ownedCount++;
        else missingParts.push(part.name);
      }
      const missingCount = requiredParts.length - ownedCount;
      if (missingCount === 1) {
        almostComplete.push({ setName: trackedSet.name, setType: trackedSet.type, missingPart: missingParts[0], ownedCount, totalRequired: requiredParts.length });
      }
    }
    return almostComplete;
  }
  async function renderAlmostCompleteDigest() {
    const container = document.getElementById("almostCompleteDigest");
    if (!container) return;
    const almostComplete = await getAlmostCompleteSets();
    if (almostComplete.length === 0) {
      container.innerHTML = "";
      return;
    }
    let html = `<h3 style="margin-bottom:8px;">Almost There</h3><div class="build-tracker-grid" style="margin-bottom:24px;">`;
    for (const item of almostComplete) {
      const safeSetName = item.setName.replace(/'/g, "\\'");
      html += `<div class="set-card" style="border-color:#eac435;">
            <h3 class="item-name" data-action="show-farm-info-obj" data-name="${safeSetName}" data-set="${safeSetName}" data-type="${item.setType}">${item.setName}</h3>
            <p>${item.ownedCount} / ${item.totalRequired} components \u2014 missing <strong>${item.missingPart}</strong></p>
        </div>`;
    }
    html += `</div>`;
    container.innerHTML = html;
  }
  async function renderBuildTracker(rows) {
    setBuildTracker(rows);
    const container = document.getElementById("buildTrackerTable");
    const scrollContainer = document.querySelector(".content");
    const scrollPos = scrollContainer.scrollTop;
    let html = `<div class="build-tracker-grid">`;
    const filteredRows = rows.filter((trackedSet) => {
      const typeMatch = buildTrackerFilter === "all" ? true : buildTrackerFilter === "warframe" ? trackedSet.type.includes("Warframe") : !trackedSet.type.includes("Warframe");
      const primeMatch = buildTrackerPrimeFilter === "all" ? true : buildTrackerPrimeFilter === "prime" ? trackedSet.name.includes("Prime") : !trackedSet.name.includes("Prime");
      const searchMatch = buildTrackerSearchQuery ? trackedSet.name.toLowerCase().includes(buildTrackerSearchQuery) : true;
      return typeMatch && primeMatch && searchMatch;
    }).sort((a, b) => {
      const aIsPrime = a.name.includes("Prime");
      const bIsPrime = b.name.includes("Prime");
      if (aIsPrime !== bIsPrime) return aIsPrime ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    for (const trackedSet of filteredRows) {
      const components = await window.api.getFarmInfo(trackedSet.name, trackedSet.type);
      const requiredParts = components.filter((c) => isTrackableComponent(c, trackedSet.type));
      const imageName = await window.api.getItemImage(trackedSet.name, trackedSet.type);
      const imageUrl = imageName ? `https://cdn.warframestat.us/img/${imageName}` : null;
      const safeSetName = trackedSet.name.replace(/'/g, "\\'");
      html += `<div class="set-card">`;
      if (imageUrl) {
        const showBadge = isArchwingRelated(trackedSet.name);
        html += `<div class="image-container">
                <img src="${imageUrl}" class="set-card-image" alt="${trackedSet.name}">
                ${showBadge ? `<img src="assets/archwing-icon.png" class="archwing-badge" title="Archwing-related">` : ""}
            </div>`;
      }
      html += `<h3 data-action="show-farm-info-obj" data-name="${safeSetName}" data-set="${safeSetName}" data-type="${trackedSet.type}">${trackedSet.name}</h3>`;
      if (requiredParts.length === 0) {
        html += `<p><em>No component data available for this set.</em></p>`;
      } else {
        let allOwned = true;
        html += `<ul class="component-checklist">`;
        for (const part of requiredParts) {
          const isPrime = part.ducats !== void 0;
          let owned;
          if (isPrime) {
            const fullName = `${trackedSet.name} ${part.name}`;
            owned = inventory.some((invItem) => normalizeNameClient(invItem.name) === normalizeNameClient(fullName) && invItem.quantity > 0);
          } else {
            owned = (trackedSet.obtainedParts || []).includes(part.name);
          }
          if (!owned) allOwned = false;
          const safePartName = part.name.replace(/'/g, "\\'");
          html += `<li>
                    <span class="part-label">${part.name}</span>
                    <input type="checkbox" ${owned ? "checked" : ""}
                        data-action="toggle-component" data-set="${safeSetName}" data-part="${safePartName}" data-prime="${isPrime}" data-category="${trackedSet.type}">
                </li>`;
        }
        html += `</ul>`;
        if (allOwned) {
          const isPrimeSet = requiredParts.some((p) => p.ducats !== void 0);
          if (isPrimeSet) {
            html += `<button data-action="combine-set" data-set="${safeSetName}">Combine Set</button>`;
          } else {
            html += `<button data-action="crafted-remove" data-set="${safeSetName}">I've Crafted This \u2014 Remove</button>`;
          }
        }
      }
      html += `<button class="delete-btn" data-action="remove-tracked-set" data-set="${safeSetName}">Remove from Tracker</button>`;
      html += `</div>`;
    }
    html += `</div>`;
    container.innerHTML = html || "<p>No sets being tracked yet.</p>";
    scrollContainer.scrollTop = scrollPos;
    await renderAlmostCompleteDigest();
  }
  var init_buildTracker = __esm({
    "src/modules/buildTracker.js"() {
      init_state();
      init_shared();
      init_priceTracker();
    }
  });

  // src/modules/relics.js
  var relics_exports = {};
  __export(relics_exports, {
    addRelicHandler: () => addRelicHandler,
    adjustRelicQuantity: () => adjustRelicQuantity,
    filterRelicGrid: () => filterRelicGrid,
    handleRelicSearchKeydown: () => handleRelicSearchKeydown,
    loadRelicNameList: () => loadRelicNameList,
    pickRelicSuggestion: () => pickRelicSuggestion,
    refreshRelics: () => refreshRelics,
    removeRelicHandler: () => removeRelicHandler,
    renderRelicGrid: () => renderRelicGrid,
    showRelicSuggestions: () => showRelicSuggestions
  });
  async function refreshRelics() {
    setRelicInventory(await window.api.getRelics());
    renderRelicGrid(relicInventory);
  }
  function renderRelicGrid(relics) {
    const container = document.getElementById("relicGrid");
    const sorted = sortRelics(relics);
    if (sorted.length === 0) {
      container.innerHTML = "<p>No relics tracked yet.</p>";
      return;
    }
    let html = "";
    for (const relic of sorted) {
      const safeName = relic.name.replace(/'/g, "\\'");
      const imageUrl = relic.imageName ? `https://cdn.warframestat.us/img/${relic.imageName}` : null;
      html += `<div class="set-card">`;
      if (imageUrl) {
        html += `<img src="${imageUrl}" class="set-card-image" alt="${relic.name}">`;
      }
      html += `<h3 class="item-name" data-action="show-relic-rewards" data-name="${safeName}">${relic.name}</h3>`;
      html += `<div style="display:flex; align-items:center; gap:8px; margin-bottom:10px;">
            <button data-action="adjust-relic" data-name="${safeName}" data-delta="-1">-</button>
            <span>${relic.quantity}</span>
            <button data-action="adjust-relic" data-name="${safeName}" data-delta="1">+</button>
        </div>`;
      html += `</div>`;
    }
    container.innerHTML = html;
  }
  async function adjustRelicQuantity(name, delta) {
    const relic = relicInventory.find((r) => r.name === name);
    const newQuantity = (relic ? relic.quantity : 0) + delta;
    setRelicInventory(await window.api.updateRelicQuantity(name, newQuantity));
    renderRelicGrid(relicInventory);
  }
  async function removeRelicHandler(name) {
    setRelicInventory(await window.api.removeRelic(name));
    renderRelicGrid(relicInventory);
  }
  async function addRelicHandler() {
    const nameInput = document.getElementById("relicSearchName").value.trim();
    if (!nameInput) return;
    const normalizedName = normalizeRelicName(nameInput);
    const imageName = getRelicImageName(normalizedName);
    setRelicInventory(await window.api.addRelic(normalizedName, imageName));
    renderRelicGrid(relicInventory);
    document.getElementById("relicSearchName").value = "";
  }
  async function loadRelicNameList() {
    try {
      const response = await fetch("https://drops.warframestat.us/data/relics.json");
      const data = await response.json();
      const relicsList = data.relics || data;
      const seen = /* @__PURE__ */ new Set();
      const list = [];
      for (const entry of relicsList) {
        if (!entry.tier || !entry.relicName) continue;
        const fullName = `${entry.tier} ${entry.relicName}`;
        if (!seen.has(fullName)) {
          seen.add(fullName);
          list.push(fullName);
        }
      }
      setRelicNameList(list);
    } catch (err) {
      console.log("Failed to load relic name list:", err.message);
      setRelicNameList([]);
    }
  }
  function showRelicSuggestions(value) {
    const box = document.getElementById("relicSuggestions");
    relicSuggestionIndex = -1;
    if (!value.trim()) {
      box.style.display = "none";
      currentRelicSuggestions = [];
      return;
    }
    const v = value.toLowerCase();
    currentRelicSuggestions = relicNameList.filter((name) => name.toLowerCase().includes(v)).slice(0, 100);
    if (currentRelicSuggestions.length === 0) {
      box.style.display = "none";
      return;
    }
    renderRelicSuggestionBox();
    box.style.display = "block";
  }
  function renderRelicSuggestionBox() {
    const box = document.getElementById("relicSuggestions");
    box.innerHTML = currentRelicSuggestions.map((name, i) => {
      const highlighted = i === relicSuggestionIndex ? "background:#444;" : "";
      const safeName = name.replace(/'/g, "\\'");
      return `<div style="${highlighted}" data-action="pick-relic-suggestion" data-name="${safeName}">${name}</div>`;
    }).join("");
  }
  function pickRelicSuggestion(name) {
    document.getElementById("relicSearchName").value = name;
    document.getElementById("relicSuggestions").style.display = "none";
    currentRelicSuggestions = [];
    relicSuggestionIndex = -1;
  }
  function handleRelicSearchKeydown(event) {
    if (currentRelicSuggestions.length === 0) {
      if (event.key === "Enter") {
        addRelicHandler();
      }
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      relicSuggestionIndex = Math.min(
        relicSuggestionIndex + 1,
        currentRelicSuggestions.length - 1
      );
      renderRelicSuggestionBox();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      relicSuggestionIndex = Math.max(relicSuggestionIndex - 1, -1);
      renderRelicSuggestionBox();
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (relicSuggestionIndex >= 0) {
        pickRelicSuggestion(currentRelicSuggestions[relicSuggestionIndex]);
      }
      addRelicHandler();
    } else if (event.key === "Escape") {
      document.getElementById("relicSuggestions").style.display = "none";
      currentRelicSuggestions = [];
      relicSuggestionIndex = -1;
    }
  }
  function filterRelicGrid(query) {
    const q = query.trim().toLowerCase();
    const filtered = q ? relicInventory.filter((r) => r.name.toLowerCase().includes(q)) : relicInventory;
    renderRelicGrid(filtered);
  }
  var relicSuggestionIndex, currentRelicSuggestions;
  var init_relics = __esm({
    "src/modules/relics.js"() {
      init_state();
      init_relicLogic();
      relicSuggestionIndex = -1;
      currentRelicSuggestions = [];
    }
  });

  // src/modules/settings.js
  var settings_exports = {};
  __export(settings_exports, {
    backfillDucatsHandler: () => backfillDucatsHandler,
    backfillRelicImagesHandler: () => backfillRelicImagesHandler,
    backfillTiersHandler: () => backfillTiersHandler,
    clearFarmCacheHandler: () => clearFarmCacheHandler,
    exportBackupHandler: () => exportBackupHandler,
    exportCsvHandler: () => exportCsvHandler,
    importBackupHandler: () => importBackupHandler,
    loadAppSettings: () => loadAppSettings,
    refreshAllRelicDataHandler: () => refreshAllRelicDataHandler,
    restoreAutoBackupHandler: () => restoreAutoBackupHandler,
    showAlert: () => showAlert,
    showConfirm: () => showConfirm,
    toggleSettingsPanel: () => toggleSettingsPanel
  });
  function showAlert(message) {
    return new Promise((resolve) => {
      const modal = document.getElementById("customDialogModal");
      document.getElementById("customDialogMessage").textContent = message;
      const buttonsDiv = document.getElementById("customDialogButtons");
      buttonsDiv.innerHTML = "";
      const okBtn = document.createElement("button");
      okBtn.textContent = "OK";
      okBtn.onclick = () => {
        modal.style.display = "none";
        resolve();
      };
      buttonsDiv.appendChild(okBtn);
      modal.style.display = "block";
      okBtn.focus();
    });
  }
  function showConfirm(message) {
    return new Promise((resolve) => {
      const modal = document.getElementById("customDialogModal");
      document.getElementById("customDialogMessage").textContent = message;
      const buttonsDiv = document.getElementById("customDialogButtons");
      buttonsDiv.innerHTML = "";
      const yesBtn = document.createElement("button");
      yesBtn.textContent = "Yes";
      yesBtn.onclick = () => {
        modal.style.display = "none";
        resolve(true);
      };
      const noBtn = document.createElement("button");
      noBtn.textContent = "Cancel";
      noBtn.style.background = "#444";
      noBtn.onclick = () => {
        modal.style.display = "none";
        resolve(false);
      };
      buttonsDiv.appendChild(yesBtn);
      buttonsDiv.appendChild(noBtn);
      modal.style.display = "block";
      yesBtn.focus();
    });
  }
  async function loadAppSettings() {
    const settings = await window.api.getAppSettings();
    setPlatPerDucat(settings.platPerDucat || 15);
    document.getElementById("platPerDucatInput").value = settings.platPerDucat || 15;
  }
  async function exportBackupHandler() {
    document.getElementById("settingsPanel").style.display = "none";
    const result = await window.api.exportBackup();
    if (!result.success) {
      if (result.reason !== "Export cancelled.") {
        await showAlert(result.reason);
      }
      return;
    }
    await showAlert(`Backup saved to:
${result.path}`);
  }
  async function importBackupHandler() {
    document.getElementById("settingsPanel").style.display = "none";
    const confirmed = await showConfirm(
      "Importing a backup will overwrite your current inventory and build tracker data. This cannot be undone. Continue?"
    );
    if (!confirmed) return;
    const result = await window.api.importBackup();
    if (!result.success) {
      if (result.reason !== "Import cancelled.") {
        await showAlert(result.reason);
      }
      return;
    }
    setInventory(result.inventory);
    renderTable(inventory);
    await refreshTotals();
    const tracker = await window.api.getBuildTracker();
    await renderBuildTracker(tracker);
    await showAlert("Backup imported successfully.");
  }
  async function exportCsvHandler() {
    document.getElementById("settingsPanel").style.display = "none";
    const result = await window.api.exportInventoryCsv();
    if (!result.success) {
      if (result.reason !== "Export cancelled.") {
        await showAlert(result.reason);
      }
      return;
    }
    await showAlert(`CSV exported to:
${result.path}`);
  }
  async function restoreAutoBackupHandler() {
    document.getElementById("settingsPanel").style.display = "none";
    const confirmed = await showConfirm(
      "This will restore your most recent auto-backup, overwriting your current inventory and build tracker. Continue?"
    );
    if (!confirmed) return;
    const result = await window.api.restoreAutoBackup();
    if (!result.success) {
      await showAlert(result.reason);
      return;
    }
    setInventory(result.inventory);
    renderTable(inventory);
    await refreshTotals();
    const tracker = await window.api.getBuildTracker();
    await renderBuildTracker(tracker);
    const backupDate = new Date(result.exportedAt).toLocaleString();
    await showAlert(`Restored auto-backup from ${backupDate}.`);
  }
  async function backfillTiersHandler() {
    document.getElementById("settingsPanel").style.display = "none";
    const result = await window.api.backfillTiers();
    setInventory(await window.api.getInventory());
    renderTable(inventory);
    await showAlert(`Updated tier data for ${result.updated} of ${result.total} items.`);
  }
  async function backfillRelicImagesHandler() {
    document.getElementById("settingsPanel").style.display = "none";
    for (const relic of relicInventory) {
      if (!relic.imageName) {
        const imageName = getRelicImageName(relic.name);
        if (imageName) {
          await window.api.updateRelicImage(relic.name, imageName);
        }
      }
    }
    await refreshRelics();
    await showAlert("Relic images updated.");
  }
  async function backfillDucatsHandler() {
    document.getElementById("settingsPanel").style.display = "none";
    const result = await window.api.backfillDucats();
    setInventory(await window.api.getInventory());
    renderTable(inventory);
    await showAlert(`Updated ducat data for ${result.updated} of ${result.total} items.`);
  }
  async function clearFarmCacheHandler() {
    document.getElementById("settingsPanel").style.display = "none";
    const confirmed = await showConfirm(
      "This will clear cached farm/component data. It will be refetched automatically as needed. Continue?"
    );
    if (!confirmed) return;
    const result = await window.api.clearFarmCache();
    if (result.success) {
      await showAlert("Farm data cache cleared.");
    } else {
      await showAlert("Failed to clear cache: " + result.reason);
    }
  }
  async function refreshAllRelicDataHandler() {
    document.getElementById("settingsPanel").style.display = "none";
    const confirmed = await showConfirm(
      "This will refetch all relic drop data from the live source. It may take a moment. Continue?"
    );
    if (!confirmed) return;
    const result = await window.api.refreshAllRelicData();
    if (result.success) {
      await showAlert(`Updated ${result.count} relics.`);
    } else {
      await showAlert("Failed to update relic data: " + result.reason);
    }
  }
  function toggleSettingsPanel() {
    const panel = document.getElementById("settingsPanel");
    panel.style.display = panel.style.display === "none" ? "block" : "none";
  }
  var init_settings = __esm({
    "src/modules/settings.js"() {
      init_state();
      init_relicLogic();
      init_priceTracker();
      init_buildTracker();
      init_relics();
    }
  });

  // src/modules/priceTracker.js
  var priceTracker_exports = {};
  __export(priceTracker_exports, {
    addItem: () => addItem,
    calculateAveragePlatPerDucat: () => calculateAveragePlatPerDucat,
    deleteItem: () => deleteItem,
    filterPriceTable: () => filterPriceTable,
    hideSuggestions: () => hideSuggestions,
    pickSuggestion: () => pickSuggestion,
    refreshTotals: () => refreshTotals,
    renderTable: () => renderTable,
    showSuggestions: () => showSuggestions,
    sortArrow: () => sortArrow,
    sortBy: () => sortBy,
    updatePlatPerDucat: () => updatePlatPerDucat,
    updatePrices: () => updatePrices,
    updateQuantity: () => updateQuantity
  });
  function sortArrow(column) {
    if (sortColumn !== column) return "";
    return sortAsc ? " \u25B2" : " \u25BC";
  }
  function getDucatComparisonCell(item) {
    if (item.ducats === null || item.ducats === void 0) return "\u2014";
    const ducatEquivalent = item.ducats * platPerDucat;
    const platPrice = Number(item.price);
    let label = "";
    if (platPrice > ducatEquivalent) {
      label = `<div style="color:#4dd9ec; font-size:0.8em;">Sell for Plat</div>`;
    } else if (ducatEquivalent > platPrice) {
      label = `<div style="color:#eac435; font-size:0.8em;">Trade for Ducats</div>`;
    } else {
      label = `<div style="font-size:0.8em;">Even</div>`;
    }
    return `<div>${item.ducats}d</div>${label}`;
  }
  function calculateAveragePlatPerDucat(inv) {
    const validItems = inv.filter((i) => i.ducats && i.ducats > 0 && i.price > 0);
    if (validItems.length === 0) return null;
    const ratios = validItems.map((i) => i.price / i.ducats);
    const average = ratios.reduce((sum, r) => sum + r, 0) / ratios.length;
    return Math.round(average * 100) / 100;
  }
  async function updatePlatPerDucat(value) {
    const numValue = Math.max(0.01, Number(value) || 15);
    setPlatPerDucat(numValue);
    await window.api.updateAppSettings({ platPerDucat: numValue });
    document.getElementById("platPerDucatInput").value = numValue;
    renderTable(inventory);
  }
  function renderTable(rows) {
    const table = document.getElementById("inventoryTable");
    let html = `
        <tr>
            <th data-action="sort" data-column="name">Name${sortArrow("name")}</th>
            <th data-action="sort" data-column="type">Type${sortArrow("type")}</th>
            <th data-action="sort" data-column="rarity">Rarity${sortArrow("rarity")}</th>
            <th data-action="sort" data-column="vaulted">Vaulted${sortArrow("vaulted")}</th>
            <th data-action="sort" data-column="set">Set${sortArrow("set")}</th>
            <th data-action="sort" data-column="quantity">Qty${sortArrow("quantity")}</th>
            <th>Ducats</th>
            <th data-action="sort" data-column="price">Price${sortArrow("price")}</th>
            <th data-action="sort" data-column="total">Total${sortArrow("total")}</th>
            <th data-action="sort" data-column="lastUpdated">Updated${sortArrow("lastUpdated")}</th>
            <th>Delete</th>
        </tr>
        `;
    for (const item of rows) {
      const total = item.price * item.quantity;
      const rowClass = getRowClass(item);
      const safeName = item.name.replace(/'/g, "\\'");
      html += `
        <tr class="${rowClass}">
            <td class="item-name" data-action="show-farm-info" data-item='${JSON.stringify(item).replace(/'/g, "&#39;")}'>${item.name}</td>
            <td>${getDisplayType(item)}</td>
            <td>${getDisplayRarity(item)}</td>
            <td>${item.vaulted ? "Yes" : "No"}</td>
            <td>${item.set}</td>

            <td>
                <input class="qty-input" type="number" min="1" value="${item.quantity}"
                    data-action="update-quantity" data-slug="${item.slug}">
            </td>

            <td>
                ${getDucatComparisonCell(item)}
            </td>

            <td>
                <div style="display:flex; align-items:center; gap:6px;">
                    <span style="min-width:36px; display:inline-block; text-align:right;">${item.price}</span>
                    <button data-action="show-price-history" data-slug="${item.slug}" data-name="${safeName}" title="View price history" style="background:#2a2a2a; border:1px solid #444; border-radius:4px; padding:4px 8px;">\u{1F4C8}</button>
                </div>
            </td>

            <td>${total}</td>
            <td>${new Date(item.lastUpdated).toLocaleDateString()}</td>

            <td>
                <button class="delete-btn" data-action="delete-item" data-slug="${item.slug}">X</button>
            </td>
        </tr>
        `;
    }
    table.innerHTML = html;
  }
  async function addItem() {
    const name = document.getElementById("itemName").value.trim();
    const slug = document.getElementById("itemSlug").value.trim();
    if (!name || !slug) {
      await showAlert("Item name and slug required");
      return;
    }
    setInventory(await window.api.addItem(name, slug));
    renderTable(inventory);
    await refreshTotals();
    const tracker = await window.api.getBuildTracker();
    await renderBuildTracker(tracker);
    document.getElementById("itemName").value = "";
    document.getElementById("itemSlug").value = "";
    hideSuggestions();
  }
  async function deleteItem(slug) {
    setInventory(await window.api.deleteItem(slug));
    renderTable(inventory);
    await refreshTotals();
  }
  async function updateQuantity(slug, newQuantity) {
    const updated = await window.api.updateQuantity(slug, newQuantity);
    setInventory(updated);
    renderTable(inventory);
    await refreshTotals();
  }
  async function updatePrices() {
    setInventory(await window.api.updatePrices());
    renderTable(inventory);
    await refreshTotals();
    const suggested = calculateAveragePlatPerDucat(inventory);
    const suggestionEl = document.getElementById("platPerDucatSuggestion");
    if (suggested) {
      suggestionEl.innerHTML = `Your items currently average ~${suggested}. <a href="#" data-action="use-suggested-rate" data-value="${suggested}">Use this</a>`;
    }
  }
  function sortBy(column) {
    if (sortColumn === column) {
      setSortAsc(!sortAsc);
    } else {
      setSortColumn(column);
      setSortAsc(true);
    }
    inventory.sort((a, b) => {
      let valA, valB;
      if (column === "total") {
        valA = a.price * a.quantity;
        valB = b.price * b.quantity;
      } else if (column === "vaulted") {
        valA = a.vaulted ? 1 : 0;
        valB = b.vaulted ? 1 : 0;
      } else if (column === "lastUpdated") {
        valA = a.lastUpdated;
        valB = b.lastUpdated;
      } else if (column === "rarity") {
        const rarityRank = { "": -1, Common: 0, Uncommon: 1, Rare: 2 };
        valA = rarityRank[getDisplayRarity(a)] ?? -1;
        valB = rarityRank[getDisplayRarity(b)] ?? -1;
      } else {
        valA = a[column];
        valB = b[column];
      }
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
    renderTable(inventory);
  }
  async function refreshTotals() {
    const totals = await window.api.getTotals();
    document.getElementById("totalUnique").innerText = totals.uniqueCount;
    document.getElementById("totalPlat").innerText = totals.totalPlat;
  }
  function showSuggestions(value) {
    const box = document.getElementById("suggestions");
    if (!value.trim()) {
      hideSuggestions();
      return;
    }
    const v = value.toLowerCase();
    const matches = allItems.filter((i) => i.name.toLowerCase().includes(v)).slice(0, 10);
    if (matches.length === 0) {
      hideSuggestions();
      return;
    }
    box.innerHTML = matches.map((m) => {
      const safeName = m.name.replace(/'/g, "\\'");
      const safeSlug = m.slug.replace(/'/g, "\\'");
      return `<div data-action="pick-suggestion" data-name="${safeName}" data-slug="${safeSlug}">${m.name}</div>`;
    }).join("");
    box.style.display = "block";
  }
  function pickSuggestion(name, slug) {
    document.getElementById("itemName").value = name;
    document.getElementById("itemSlug").value = slug;
    hideSuggestions();
  }
  function hideSuggestions() {
    const box = document.getElementById("suggestions");
    box.style.display = "none";
  }
  function filterPriceTable(query) {
    const q = query.trim().toLowerCase();
    const filtered = q ? inventory.filter((i) => i.name.toLowerCase().includes(q)) : inventory;
    renderTable(filtered);
  }
  var init_priceTracker = __esm({
    "src/modules/priceTracker.js"() {
      init_state();
      init_shared();
      init_settings();
      init_buildTracker();
    }
  });

  // src/renderer.js
  init_state();
  init_priceTracker();
  init_buildTracker();
  init_relics();

  // src/modules/recommendations.js
  var recommendations_exports = {};
  __export(recommendations_exports, {
    loadRecommendations: () => loadRecommendations,
    renderDiscoverResults: () => renderDiscoverResults,
    renderRecommendations: () => renderRecommendations,
    runDiscoverNewSets: () => runDiscoverNewSets,
    setDiscoverFilter: () => setDiscoverFilter,
    setRecommendationTab: () => setRecommendationTab,
    toggleRecommendationGrouping: () => toggleRecommendationGrouping,
    trackDiscoveredSet: () => trackDiscoveredSet
  });
  init_state();
  init_shared();
  async function loadRecommendations() {
    document.getElementById("recommendationsNavBtn").style.display = "block";
    window.switchView("recommendations");
    document.getElementById("recommendationList").innerHTML = `<p><span class="spinner"></span>Loading recommendations...</p>`;
    const recommendations = await window.api.getRelicRecommendations();
    await renderRecommendations(recommendations);
  }
  function toggleRecommendationGrouping() {
    setRecommendationGroupMode(recommendationGroupMode === "target" ? "relic" : "target");
    renderRecommendations(currentRecommendations);
  }
  async function renderRecommendations(recommendations) {
    setCurrentRecommendations(recommendations);
    const container = document.getElementById("recommendationList");
    if (recommendations.length === 0) {
      container.innerHTML = "<p>No recommendations yet \u2014 add relics or track sets to see suggestions.</p>";
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
            html += `<li>${rec.relicName} (${rec.relicQuantity} owned) \u2014 ${rec.chance}% at ${rec.minRefinement}</li>`;
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
        for (const rec of grouped[key]) html += `<li>${rec.targetItem} (${rec.targetSet}) \u2014 ${rec.chance}% at ${rec.minRefinement}</li>`;
        html += `</ul></div>`;
      }
    }
    container.innerHTML = html;
  }
  function setRecommendationTab(tab) {
    document.getElementById("recommendationTabGaps").style.display = tab === "gaps" ? "block" : "none";
    document.getElementById("recommendationTabDiscover").style.display = tab === "discover" ? "block" : "none";
    if (tab === "discover" && !discoverHasRun) {
      setDiscoverHasRun(true);
      runDiscoverNewSets();
    }
  }
  async function buildRelicRewardMap() {
    const map = /* @__PURE__ */ new Set();
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
        if (relicRewardMap.has(fullPartName)) {
          matchedCount++;
          matchedParts.push(part.name);
        }
      }
      if (matchedCount / requiredParts.length >= 0.75) {
        discoveries.push({ setName: set.name, setType: set.type, matchedCount, totalRequired: requiredParts.length, matchedParts });
      }
    }
    return discoveries;
  }
  async function runDiscoverNewSets() {
    document.getElementById("discoverList").innerHTML = `<p><span class="spinner"></span>Scanning your relics against every Prime set... this may take a moment the first time.</p>`;
    setLastDiscoveryResults(await discoverNewSets());
    await renderDiscoverResults(lastDiscoveryResults);
  }
  async function trackDiscoveredSet(setName, setType) {
    const { renderBuildTracker: renderBuildTracker2 } = await Promise.resolve().then(() => (init_buildTracker(), buildTracker_exports));
    const { showAlert: showAlert2 } = await Promise.resolve().then(() => (init_settings(), settings_exports));
    await window.api.addToBuildTracker({ name: setName, type: setType });
    setLastDiscoveryResults(lastDiscoveryResults.filter((d) => d.setName !== setName));
    await renderDiscoverResults(lastDiscoveryResults);
    const tracker = await window.api.getBuildTracker();
    await renderBuildTracker2(tracker);
    await showAlert2(`${setName} added to your Build Tracker.`);
  }
  function setDiscoverFilter(filter) {
    setDiscoverFilterState(filter);
    renderDiscoverResults(lastDiscoveryResults);
  }
  async function renderDiscoverResults(discoveries) {
    const container = document.getElementById("discoverList");
    if (discoveries.length === 0) {
      container.innerHTML = "<p>No new completable sets found based on your current relics.</p>";
      return;
    }
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

  // src/modules/discover.js
  var discover_exports = {};
  __export(discover_exports, {
    buildDiscoverIndex: () => buildDiscoverIndex,
    openDiscoverResult: () => openDiscoverResult,
    searchDiscover: () => searchDiscover
  });
  init_state();

  // src/modules/modals.js
  var modals_exports = {};
  __export(modals_exports, {
    closeFarmModal: () => closeFarmModal,
    closePriceHistoryModal: () => closePriceHistoryModal,
    closeRelicRewardsModal: () => closeRelicRewardsModal,
    renderFarmModal: () => renderFarmModal,
    showFarmInfo: () => showFarmInfo,
    showPriceHistory: () => showPriceHistory,
    showRelicRewards: () => showRelicRewards
  });
  init_shared();
  var priceHistoryChartInstance = null;
  var volumeChartInstance = null;
  async function showFarmInfo(item) {
    const lookupName = item.type === "Mod" ? item.name : item.set;
    const components = await window.api.getFarmInfo(lookupName, item.type);
    renderFarmModal(lookupName, components, item.type);
  }
  function renderFarmModal(setName, components, itemType) {
    const modal = document.getElementById("farmModal");
    const body = document.getElementById("farmModalBody");
    if (!components || components.length === 0) {
      body.innerHTML = `<p>No farm data found for ${setName}.</p>`;
      modal.style.display = "block";
      return;
    }
    const isFlatDropsList = components[0] && components[0].relic !== void 0;
    function renderDropLine(drop) {
      const owned = getOwnedRelicQuantity(drop.relic);
      const ownedTag = owned > 0 ? `<div style="margin-left:16px; color:#4dd9ec; font-weight:bold; font-size:0.85em;">${owned} owned</div>` : "";
      return `<li>${drop.relic} \u2014 ${drop.chance}% (${drop.rarity})${ownedTag}</li>`;
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
          const imageUrl = comp.imageName ? `https://cdn.warframestat.us/img/${comp.imageName}` : null;
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
  function closeFarmModal() {
    document.getElementById("farmModal").style.display = "none";
  }
  async function showRelicRewards(relicName) {
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
      html += `<li>${reward.itemName} \u2014 ${reward.chance}% (${reward.rarity})</li>`;
    }
    html += `</ul>`;
    body.innerHTML = html;
    document.getElementById("relicRewardsModal").style.display = "block";
  }
  function closeRelicRewardsModal() {
    document.getElementById("relicRewardsModal").style.display = "none";
  }
  async function showPriceHistory(slug, itemName) {
    const history = await window.api.getPriceHistory(slug);
    document.getElementById("priceHistoryTitle").textContent = `${itemName} \u2014 90 Day Price History`;
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
        labels,
        datasets: [
          {
            label: "Moving Avg (Plat)",
            data: movingAvgData,
            borderColor: "#2a6df4",
            backgroundColor: "#2a6df4",
            tension: 0.2,
            pointRadius: 0,
            borderWidth: 2
          },
          {
            label: "Median (Plat)",
            data: medianData,
            borderColor: "#888",
            backgroundColor: "#888",
            tension: 0.2,
            pointRadius: 0,
            borderWidth: 1,
            borderDash: [3, 3]
          }
        ]
      },
      options: {
        responsive: false,
        interaction: { mode: "index", intersect: false },
        scales: {
          y: {
            title: { display: true, text: "Platinum", color: "#eee" },
            ticks: { color: "#eee" },
            grid: { color: "#333" }
          },
          x: {
            ticks: { display: false },
            grid: { color: "#222" }
          }
        },
        plugins: {
          legend: { labels: { color: "#eee" } }
        }
      }
    });
    const rawMax = Math.max(...volumeData) * 1.15;
    const volumeMax = Math.ceil(rawMax / 50) * 50;
    volumeChartInstance = new Chart(volumeCtx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Volume",
            data: volumeData,
            backgroundColor: "rgba(237, 160, 46, 0.6)"
          }
        ]
      },
      options: {
        responsive: false,
        scales: {
          y: {
            title: { display: true, text: "Volume", color: "#eee" },
            ticks: { color: "#eee", stepSize: 50 },
            grid: { color: "#333" },
            max: volumeMax
          },
          x: {
            ticks: { color: "#eee", maxTicksLimit: 12 },
            grid: { color: "#222" }
          }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
    document.getElementById("priceHistoryModal").style.display = "block";
  }
  function closePriceHistoryModal() {
    document.getElementById("priceHistoryModal").style.display = "none";
  }

  // src/modules/discover.js
  function buildDiscoverIndex() {
    const warframeWeaponEntries = wfcdItems.filter((i) => ["Warframes", "Primary", "Secondary", "Melee", "Sentinels", "Archwing", "Arch-Gun", "Arch-Melee", "Mods"].includes(i.category)).map((i) => ({ name: i.name, category: i.category === "Mods" ? "mod" : "item", type: i.type }));
    const relicEntries = relicNameList.map((name) => ({ name, category: "relic", type: null }));
    setDiscoverIndex([...warframeWeaponEntries, ...relicEntries]);
  }
  function searchDiscover(query) {
    const q = query.trim().toLowerCase();
    if (!q) {
      document.getElementById("discoverSearchResults").innerHTML = "";
      return;
    }
    const matches = discoverIndex.filter((i) => i.name.toLowerCase().includes(q)).slice(0, 300);
    renderDiscoverSearchResults(matches);
  }
  function renderDiscoverSearchResults(matches) {
    const container = document.getElementById("discoverSearchResults");
    if (matches.length === 0) {
      container.innerHTML = "<p>No matches found.</p>";
      return;
    }
    container.innerHTML = matches.map((m) => {
      const safeName = m.name.replace(/'/g, "\\'");
      return `<div class="item-name" style="padding:8px;" data-action="open-discover-result" data-name="${safeName}" data-category="${m.category}" data-type="${m.type || ""}">${m.name}</div>`;
    }).join("");
  }
  async function openDiscoverResult(name, category, type) {
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

  // src/renderer.js
  init_settings();

  // src/modules/portfolio.js
  var portfolio_exports = {};
  __export(portfolio_exports, {
    renderPortfolioChart: () => renderPortfolioChart
  });
  var portfolioChartInstance = null;
  async function renderPortfolioChart() {
    const history = await window.api.getPortfolioHistory();
    if (history.length === 0) {
      return;
    }
    const labels = history.map((h) => h.date);
    const platValues = history.map((h) => h.totalPlat);
    const uniqueValues = history.map((h) => h.totalUnique);
    const itemValues = history.map((h) => h.totalItems);
    const ctx = document.getElementById("portfolioChart").getContext("2d");
    if (portfolioChartInstance) portfolioChartInstance.destroy();
    portfolioChartInstance = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Total Platinum Value",
            data: platValues,
            borderColor: "#2a6df4",
            backgroundColor: "#2a6df4",
            yAxisID: "y",
            tension: 0.2,
            pointRadius: 3
          },
          {
            label: "Unique Items",
            data: uniqueValues,
            borderColor: "#eac435",
            backgroundColor: "#eac435",
            yAxisID: "y1",
            tension: 0.2,
            pointRadius: 3,
            borderDash: [4, 4]
          },
          {
            label: "Total Items",
            data: itemValues,
            borderColor: "#8c9aa8",
            backgroundColor: "#8c9aa8",
            yAxisID: "y1",
            tension: 0.2,
            pointRadius: 3,
            borderDash: [2, 2]
          }
        ]
      },
      options: {
        responsive: false,
        interaction: { mode: "index", intersect: false },
        scales: {
          y: {
            type: "linear",
            position: "left",
            title: { display: true, text: "Platinum", color: "#eee" },
            ticks: { color: "#eee" },
            grid: { color: "#333" }
          },
          y1: {
            type: "linear",
            position: "right",
            title: { display: true, text: "Item Count", color: "#eee" },
            ticks: { color: "#eee" },
            grid: { display: false }
          },
          x: {
            ticks: { color: "#eee" },
            grid: { color: "#222" }
          }
        },
        plugins: {
          legend: { labels: { color: "#eee" } }
        }
      }
    });
  }

  // src/renderer.js
  Object.assign(window, {
    ...priceTracker_exports,
    ...buildTracker_exports,
    ...relics_exports,
    ...recommendations_exports,
    ...discover_exports,
    ...modals_exports,
    ...settings_exports,
    ...portfolio_exports,
    switchView
  });
  function switchView(viewName) {
    document.querySelectorAll(".view").forEach((el) => el.style.display = "none");
    document.getElementById("view-" + viewName).style.display = "block";
    document.querySelectorAll(".nav-btn").forEach((btn) => btn.classList.remove("active"));
    const targetBtn = document.querySelector(`.nav-btn[data-view="${viewName}"]`);
    if (targetBtn) targetBtn.classList.add("active");
    if (viewName === "portfolio") renderPortfolioChart();
    if (viewName === "discover") buildDiscoverIndex();
  }
  window.switchView = switchView;
  document.addEventListener("click", async (event) => {
    const target = event.target.closest("[data-action]");
    if (!target) return;
    const a = target.dataset;
    switch (a.action) {
      case "show-farm-info":
        await showFarmInfo(JSON.parse(target.getAttribute("data-item")));
        break;
      case "show-farm-info-obj":
        await showFarmInfo({ name: a.name, set: a.set, type: a.type });
        break;
      case "show-price-history":
        await showPriceHistory(a.slug, a.name);
        break;
      case "delete-item":
        await deleteItem(a.slug);
        break;
      case "sort":
        sortBy(a.column);
        break;
      case "pick-suggestion":
        pickSuggestion(a.name, a.slug);
        break;
      case "use-suggested-rate":
        event.preventDefault();
        await updatePlatPerDucat(a.value);
        break;
      case "adjust-relic":
        await adjustRelicQuantity(a.name, Number(a.delta));
        break;
      case "show-relic-rewards":
        await showRelicRewards(a.name);
        break;
      case "pick-relic-suggestion":
        pickRelicSuggestion(a.name);
        break;
      case "pick-build-tracker-suggestion":
        pickBuildTrackerSuggestion(a.name, a.type, a.category);
        break;
      case "combine-set":
        await combineSetFromPanel(a.set);
        break;
      case "crafted-remove":
        await craftedRemove(a.set);
        break;
      case "remove-tracked-set":
        await removeItemFromBuildTracker(a.set);
        break;
      case "track-discovered-set":
        await trackDiscoveredSet(a.set, a.type);
        break;
      case "open-discover-result":
        await openDiscoverResult(a.name, a.category, a.type);
        break;
    }
  });
  document.addEventListener("change", async (event) => {
    const target = event.target.closest("[data-action]");
    if (target) {
      const a = target.dataset;
      if (a.action === "update-quantity") {
        await updateQuantity(a.slug, target.value);
      } else if (a.action === "toggle-component") {
        target.blur();
        const isPrime = a.prime === "true";
        if (target.checked) await checkOffComponent(a.set, a.part, isPrime, a.category);
        else await uncheckOffComponent(a.set, a.part, isPrime);
      }
    }
    if (event.target.id === "platPerDucatInput") {
      await updatePlatPerDucat(event.target.value);
    }
  });
  document.addEventListener("input", (event) => {
    if (event.target.id === "itemName") showSuggestions(event.target.value);
    if (event.target.id === "priceSearchInput") filterPriceTable(event.target.value);
    if (event.target.id === "buildTrackerName") showBuildTrackerSuggestions(event.target.value);
    if (event.target.id === "buildTrackerSearchInput") filterBuildTracker(event.target.value);
    if (event.target.id === "relicSearchName") showRelicSuggestions(event.target.value);
    if (event.target.id === "relicSearchFilterInput") filterRelicGrid(event.target.value);
    if (event.target.id === "discoverSearchInput") searchDiscover(event.target.value);
  });
  document.getElementById("relicSearchName").addEventListener("keydown", handleRelicSearchKeydown);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      document.getElementById("settingsPanel").style.display = "none";
      document.getElementById("relicRewardsModal").style.display = "none";
      document.getElementById("farmModal").style.display = "none";
      document.getElementById("priceHistoryModal").style.display = "none";
    }
  });
  document.getElementById("farmModal").addEventListener("click", (e) => {
    if (e.target.id === "farmModal") closeFarmModal();
  });
  document.getElementById("relicRewardsModal").addEventListener("click", (e) => {
    if (e.target.id === "relicRewardsModal") closeRelicRewardsModal();
  });
  document.getElementById("priceHistoryModal").addEventListener("click", (e) => {
    if (e.target.id === "priceHistoryModal") closePriceHistoryModal();
  });
  document.getElementById("settingsPanel").addEventListener("click", (e) => {
    if (e.target.id === "settingsPanel") toggleSettingsPanel();
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
      setArchwingRelatedNames(new Set(items.filter((i) => i.type && i.type.includes("Arch")).map((i) => i.name.trim().toLowerCase())));
    } catch (err) {
      console.log("Failed to load archwing-related names:", err.message);
      setArchwingRelatedNames(/* @__PURE__ */ new Set());
    }
  }
  document.addEventListener("DOMContentLoaded", async () => {
    const version = await window.api.getAppVersion();
    document.getElementById("appVersionDisplay").textContent = `v${version}`;
    await loadAppSettings();
    loadItemList();
    loadWfcdItemList();
    loadArchwingRelatedNames();
    loadRelicNameList();
    setInventory(await window.api.getInventory());
    renderTable(inventory);
    await refreshTotals();
    const tracker = await window.api.getBuildTracker();
    await renderBuildTracker(tracker);
    await refreshRelics();
  });
})();
