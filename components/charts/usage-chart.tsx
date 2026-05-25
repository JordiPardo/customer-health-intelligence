"use client";

import { PlotlyChart } from "@/components/charts/plotly-chart";
import { chartLayout, chartLinePrimary } from "@/lib/ui/chart-theme";
import type { UsagePoint } from "@/lib/types";

export function UsageChart({ data }: { data: UsagePoint[] }) {
  return (
    <div className="h-72 w-full">
      <PlotlyChart
        data={[
          {
            type: "scatter",
            mode: "lines+markers",
            name: "Logins",
            x: data.map((d) => d.month),
            y: data.map((d) => d.logins),
            line: chartLinePrimary,
            marker: { size: 4 },
          },
          {
            type: "scatter",
            mode: "lines+markers",
            name: "Features",
            x: data.map((d) => d.month),
            y: data.map((d) => d.feature_used),
            line: { color: "#16a34a", width: 2 },
            marker: { size: 4, color: "#16a34a" },
          },
        ]}
        layout={{
          ...chartLayout,
          margin: { ...chartLayout.margin, t: 28 },
          legend: {
            orientation: "h",
            y: 1.12,
            x: 0,
            font: { size: 11, color: "#71717a" },
          },
          xaxis: { ...chartLayout.xaxis, title: { text: "Month" } },
          yaxis: {
            ...chartLayout.yaxis,
            title: { text: "Event count" },
            rangemode: "tozero",
          },
        }}
      />
    </div>
  );
}
