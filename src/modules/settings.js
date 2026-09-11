// settings.js

import { inventory, setInventory, relicInventory, setPlatPerDucat } from "./state.js";
import { getRelicImageName } from "./relicLogic.js";
import { renderTable, refreshTotals } from "./priceTracker.js";
import { renderBuildTracker } from "./buildTracker.js";
import { refreshRelics } from "./relics.js";

export function showAlert(message) {
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

export function showConfirm(message) {
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

export async function loadAppSettings() {
    const settings = await window.api.getAppSettings();
    setPlatPerDucat(settings.platPerDucat || 15);
    document.getElementById("platPerDucatInput").value = settings.platPerDucat || 15;
}

export async function exportBackupHandler() {
    document.getElementById("settingsPanel").style.display = "none";
    const result = await window.api.exportBackup();

    if (!result.success) {
        if (result.reason !== "Export cancelled.") {
            await showAlert(result.reason);
        }
        return;
    }

    await showAlert(`Backup saved to:\n${result.path}`);
}

export async function importBackupHandler() {
    document.getElementById("settingsPanel").style.display = "none";
    const confirmed = await showConfirm(
        "Importing a backup will overwrite your current inventory and build tracker data. This cannot be undone. Continue?",
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

export async function exportCsvHandler() {
    document.getElementById("settingsPanel").style.display = "none";
    const result = await window.api.exportInventoryCsv();

    if (!result.success) {
        if (result.reason !== "Export cancelled.") {
            await showAlert(result.reason);
        }
        return;
    }

    await showAlert(`CSV exported to:\n${result.path}`);
}

export async function restoreAutoBackupHandler() {
    document.getElementById("settingsPanel").style.display = "none";
    const confirmed = await showConfirm(
        "This will restore your most recent auto-backup, overwriting your current inventory and build tracker. Continue?",
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

export async function backfillTiersHandler() {
    document.getElementById("settingsPanel").style.display = "none";
    const result = await window.api.backfillTiers();
    setInventory(await window.api.getInventory());
    renderTable(inventory);
    await showAlert(`Updated tier data for ${result.updated} of ${result.total} items.`);
}

export async function backfillRelicImagesHandler() {
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

export async function backfillDucatsHandler() {
    document.getElementById("settingsPanel").style.display = "none";
    const result = await window.api.backfillDucats();
    setInventory(await window.api.getInventory());
    renderTable(inventory);
    await showAlert(`Updated ducat data for ${result.updated} of ${result.total} items.`);
}

export async function clearFarmCacheHandler() {
    document.getElementById("settingsPanel").style.display = "none";

    const confirmed = await showConfirm(
        "This will clear cached farm/component data. It will be refetched automatically as needed. Continue?",
    );
    if (!confirmed) return;

    const result = await window.api.clearFarmCache();
    if (result.success) {
        await showAlert("Farm data cache cleared.");
    } else {
        await showAlert("Failed to clear cache: " + result.reason);
    }
}

export async function refreshAllRelicDataHandler() {
    document.getElementById("settingsPanel").style.display = "none";
    const confirmed = await showConfirm(
        "This will refetch all relic drop data from the live source. It may take a moment. Continue?",
    );
    if (!confirmed) return;

    const result = await window.api.refreshAllRelicData();

    if (result.success) {
        await showAlert(`Updated ${result.count} relics.`);
    } else {
        await showAlert("Failed to update relic data: " + result.reason);
    }
}

export function toggleSettingsPanel() {
    const panel = document.getElementById("settingsPanel");
    panel.style.display = panel.style.display === "none" ? "block" : "none";
}
