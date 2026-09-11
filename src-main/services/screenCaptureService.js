// src-main/services/screenCaptureService.js
const { desktopCapturer, screen } = require("electron");

async function getScreenSources() {
    const sources = await desktopCapturer.getSources({
        types: ["screen", "window"],
        thumbnailSize: { width: 1920, height: 1080 },
    });
    return sources.map((s) => ({
        name: s.name,
        id: s.id,
        thumbnailDataUrl: s.thumbnail.toDataURL(),
    }));
}

async function captureFullResolution(sourceId) {
    const sources = await desktopCapturer.getSources({
        types: ["screen", "window"],
        thumbnailSize: { width: 1920, height: 1080 },
    });

    const match = sources.find((s) => s.id === sourceId);
    if (!match) {
        return null;
    }

    return match.thumbnail.toDataURL();
}

module.exports = { getScreenSources, captureFullResolution };
