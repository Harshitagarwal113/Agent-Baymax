'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Flame } from 'lucide-react';

interface CalorieWidgetProps {
  current: number;
  goal: number;
}

export function CalorieWidget({ current, goal }: CalorieWidgetProps) {
  const percentage = Math.min((current / goal) * 100, 100);
  
  return (
    <Card className="relative overflow-hidden border border-orange-100/60 dark:border-orange-950/20 bg-gradient-to-br from-orange-50/50 to-red-50/20 dark:from-zinc-900/60 dark:to-orange-950/10 shadow-sm hover:shadow-md transition-all duration-300 rounded-[2rem] p-2">
      <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 h-24 w-24 bg-orange-500/10 rounded-full blur-xl pointer-events-none" />
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-400">
          Caloric Balance
        </CardTitle>
        <div className="h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-950/40 flex items-center justify-center">
          <Flame className="h-4.5 w-4.5 text-orange-500 animate-pulse" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-black text-zinc-900 dark:text-zinc-50">{current.toLocaleString()}</span>
          <span className="text-sm font-medium text-zinc-500">/ {goal.toLocaleString()} kcal</span>
        </div>
        
        <div className="space-y-2">
          <div className="h-3 w-full bg-orange-100/50 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div 
              style={{ width: `${percentage}%` }} 
              className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all duration-1000 ease-out" 
            />
          </div>
          
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-orange-600 dark:text-orange-400">{Math.round(percentage)}% filled</span>
            <span className="text-zinc-500 font-medium">
              {goal - current > 0 
                ? `${(goal - current).toLocaleString()} kcal remaining` 
                : 'Daily goal completed! 🥳'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
