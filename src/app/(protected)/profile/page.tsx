import { getProfileData } from '@/actions/profile';
import { ProfileForm } from '@/components/features/profile/ProfileForm';

export const metadata = {
  title: 'Profile Settings | Agent Baymax',
  description: 'Manage your physical profile and fitness goals',
};

export default async function ProfilePage() {
  const initialData = await getProfileData();

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 max-w-5xl mx-auto w-full">
      <div className="flex flex-col space-y-2 mb-8">
        <h2 className="text-3xl font-bold tracking-tight">Profile & Goals</h2>
        <p className="text-muted-foreground">
          Manage your physical metrics. We use these to automatically calculate your optimal nutrition targets.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <ProfileForm initialData={initialData} />
        </div>
        
        <div className="space-y-6">
          <div className="bg-zinc-50 dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <h3 className="font-bold text-lg mb-4 text-zinc-900 dark:text-zinc-100">Your Current Targets</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-zinc-200 dark:border-zinc-800">
                <span className="text-zinc-600 dark:text-zinc-400 font-medium">Daily Calories</span>
                <span className="font-bold text-orange-600 dark:text-orange-400 text-lg">
                  {initialData.goals?.daily_calorie_target || 0} kcal
                </span>
              </div>
              <div className="flex justify-between items-center pb-2">
                <span className="text-zinc-600 dark:text-zinc-400">Protein</span>
                <span className="font-semibold">{initialData.goals?.daily_protein_target || 0}g</span>
              </div>
              <div className="flex justify-between items-center pb-2">
                <span className="text-zinc-600 dark:text-zinc-400">Carbs</span>
                <span className="font-semibold">{initialData.goals?.daily_carbs_target || 0}g</span>
              </div>
              <div className="flex justify-between items-center pb-2">
                <span className="text-zinc-600 dark:text-zinc-400">Fat</span>
                <span className="font-semibold">{initialData.goals?.daily_fat_target || 0}g</span>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-950/30 p-6 rounded-xl border border-blue-100 dark:border-blue-900">
            <h4 className="font-bold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
              Baymax Tip
            </h4>
            <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
              When you update your weight, height, or activity level, your Basal Metabolic Rate (BMR) changes. 
              I will automatically recalculate your recommended daily targets to keep you on track for your goal!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
