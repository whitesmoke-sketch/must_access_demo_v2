'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface AttendanceDonutChartProps {
  data: Array<{
    name: string;
    value: number;
    color: string;
  }>;
}

export function AttendanceDonutChart({ data }: AttendanceDonutChartProps) {
  return (
    <div className="flex flex-col items-center justify-center">
      <ResponsiveContainer width="100%" height={200} className="md:h-[220px]">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={70}
            paddingAngle={3}
            dataKey="value"
            cornerRadius={8}
            startAngle={90}
            endAngle={450}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#29363D',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '12px',
              fontSize: '14px',
              padding: '8px 12px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            }}
            itemStyle={{
              color: '#FFFFFF',
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* 범례 */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <p style={{ fontSize: '14px', lineHeight: '19.6px', color: '#5B6A72' }}>
              {item.name} ({item.value}명)
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
