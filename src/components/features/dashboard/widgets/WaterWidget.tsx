'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Droplet } from 'lucide-react';

interface WaterWidgetProps {
  currentMl: number;
  goalMl: number;
}

export function WaterWidget({ currentMl, goalMl }: WaterWidgetProps) {
  const percentage = Math.min((currentMl / goalMl) * 100, 100);
  const currentLiters = (currentMl / 1000).toFixed(1);
  const goalLiters = (goalMl / 1000).toFixed(1);
  
  return (
    <Card className="relative overflow-hidden border border-blue-100/60 dark:border-blue-950/20 bg-gradient-to-br from-blue-50/50 to-indigo-50/20 dark:from-zinc-900/60 dark:to-blue-950/10 shadow-sm hover:shadow-md transition-all duration-300 rounded-[2rem] p-2">
      <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 h-24 w-24 bg-blue-500/10 rounded-full blur-xl pointer-events-none" />
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
          Hydration Log
        </CardTitle>
        <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center">
          <Droplet className="h-4.5 w-4.5 text-blue-500 animate-bounce" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-black text-zinc-900 dark:text-zinc-50">{currentLiters}</span>
          <span className="text-sm font-medium text-zinc-500">/ {goalLiters} Liters ({currentMl} ml)</span>
        </div>
        
        <div className="space-y-2">
          <div className="h-3 w-full bg-blue-100/50 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div 
              style={{ width: `${percentage}%` }} 
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-1000 ease-out" 
            />
          </div>
          
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-blue-600 dark:text-blue-400">{Math.round(percentage)}% filled</span>
            <span className="text-zinc-500 font-medium">
              {goalMl - currentMl > 0 
                ? `${(goalMl - currentMl).toLocaleString()} ml remaining` 
                : 'Daily goal completed! 💧'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
