/** Shared Plotly styling aligned with app design tokens. */
export const chartLayout = {
  margin: { t: 12, r: 20, b: 52, l: 52 },
  paper_bgcolor: "transparent",
  plot_bgcolor: "transparent",
  font: {
    family: "Inter, ui-sans-serif, system-ui, sans-serif",
    size: 11,
    color: "#71717a",
  },
  xaxis: {
    gridcolor: "#f4f4f5",
    linecolor: "#e4e4e7",
    tickfont: { size: 11, color: "#71717a" },
    title: { font: { size: 11, color: "#71717a" } },
  },
  yaxis: {
    gridcolor: "#f4f4f5",
    linecolor: "#e4e4e7",
    tickfont: { size: 11, color: "#71717a" },
    title: { font: { size: 11, color: "#71717a" } },
  },
  colorway: ["#6366f1", "#16a34a", "#d97706", "#71717a"],
};

export const chartLinePrimary = { color: "#6366f1", width: 2 };
export const chartFillPrimary = "rgba(99, 102, 241, 0.08)";
