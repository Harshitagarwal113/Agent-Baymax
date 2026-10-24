import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface MacroOverviewProps {
  macros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  goals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

export function MacroOverview({ macros, goals }: MacroOverviewProps) {
  const getPercentage = (current: number, goal: number) => Math.min((current / goal) * 100, 100);

  return (
    <Card className="border border-zinc-200/50 dark:border-zinc-800/50 bg-white/55 dark:bg-zinc-900/30 backdrop-blur-xl shadow-sm rounded-[2.5rem] p-2">
      <CardHeader>
        <CardTitle className="text-lg font-bold text-zinc-800 dark:text-zinc-200">
          Today&apos;s Macros
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Calories */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Calories</span>
            <span className="text-zinc-500">{macros.calories} / {goals.calories} kcal</span>
          </div>
          <Progress value={getPercentage(macros.calories, goals.calories)} className="h-2" indicatorColor="bg-orange-500" />
        </div>

        {/* Protein */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Protein</span>
            <span className="text-zinc-500">{Math.round(macros.protein)}g / {goals.protein}g</span>
          </div>
          <Progress value={getPercentage(macros.protein, goals.protein)} className="h-2 bg-blue-100" indicatorColor="bg-blue-500" />
        </div>

        {/* Carbs */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Carbs</span>
            <span className="text-zinc-500">{Math.round(macros.carbs)}g / {goals.carbs}g</span>
          </div>
          <Progress value={getPercentage(macros.carbs, goals.carbs)} className="h-2 bg-purple-100" indicatorColor="bg-purple-500" />
        </div>

        {/* Fat */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Fat</span>
            <span className="text-zinc-500">{Math.round(macros.fat)}g / {goals.fat}g</span>
          </div>
          <Progress value={getPercentage(macros.fat, goals.fat)} className="h-2 bg-yellow-100" indicatorColor="bg-yellow-500" />
        </div>
      </CardContent>
    </Card>
  );
}
