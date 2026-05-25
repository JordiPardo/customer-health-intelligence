"use client";

import { PlotlyChart } from "@/components/charts/plotly-chart";
import type { UsagePoint } from "@/lib/types";

export function UsageChart({ data }: { data: UsagePoint[] }) {
  return (
    <div className="h-64">
      <PlotlyChart
        data={[
          {
            type: "scatter",
            mode: "lines+markers",
            name: "Logins",
            x: data.map((d) => d.month),
            y: data.map((d) => d.logins),
            line: { color: "#2563eb" },
          },
          {
            type: "scatter",
            mode: "lines+markers",
            name: "Features",
            x: data.map((d) => d.month),
            y: data.map((d) => d.feature_used),
            line: { color: "#16a34a" },
          },
        ]}
        layout={{
          margin: { t: 24, r: 16, b: 48, l: 48 },
          paper_bgcolor: "white",
          plot_bgcolor: "white",
          legend: { orientation: "h", y: 1.15 },
          xaxis: { title: { text: "Month" } },
          yaxis: { title: { text: "Event count" }, rangemode: "tozero" },
          font: { family: "system-ui, sans-serif", size: 12 },
        }}
      />
    </div>
  );
}
