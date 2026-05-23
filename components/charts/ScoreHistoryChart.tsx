"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";

import { BAND_HEX } from "@/lib/health/bands";

export type SnapshotPoint = {
  date: string; // "YYYY-MM-DD"
  score: number;
  band: string;
};

export function ScoreHistoryChart({ data }: { data: SnapshotPoint[] }) {
  if (data.length < 2) {
    return (
      <div className="flex h-[220px] items-center justify-center rounded-lg border-2 border-dashed">
        <div className="text-center">
          <p className="text-sm font-medium">Score history</p>
          <p className="text-xs text-muted-foreground mt-1">
            Available once daily snapshots accumulate
          </p>
        </div>
      </div>
    );
  }

  return (
    <div role="img" aria-label="Line chart showing health score over time">
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
          <title>Health score history</title>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(value) => {
              const n = typeof value === "number" ? value : 0;
              return [`Score: ${n}`, "Health Score"];
            }}
          />
          {/* Band threshold reference lines */}
          <ReferenceLine y={85} stroke={BAND_HEX.HEALTHY} strokeDasharray="3 3" strokeOpacity={0.6} />
          <ReferenceLine y={70} stroke={BAND_HEX.FAIR} strokeDasharray="3 3" strokeOpacity={0.6} />
          <ReferenceLine y={50} stroke={BAND_HEX.AT_RISK} strokeDasharray="3 3" strokeOpacity={0.6} />
          <Line
            type="monotone"
            dataKey="score"
            stroke="#2563eb"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
