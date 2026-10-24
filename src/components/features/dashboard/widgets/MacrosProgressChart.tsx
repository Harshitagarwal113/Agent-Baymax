'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { motion } from 'framer-motion';

interface MacrosProgressChartProps {
  data: {
    name: string;
    protein?: number;
    carbs?: number;
    fat?: number;
  }[];
  goals: {
    protein: number;
    carbs: number;
    fat: number;
  };
}

const getColor = (pct: number) => {
  if (pct < 30) return '#ef4444'; // red-500
  if (pct < 70) return '#f97316'; // orange-500
  if (pct <= 100) return '#22c55e'; // green-500
  return '#10b981'; // emerald-500 for over 100%
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: {
      totalMacros: number;
      completionPct: number;
      protein: number;
      carbs: number;
      fat: number;
    };
  }>;
  label?: string;
  totalGoal: number;
}

const CustomTooltip = ({ active, payload, label, totalGoal }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md p-3 rounded-lg border border-zinc-200/50 dark:border-zinc-800/50 shadow-xl">
        <p className="font-bold text-zinc-900 dark:text-zinc-100">{label}</p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
          Total Macros: <span className="font-semibold text-zinc-900 dark:text-zinc-100">{data.totalMacros}g</span> / {totalGoal}g
        </p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Completion: <span className="font-semibold" style={{ color: getColor(data.completionPct) }}>{data.completionPct}%</span>
        </p>
        <div className="mt-2 text-xs text-zinc-500 flex gap-2">
          <span>P: {data.protein}g</span>
          <span>C: {data.carbs}g</span>
          <span>F: {data.fat}g</span>
        </div>
      </div>
    );
  }
  return null;
};

export function MacrosProgressChart({ data, goals }: MacrosProgressChartProps) {
  const totalGoal = (goals.protein || 0) + (goals.carbs || 0) + (goals.fat || 0);

  const chartData = data.map(day => {
    const totalConsumed = (day.protein || 0) + (day.carbs || 0) + (day.fat || 0);
    const completionPct = totalGoal > 0 ? (totalConsumed / totalGoal) * 100 : 0;
    
    return {
      name: day.name,
      totalMacros: Math.round(totalConsumed),
      completionPct: Math.round(completionPct),
      protein: Math.round(day.protein || 0),
      carbs: Math.round(day.carbs || 0),
      fat: Math.round(day.fat || 0),
    };
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 120, damping: 15 }}
      className="col-span-full lg:col-span-3 bg-white/40 dark:bg-zinc-900/30 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/40 p-6 rounded-3xl shadow-sm"
    >
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-lg flex items-center gap-2">
            Macro Completion Progress
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Percentage of daily macro goals achieved</p>
        </div>
        
        {/* Legend for Color Scaling */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 text-xs font-medium text-zinc-500 dark:text-zinc-400 bg-white/50 dark:bg-zinc-800/50 px-3 py-2 rounded-lg">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
            &lt; 30%
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
            30% - 70%
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
            &ge; 70%
          </div>
        </div>
      </div>
      
      <div className="h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-zinc-200 dark:text-zinc-800" />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 12 }} 
              className="text-zinc-500 dark:text-zinc-400"
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 12 }}
              className="text-zinc-500 dark:text-zinc-400"
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip cursor={{ fill: 'transparent' }} content={<CustomTooltip totalGoal={totalGoal} />} />
            <Bar dataKey="completionPct" radius={[4, 4, 4, 4]} maxBarSize={40}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColor(entry.completionPct)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
