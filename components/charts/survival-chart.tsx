"use client";

import { PlotlyChart } from "@/components/charts/plotly-chart";

/** Approximate survival curve from 30d and 90d churn risk (conditional). */
export function SurvivalChart({
  churnRisk30d,
  churnRisk90d,
  confidenceInterval,
}: {
  churnRisk30d: number;
  churnRisk90d: number;
  confidenceInterval: {
    lower_days: number | null;
    upper_days: number | null;
    median_days: number | null;
  } | null;
}) {
  const times = [0, 30, 60, 90, 120];
  const survival = [
    1,
    1 - churnRisk30d,
    1 - (churnRisk30d + churnRisk90d) / 2,
    1 - churnRisk90d,
    Math.max(0, 1 - churnRisk90d * 1.1),
  ];

  const shapes =
    confidenceInterval?.median_days != null
      ? [
          {
            type: "line" as const,
            x0: confidenceInterval.median_days,
            x1: confidenceInterval.median_days,
            y0: 0,
            y1: 1,
            line: { color: "#dc2626", width: 1, dash: "dot" as const },
          },
        ]
      : [];

  return (
    <div className="h-64">
      <PlotlyChart
        data={[
          {
            type: "scatter",
            mode: "lines",
            x: times,
            y: survival,
            line: { color: "#2563eb", width: 2, shape: "spline" },
            fill: "tozeroy",
            fillcolor: "rgba(37, 99, 235, 0.08)",
          },
        ]}
        layout={{
          margin: { t: 8, r: 16, b: 48, l: 48 },
          paper_bgcolor: "white",
          plot_bgcolor: "white",
          shapes,
          xaxis: { title: { text: "Days from now" } },
          yaxis: {
            title: { text: "Retention probability" },
            range: [0, 1],
            tickformat: ".0%",
          },
          font: { family: "system-ui, sans-serif", size: 12 },
        }}
      />
    </div>
  );
}
