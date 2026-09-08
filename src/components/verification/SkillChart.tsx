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
    <div className="p-4 bg-graphite-900 border border-graphite-700 shadow-md flex flex-col h-72 select-none font-mono">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-display font-bold text-sm text-paper tracking-wider uppercase">{title}</h3>
        <span className="text-[10px] text-smoke font-mono">DIM // {unit}</span>
      </div>

      <div className="flex-1 w-full h-full min-h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 15, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#202026" opacity={0.8} />
            <XAxis
              dataKey="leadTime"
              stroke="#8D8B97"
              fontSize={10}
              tickLine={false}
              fontFamily="IBM Plex Mono"
            />
            <YAxis
              stroke="#8D8B97"
              fontSize={10}
              tickLine={false}
              domain={['auto', 'auto']}
              fontFamily="IBM Plex Mono"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#111115',
                borderColor: '#32313D',
                borderRadius: '0px',
                fontSize: '11px',
                color: '#F1EEE8',
                fontFamily: 'IBM Plex Mono',
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: '11px', paddingTop: '6px', fontFamily: 'IBM Plex Mono' }}
              iconType="square"
            />
            <Line
              type="monotone"
              dataKey="rawNwp"
              name="RAW IMD/GFS NWP"
              stroke="#8D8B97"
              strokeWidth={1.8}
              strokeDasharray="4 4"
              dot={{ r: 2.5, fill: '#8D8B97' }}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="corrected"
              name="REGIME-AWARE XGB AI"
              stroke="#C8FF3D"
              strokeWidth={2.5}
              dot={{ r: 3.5, fill: '#C8FF3D' }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
