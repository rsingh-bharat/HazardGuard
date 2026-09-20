'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { VerificationResult } from '@/lib/contracts/verification';

interface SkillChartProps {
  data: VerificationResult[];
  metricKey: 'rmse' | 'csi' | 'ets' | 'fss';
  title: string;
  unit: string;
}

export const SkillChart: React.FC<SkillChartProps> = ({ data, metricKey, title, unit }) => {
  const chartData = data.map((v) => ({
    leadTime: `T+${v.scope.leadHours}h`,
    rawNwp: v.rawNwp[metricKey],
    corrected: v.corrected[metricKey],
  }));

  return (
    <div
      className="p-4 flex flex-col h-72 select-none font-mono"
      style={{
        background: "rgba(255,255,255,.05)",
        backdropFilter: "blur(16px) saturate(115%)",
        WebkitBackdropFilter: "blur(16px) saturate(115%)",
        border: "1px solid rgba(255,255,255,.10)",
        borderRadius: 16,
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3
          style={{
            fontFamily: "'Inter Tight', Inter, sans-serif",
            fontWeight: 600,
            fontSize: 14,
            color: '#ffffff',
            letterSpacing: '-0.3px',
          }}
        >
          {title}
        </h3>
        <span style={{ color: "rgba(255,255,255,.50)", fontSize: 10 }}>DIM // {unit}</span>
      </div>

      <div className="flex-1 w-full h-full min-h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 15, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
            <XAxis
              dataKey="leadTime"
              stroke="rgba(255,255,255,0.5)"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              fontFamily="'IBM Plex Mono', monospace"
            />
            <YAxis
              stroke="rgba(255,255,255,0.5)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              domain={['auto', 'auto']}
              fontFamily="'IBM Plex Mono', monospace"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(0,0,0,0.7)',
                borderColor: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(10px)',
                borderRadius: '8px',
                fontSize: '11px',
                color: '#ffffff',
                fontFamily: "'IBM Plex Mono', monospace",
              }}
              itemStyle={{ color: '#ffffff' }}
            />
            <Legend
              wrapperStyle={{ fontSize: '11px', paddingTop: '10px', fontFamily: "'IBM Plex Mono', monospace", color: 'rgba(255,255,255,0.7)' }}
              iconType="circle"
            />
            <Line
              type="monotone"
              dataKey="rawNwp"
              name="RAW IMD/GFS NWP"
              stroke="rgba(255,255,255,0.5)"
              strokeWidth={1.8}
              strokeDasharray="4 4"
              dot={{ r: 2.5, fill: 'rgba(255,255,255,0.5)' }}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="corrected"
              name="REGIME-AWARE XGB AI"
              stroke="#C8FF3D"
              strokeWidth={2.5}
              dot={{ r: 3.5, fill: '#04121b', stroke: '#C8FF3D', strokeWidth: 2 }}
              activeDot={{ r: 5, fill: '#C8FF3D' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
