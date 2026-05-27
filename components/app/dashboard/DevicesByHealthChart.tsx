'use client'

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BAND_HEX } from '@/lib/health/bands'

interface Props {
  data: { band: string; count: number }[]
}

const DEVICE_HEALTH_COLORS: Record<string, string> = {
  Healthy: BAND_HEX.HEALTHY,
  'At Risk': BAND_HEX.AT_RISK,
  Critical: BAND_HEX.CRITICAL,
}

export function DevicesByHealthChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Devices by Health</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[220px] text-sm text-muted-foreground">
          No devices yet
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Devices by Health</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="band"
              cx="50%"
              cy="45%"
              outerRadius={72}
              labelLine={false}
            >
              {data.map((entry) => (
                <Cell key={entry.band} fill={DEVICE_HEALTH_COLORS[entry.band] ?? '#94a3b8'} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
            <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
