"use client";

import { PlotlyChart } from "@/components/charts/plotly-chart";
import {
  chartFillPrimary,
  chartLayout,
  chartLinePrimary,
} from "@/lib/ui/chart-theme";

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
    <div className="h-72 w-full">
      <PlotlyChart
        data={[
          {
            type: "scatter",
            mode: "lines",
            x: times,
            y: survival,
            line: { ...chartLinePrimary, shape: "spline" },
            fill: "tozeroy",
            fillcolor: chartFillPrimary,
            hovertemplate: "Day %{x}<br>Retention: %{y:.0%}<extra></extra>",
          },
        ]}
        layout={{
          ...chartLayout,
          shapes,
          xaxis: { ...chartLayout.xaxis, title: { text: "Days from now" } },
          yaxis: {
            ...chartLayout.yaxis,
            title: { text: "Retention probability" },
            range: [0, 1],
            tickformat: ".0%",
          },
        }}
      />
    </div>
  );
}
