'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, ReferenceLine } from 'recharts';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

interface WeeklyTrendsChartProps {
  data: { name: string; calories: number; water: number }[];
  calorieGoal?: number;
  waterGoal?: number;
  currentCalPct?: number;
  goalType?: string;
}

export function WeeklyTrendsChart({ data, calorieGoal, waterGoal, currentCalPct = 0, goalType = 'maintain' }: WeeklyTrendsChartProps) {
  
  // Logic for alert bar
  let alertMessage = "";
  let alertStyle = ""; 
  let Icon = Info;

  if (currentCalPct === 0) {
    alertMessage = "Log your meals to see how they impact your " + goalType.replace('_', ' ') + " journey.";
    alertStyle = "bg-blue-50/50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800";
    Icon = Info;
  } else if (currentCalPct < 80) {
    alertStyle = "bg-orange-50/50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800";
    Icon = AlertCircle;
    if (goalType === 'lose_weight') {
      alertMessage = "Severe deficit. While you may lose weight quickly, this can slow metabolism and cause muscle loss.";
    } else if (goalType === 'build_muscle') {
      alertMessage = "Under-eating. Building muscle requires a caloric surplus. You risk losing muscle mass.";
    } else {
      alertMessage = "Under maintenance. Prolonged deficits lead to unintended weight loss and fatigue.";
    }
  } else if (currentCalPct > 110) {
    alertStyle = "bg-red-50/50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800";
    Icon = AlertCircle;
    if (goalType === 'lose_weight') {
      alertMessage = "Over target. Consistent surpluses will halt weight loss and may lead to fat gain.";
    } else if (goalType === 'build_muscle') {
      alertMessage = "Excessive surplus. This fuels muscle but may result in unwanted fat gain.";
    } else {
      alertMessage = "Over maintenance. This surplus could lead to gradual weight gain over time.";
    }
  } else {
    alertStyle = "bg-green-50/50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800";
    Icon = CheckCircle2;
    if (goalType === 'lose_weight') {
      alertMessage = "Perfect deficit! Consistency here will lead to steady, healthy weight loss.";
    } else if (goalType === 'build_muscle') {
      alertMessage = "Great job! Optimal surplus to fuel muscle growth without excess fat.";
    } else {
      alertMessage = "Spot on! Hitting maintenance to keep your current weight stable.";
    }
  }

  return (
    <Card className="col-span-1 md:col-span-2 lg:col-span-3 glass-card border-none hover:-translate-y-1 transition-all duration-300 bg-white/40 dark:bg-zinc-900/30 backdrop-blur-xl">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
              Weekly Trends
            </CardTitle>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Calories vs Hydration over 7 days</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Dynamic Journey Alert Bar */}
        <div className={`mb-6 flex items-start gap-3 p-3 rounded-xl border ${alertStyle} shadow-sm backdrop-blur-sm`}>
          <Icon className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="text-sm font-medium leading-relaxed">
            {alertMessage}
          </div>
        </div>

        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} dy={10} />
              <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
              <Tooltip 
                cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                contentStyle={{ borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
              <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#888' }} />
              
              {calorieGoal && (
                <ReferenceLine y={calorieGoal} stroke="#f97316" strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: 'Cal Goal', fill: '#f97316', fontSize: 10 }} />
              )}
              {waterGoal && (
                <ReferenceLine y={waterGoal} stroke="#3b82f6" strokeDasharray="3 3" label={{ position: 'insideTopRight', value: 'Water Goal', fill: '#3b82f6', fontSize: 10 }} />
              )}
              
              <Bar dataKey="calories" name="Calories (kcal)" fill="#f97316" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Bar dataKey="water" name="Water (ml)" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
