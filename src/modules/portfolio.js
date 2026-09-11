// portfolio.js
// Renders the portfolio value history chart.

let portfolioChartInstance = null;

export async function renderPortfolioChart() {
    const history = await window.api.getPortfolioHistory();

    if (history.length === 0) {
        return; // canvas just stays empty; could add a placeholder message if you prefer
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
            labels: labels,
            datasets: [
                {
                    label: "Total Platinum Value",
                    data: platValues,
                    borderColor: "#2a6df4",
                    backgroundColor: "#2a6df4",
                    yAxisID: "y",
                    tension: 0.2,
                    pointRadius: 3,
                },
                {
                    label: "Unique Items",
                    data: uniqueValues,
                    borderColor: "#eac435",
                    backgroundColor: "#eac435",
                    yAxisID: "y1",
                    tension: 0.2,
                    pointRadius: 3,
                    borderDash: [4, 4],
                },
                {
                    label: "Total Items",
                    data: itemValues,
                    borderColor: "#8c9aa8",
                    backgroundColor: "#8c9aa8",
                    yAxisID: "y1",
                    tension: 0.2,
                    pointRadius: 3,
                    borderDash: [2, 2],
                },
            ],
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
                    grid: { color: "#333" },
                },
                y1: {
                    type: "linear",
                    position: "right",
                    title: { display: true, text: "Item Count", color: "#eee" },
                    ticks: { color: "#eee" },
                    grid: { display: false },
                },
                x: {
                    ticks: { color: "#eee" },
                    grid: { color: "#222" },
                },
            },
            plugins: {
                legend: { labels: { color: "#eee" } },
            },
        },
    });
}