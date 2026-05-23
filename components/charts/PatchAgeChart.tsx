"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from "recharts";

export type PatchAgeEntry = {
  bucket: string;
  count: number;
  fill: string;
};

export function PatchAgeChart({
  data,
  total,
}: {
  data: PatchAgeEntry[];
  total: number;
}) {
  if (total === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
        No devices registered.
      </div>
    );
  }

  return (
    <div role="img" aria-label="Bar chart showing device patch-age distribution">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={data}
          margin={{ top: 4, right: 8, left: -16, bottom: 4 }}
        >
          <title>Device patch-age distribution</title>
          <XAxis
            dataKey="bucket"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(value) => {
              const n = typeof value === "number" ? value : 0;
              return [`${n} device${n === 1 ? "" : "s"}`, "Count"];
            }}
            cursor={{ fill: "rgba(0,0,0,0.04)" }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={64}>
            {data.map((entry) => (
              <Cell key={entry.bucket} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
