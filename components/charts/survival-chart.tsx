"use client";

import { PlotlyChart } from "@/components/charts/plotly-chart";
import {
  chartFillPrimary,
  chartLayout,
  chartLinePrimary,
} from "@/lib/ui/chart-theme";

/**
 * Retention curve over the next 90 days from the model's 30d and 90d churn
 * probabilities (the points in between are interpolated for display).
 */
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
  const times = [0, 30, 60, 90];
  const survival = [
    1,
    1 - churnRisk30d,
    1 - (churnRisk30d + churnRisk90d) / 2,
    1 - churnRisk90d,
  ];
  const minRetention = Math.min(...survival);

  const lower = confidenceInterval?.lower_days;
  const shapes =
    lower != null && lower <= 90
      ? [
          {
            type: "line" as const,
            x0: lower,
            x1: lower,
            y0: 0,
            y1: 1,
            line: { color: "#dc2626", width: 1, dash: "dot" as const },
          },
        ]
      : [];

  return (
    <div className="h-72 w-full">
      <PlotlyChart
        data={[
          {
            type: "scatter",
            mode: "lines+markers",
            x: times,
            y: survival,
            line: { ...chartLinePrimary, shape: "spline" },
            fill: "tozeroy",
            fillcolor: chartFillPrimary,
            hovertemplate: "Day %{x}<br>Still active: %{y:.0%}<extra></extra>",
          },
        ]}
        layout={{
          ...chartLayout,
          shapes,
          xaxis: { ...chartLayout.xaxis, title: { text: "Days from today" } },
          yaxis: {
            ...chartLayout.yaxis,
            title: { text: "Probability still active" },
            range: [Math.max(0, Math.floor((minRetention - 0.1) * 10) / 10), 1],
            tickformat: ".0%",
          },
        }}
      />
    </div>
  );
}
