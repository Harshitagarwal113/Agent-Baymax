import { Dashboard } from '@/components/features/dashboard/Dashboard';
import { getTodayWater, getWaterGoal } from '@/actions/water';
import { getDailyNutrition } from '@/actions/nutrition';
import { getDashboardData } from '@/actions/dashboard';
import { getProfileData } from '@/actions/profile';

export const metadata = {
  title: 'Dashboard | Agent Baymax',
  description: 'Your personal health dashboard',
};

export default async function DashboardPage() {
  const [currentMl, goalMl, nutrition, dashboardData, profileData] = await Promise.all([
    getTodayWater(),
    getWaterGoal(),
    getDailyNutrition(),
    getDashboardData(),
    getProfileData()
  ]);

  const calorieGoal = profileData.goals?.daily_calorie_target || 2200;
  const macroGoals = {
    protein: profileData.goals?.daily_protein_target || 150,
    carbs: profileData.goals?.daily_carbs_target || 200,
    fat: profileData.goals?.daily_fat_target || 70,
  };

  return <Dashboard 
    userName={profileData.profile?.full_name || undefined}
    water={{ current: currentMl, goal: goalMl }} 
    calories={{ current: nutrition.macros.calories, goal: calorieGoal }}
    macroGoals={macroGoals}
    goalType={profileData.goals?.goal_type || 'maintain'}
    weeklyTrends={dashboardData.weeklyTrends as { name: string; calories: number; water: number; protein?: number; carbs?: number; fat?: number; }[]}
    recentActivities={dashboardData.recentActivities}
    currentWeight={profileData.goals?.current_weight_kg || undefined}
    targetWeight={profileData.goals?.weight_goal_kg || undefined}
    startingWeight={profileData.goals?.starting_weight_kg || undefined}
    aiAnalysis={profileData.goals?.ai_analysis || undefined}
    estimatedWeeks={profileData.goals?.estimated_weeks || undefined}
    heightCm={profileData.profile?.height_cm || undefined}
  />;
}
