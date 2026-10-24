import { 
  getTodayWater, 
  getWaterGoal, 
  getWeeklyWaterAnalytics, 
  getWaterStreak,
  getTodayWaterLogs
} from '@/actions/water';
import { getProfileData } from '@/actions/profile';
import { HydrationDashboard } from '@/components/features/water/HydrationDashboard';

export const metadata = {
  title: 'Water Tracking | Agent Baymax',
  description: 'Track your daily water intake and stay hydrated',
};

export default async function WaterPage() {
  // Fetch data in parallel on the server
  const [currentMl, goalMl, analyticsData, streak, todayLogs, profileData] = await Promise.all([
    getTodayWater(),
    getWaterGoal(),
    getWeeklyWaterAnalytics(),
    getWaterStreak(),
    getTodayWaterLogs(),
    getProfileData()
  ]);

  const profile = {
    fullName: profileData.profile?.full_name || undefined,
    age: profileData.profile?.age || undefined,
    heightCm: profileData.profile?.height_cm || undefined,
    gender: profileData.profile?.gender || undefined,
    activityLevel: profileData.profile?.activity_level || undefined,
    currentWeightKg: profileData.goals?.current_weight_kg || undefined,
    weightGoalKg: profileData.goals?.weight_goal_kg || undefined,
    goalType: profileData.goals?.goal_type || undefined,
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col space-y-2">
        <h2 className="text-3xl md:text-4xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
          Hydration Assistant
        </h2>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm md:text-base font-medium">
          Log water intake, view timing timelines, and read Baymax&apos;s personalized hydration plans.
        </p>
      </div>

      <HydrationDashboard 
        initialCurrentMl={currentMl}
        initialGoalMl={goalMl}
        initialLogs={todayLogs}
        initialStreak={streak}
        initialAnalytics={analyticsData}
        profile={profile}
      />
    </div>
  );
}
