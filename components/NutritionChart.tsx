import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Macros } from '../types';

interface NutritionChartProps {
  macros: Macros;
}

export const NutritionChart: React.FC<NutritionChartProps> = ({ macros }) => {
  const data = [
    { name: 'Protein', value: macros.protein, color: '#10b981' }, // emerald-500
    { name: 'Carbs', value: macros.carbs, color: '#f59e0b' },   // amber-500
    { name: 'Fats', value: macros.fats, color: '#ef4444' },     // red-500
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-white p-2 border border-slate-200 shadow-lg rounded-lg text-xs z-50">
          <div className="font-bold text-slate-700 mb-1">{item.name}</div>
          <div className="flex items-center gap-2">
             <span className="w-2 h-2 rounded-full" style={{background: item.color}}></span>
             <span className="font-mono font-medium text-slate-600">{item.value}g</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderLegend = (props: any) => {
    const { payload } = props;
    return (
      <div className="flex justify-center gap-3 mt-1">
        {payload.map((entry: any, index: number) => (
          <div key={`item-${index}`} className="flex items-center text-xs font-medium text-slate-500">
            <span className="w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: entry.color }} />
            {entry.value}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col">
      <div className="text-center mb-4">
        <h3 className="text-slate-800 font-bold">Nutritional Info</h3>
        <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold">Per Serving</p>
      </div>
      
      <div className="h-48 w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={70}
              paddingAngle={4}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} cursor={false} />
            <Legend content={renderLegend} verticalAlign="bottom" />
          </PieChart>
        </ResponsiveContainer>
        
        {/* Centered Calories */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-6">
            <span className="text-2xl font-bold text-slate-800">{macros.calories}</span>
            <span className="text-[10px] text-slate-400 font-medium uppercase">Kcal</span>
        </div>
      </div>
    </div>
  );
};