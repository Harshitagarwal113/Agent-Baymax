'use server';

import { createClient, getAuthenticatedUser } from '@/lib/supabase/server';
import { cache } from 'react';

interface DashboardActivity {
  id: string;
  type: string;
  title: string;
  desc: string;
  imageUrl?: string;
  timestamp: number;
  time: string;
}

interface DashboardNutritionLog {
  calories: number;
  food_name: string;
  logged_at: string;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  meal_analysis?: {
    image_url?: string;
  } | {
    image_url?: string;
  }[] | null;
}

export const getDashboardData = cache(async () => {
  const user = await getAuthenticatedUser();
  if (!user) return { weeklyTrends: [], recentActivities: [] };

  const supabase = await createClient();

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  // Fetch water and nutrition in parallel
  const [waterRes, primaryResult] = await Promise.all([
    supabase
      .from('water_logs')
      .select('amount_ml, logged_at')
      .eq('user_id', user.id)
      .gte('logged_at', sevenDaysAgo.toISOString()),
    supabase
      .from('nutrition_logs')
      .select(`
        calories, food_name, logged_at, protein_g, carbs_g, fat_g,
        meal_analysis (
          image_url
        )
      `)
      .eq('user_id', user.id)
      .gte('logged_at', sevenDaysAgo.toISOString())
  ]);

  const waterData = waterRes.data;
  let nutritionData: DashboardNutritionLog[] | null = null;
    
  if (primaryResult.error) {
    console.warn("Retrying dashboard query without meal_analysis relation.");
    const fallbackResult = await supabase
      .from('nutrition_logs')
      .select('calories, food_name, logged_at, protein_g, carbs_g, fat_g')
      .eq('user_id', user.id)
      .gte('logged_at', sevenDaysAgo.toISOString());
    nutritionData = fallbackResult.data;
  } else {
    nutritionData = primaryResult.data;
  }

  // 1. Weekly Trends
  const dailyTotals: Record<string, { calories: number; water: number; protein: number; carbs: number; fat: number }> = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgo);
    d.setDate(d.getDate() + i);
    const dateStr = d.toLocaleDateString('en-US', { weekday: 'short' });
    dailyTotals[dateStr] = { calories: 0, water: 0, protein: 0, carbs: 0, fat: 0 };
  }

  if (waterData) {
    waterData.forEach(log => {
      const dateStr = new Date(log.logged_at).toLocaleDateString('en-US', { weekday: 'short' });
      if (dailyTotals[dateStr]) dailyTotals[dateStr].water += log.amount_ml;
    });
  }

  if (nutritionData) {
    nutritionData.forEach(log => {
      const dateStr = new Date(log.logged_at).toLocaleDateString('en-US', { weekday: 'short' });
      if (dailyTotals[dateStr]) {
        dailyTotals[dateStr].calories += log.calories;
        dailyTotals[dateStr].protein += Number(log.protein_g) || 0;
        dailyTotals[dateStr].carbs += Number(log.carbs_g) || 0;
        dailyTotals[dateStr].fat += Number(log.fat_g) || 0;
      }
    });
  }

  const weeklyTrends = Object.entries(dailyTotals).map(([name, data]) => ({
    name,
    calories: data.calories,
    water: data.water,
    protein: data.protein,
    carbs: data.carbs,
    fat: data.fat
  }));

  // 2. Recent Activities (last 5)
  const allActivities: DashboardActivity[] = [];
  
  if (waterData) {
    waterData.forEach(log => {
      allActivities.push({
        id: `water_${log.logged_at}`,
        type: 'water',
        title: 'Logged Water',
        desc: `${log.amount_ml} ml`,
        timestamp: new Date(log.logged_at).getTime(),
        time: new Date(log.logged_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
      });
    });
  }

  if (nutritionData) {
    nutritionData.forEach((log) => {
      const mealAnalysis = log.meal_analysis;
      const imageUrl = Array.isArray(mealAnalysis) 
        ? mealAnalysis[0]?.image_url 
        : mealAnalysis?.image_url;

      allActivities.push({
        id: `food_${log.logged_at}`,
        type: 'food',
        title: 'Logged Meal',
        desc: log.food_name,
        imageUrl: imageUrl || undefined,
        timestamp: new Date(log.logged_at).getTime(),
        time: new Date(log.logged_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
      });
    });
  }

  // Sort descending and take top 5
  allActivities.sort((a, b) => b.timestamp - a.timestamp);
  const recentActivities = allActivities.slice(0, 5);

  return { weeklyTrends, recentActivities };
});
