// state.js
// Centralized, explicitly-imported application state — replaces the implicit
// global variables the app previously relied on.

export let inventory = [];
export let buildTracker = [];
export let relicInventory = [];
export let archwingRelatedNames = new Set();
export let allItems = [];
export let wfcdItems = [];
export let relicNameList = [];
export let discoverIndex = [];
export let sortColumn = null;
export let sortAsc = true;
export let platPerDucat = 15;
export let buildTrackerFilter = "all";
export let buildTrackerPrimeFilter = "all";
export let buildTrackerSearchQuery = "";
export let selectedBuildTrackerItem = null;
export let discoverIndexBuilt = false;
export let recommendationGroupMode = "target";
export let currentRecommendations = [];
export let lastDiscoveryResults = [];
export let discoverFilter = "all";
export let discoverHasRun = false;

export function setDiscoverHasRun(v) {
    discoverHasRun = v;
}

export function setDiscoverFilterState(v) {
    discoverFilter = v;
}

export function setDiscoverIndexBuilt(v) {
    discoverIndexBuilt = v;
}

export function setRecommendationGroupMode(v) {
    recommendationGroupMode = v;
}

export function setCurrentRecommendations(v) {
    currentRecommendations = v;
}

export function setLastDiscoveryResults(v) {
    lastDiscoveryResults = v;
}

export function setBuildTrackerFilterState(v) {
    buildTrackerFilter = v;
}

export function setBuildTrackerPrimeFilterState(v) {
    buildTrackerPrimeFilter = v;
}

export function setBuildTrackerSearchQuery(v) {
    buildTrackerSearchQuery = v;
}

export function setSelectedBuildTrackerItem(v) {
    selectedBuildTrackerItem = v;
}

export function setSortColumn(column) {
    sortColumn = column;
}

export function setSortAsc(value) {
    sortAsc = value;
}

export function setPlatPerDucat(value) {
    platPerDucat = value;
}

export function setInventory(newInventory) {
    inventory = newInventory;
}

export function setBuildTracker(newBuildTracker) {
    buildTracker = newBuildTracker;
}

export function setRelicInventory(newRelicInventory) {
    relicInventory = newRelicInventory;
}

export function setArchwingRelatedNames(newSet) {
    archwingRelatedNames = newSet;
}

export function setAllItems(newItems) {
    allItems = newItems;
}

export function setWfcdItems(newItems) {
    wfcdItems = newItems;
}

export function setRelicNameList(newList) {
    relicNameList = newList;
}

export function setDiscoverIndex(newIndex) {
    discoverIndex = newIndex;
}
