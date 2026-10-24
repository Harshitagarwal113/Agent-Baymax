import { getDailyNutrition } from '@/actions/nutrition';
import { getProfileData } from '@/actions/profile';
import { SmartMealLogger } from '@/components/features/nutrition/SmartMealLogger';
import { MacroOverview } from '@/components/features/nutrition/MacroOverview';
import { MealFeed, MealLog } from '@/components/features/nutrition/MealFeed';

export const metadata = {
  title: 'Nutrition Tracking | Agent Baymax',
  description: 'Track your meals with AI',
};

// Default fallback goals in case goals aren't set in user profile
const defaultGoals = {
  calories: 2200,
  protein: 150,
  carbs: 250,
  fat: 70
};

export default async function NutritionPage() {
  const [nutritionData, profileData] = await Promise.all([
    getDailyNutrition(),
    getProfileData()
  ]);

  const { logs, macros } = nutritionData;

  const goals = {
    calories: profileData.goals?.daily_calorie_target || defaultGoals.calories,
    protein: profileData.goals?.daily_protein_target || defaultGoals.protein,
    carbs: profileData.goals?.daily_carbs_target || defaultGoals.carbs,
    fat: profileData.goals?.daily_fat_target || defaultGoals.fat
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Nutrition Tracker</h2>
        <p className="text-muted-foreground">
          Log meals with text or photos, and let Baymax analyze the nutrition for you.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
        {/* Left Column: Input and Macros */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <SmartMealLogger />
          <MacroOverview macros={macros} goals={goals} />
        </div>

        {/* Right Column: Feed */}
        <div className="lg:col-span-2">
          <h3 className="text-xl font-bold tracking-tight mb-4 text-zinc-800 dark:text-zinc-200">
            Today&apos;s Meals
          </h3>
          <MealFeed logs={logs as MealLog[]} />
        </div>
      </div>
    </div>
  );
}
