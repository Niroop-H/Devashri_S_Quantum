import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from "recharts";

interface HistogramViewProps {
  probabilities: Record<string, number>;
  counts: Record<string, number>;
  shots: number;
}

export const HistogramView: React.FC<HistogramViewProps> = ({
  probabilities,
  counts,
  shots
}) => {
  // Sort by state label for consistent display
  const data = Object.keys(probabilities)
    .sort()
    .map((state) => ({
      state: `|${state}⟩`,
      probability: probabilities[state],
      count: counts[state] || 0
    }));

  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-neutral-600 text-xs">
        No measurement data
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
        <XAxis
          dataKey="state"
          stroke="#525252"
          tick={{ fill: "#a3a3a3", fontSize: 11, fontFamily: "monospace" }}
          interval={0}
          angle={data.length > 8 ? -45 : 0}
          textAnchor={data.length > 8 ? "end" : "middle"}
          height={data.length > 8 ? 50 : 30}
        />
        <YAxis
          stroke="#525252"
          tick={{ fill: "#a3a3a3", fontSize: 10 }}
          domain={[0, "auto"]}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#161616",
            borderColor: "#333",
            borderRadius: "6px",
            color: "#fff",
            fontSize: "12px"
          }}
          formatter={(value: number, name: string) => {
            if (name === "probability")
              return [`${(value * 100).toFixed(2)}%`, "Probability"];
            return [value, "Shot Count"];
          }}
        />
        <Bar
          dataKey="probability"
          fill="#0f62fe"
          radius={[3, 3, 0, 0]}
          maxBarSize={60}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};
