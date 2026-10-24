import { getProfileData } from '@/actions/profile';
import { createClient, getAuthenticatedUser } from '@/lib/supabase/server';
import { DietPlanner } from '@/components/features/diet/DietPlanner';

export const metadata = {
  title: 'AI Diet Planner | Agent Baymax',
  description: 'Generate your personalized meal plan',
};

export default async function DietPlannerPage() {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error('Unauthorized');
  const supabase = await createClient();

  const [profileData, memoriesRes] = await Promise.all([
    getProfileData(),
    supabase.from('agent_memory').select('*').eq('user_id', user.id)
  ]);

  const memories = memoriesRes.data || [];

  const profileSummary = {
    fullName: profileData.profile?.full_name || user.email,
    age: profileData.profile?.age || null,
    heightCm: profileData.profile?.height_cm || null,
    currentWeightKg: profileData.goals?.current_weight_kg || null,
    gender: profileData.profile?.gender || null,
    activityLevel: profileData.profile?.activity_level || null,
    goalType: profileData.goals?.goal_type || 'maintain',
    calorieTarget: profileData.goals?.daily_calorie_target || 2000,
    proteinTarget: profileData.goals?.daily_protein_target || 130,
    carbsTarget: profileData.goals?.daily_carbs_target || 220,
    fatTarget: profileData.goals?.daily_fat_target || 65,
    dietPreference: memories.filter(m => m.category === 'preferences').map(m => m.content).join(', ') || 'None',
    allergies: memories.filter(m => m.category === 'allergies').map(m => m.content).join(', ') || 'None',
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
      <DietPlanner initialProfile={profileSummary} />
    </div>
  );
}
