"use client";

import { PlotlyChart } from "@/components/charts/plotly-chart";
import {
  chartLayout,
  chartLinePrimary,
} from "@/lib/ui/chart-theme";

export function CohortTrendChart({
  data,
}: {
  data: { cohort: string; churnRate: number }[];
}) {
  return (
    <div className="h-72 w-full">
      <PlotlyChart
        data={[
          {
            type: "scatter",
            mode: "lines+markers",
            x: data.map((d) => d.cohort),
            y: data.map((d) => Math.round(d.churnRate * 1000) / 10),
            line: chartLinePrimary,
            marker: { size: 5, color: "#6366f1" },
            hovertemplate: "%{x}<br>Churn: %{y:.1f}%<extra></extra>",
          },
        ]}
        layout={{
          ...chartLayout,
          xaxis: {
            ...chartLayout.xaxis,
            title: { text: "Cohort" },
            tickangle: -35,
          },
          yaxis: {
            ...chartLayout.yaxis,
            title: { text: "Churn rate (%)" },
            rangemode: "tozero",
          },
        }}
      />
    </div>
  );
}
