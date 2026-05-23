"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export type BandEntry = {
  band: string;
  label: string;
  count: number;
  fill: string;
};

export function HealthDistributionChart({ data }: { data: BandEntry[] }) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  if (total === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
        No clients to display.
      </div>
    );
  }

  const filled = data.filter((d) => d.count > 0);

  return (
    <div role="img" aria-label="Donut chart showing clients per health band">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <title>Client health distribution</title>
          <Pie
            data={filled}
            dataKey="count"
            nameKey="label"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={85}
            paddingAngle={2}
          >
            {filled.map((entry) => (
              <Cell key={entry.band} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => {
              const n = typeof value === "number" ? value : 0;
              return [`${n} client${n === 1 ? "" : "s"}`, String(name)];
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
