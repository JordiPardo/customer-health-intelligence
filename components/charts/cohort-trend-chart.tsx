"use client";

import { PlotlyChart } from "@/components/charts/plotly-chart";

export function CohortTrendChart({
  data,
}: {
  data: { cohort: string; churnRate: number }[];
}) {
  return (
    <div className="h-64">
      <PlotlyChart
        data={[
          {
            type: "scatter",
            mode: "lines+markers",
            x: data.map((d) => d.cohort),
            y: data.map((d) => Math.round(d.churnRate * 1000) / 10),
            line: { color: "#2563eb", width: 2 },
            marker: { size: 6 },
          },
        ]}
        layout={{
          margin: { t: 8, r: 16, b: 48, l: 48 },
          paper_bgcolor: "white",
          plot_bgcolor: "white",
          xaxis: { title: { text: "Cohort" }, tickangle: -45 },
          yaxis: { title: { text: "Churn rate (%)" }, rangemode: "tozero" },
          font: { family: "system-ui, sans-serif", size: 12 },
        }}
      />
    </div>
  );
}
