'use server';

import { createClient, getAuthenticatedUser, getUserProfile } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { cache } from 'react';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export interface ProfileUpdateData {
  full_name: string;
  age: number;
  height_cm: number;
  gender: 'male' | 'female' | 'other';
  activity_level: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extra_active';
  current_weight_kg: number;
  weight_goal_kg: number;
  goal_type: 'lose_weight' | 'maintain' | 'build_muscle';
  daily_water_target_ml: number;
}

export const getProfileData = cache(async () => {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error('Unauthorized');

  const supabase = await createClient();
  const [profile, goalRes] = await Promise.all([
    getUserProfile(),
    supabase
      .from('health_goals')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
  ]);

  return {
    profile,
    goals: goalRes.data
  };
});

export async function updateProfile(data: ProfileUpdateData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  // Step 3 & 4: Calculate Weight Difference & Validate Goal Consistency
  const weightDifference = Number((data.weight_goal_kg - data.current_weight_kg).toFixed(1));
  
  if (data.goal_type === 'lose_weight' && weightDifference > 0) {
    throw new Error("The selected goal does not match your target weight. Please update either your goal or target weight.");
  }
  
  if (data.goal_type === 'build_muscle' && weightDifference < 0) {
    throw new Error("The selected goal does not match your target weight. Please update either your goal or target weight.");
  }

  // Step 1: Calculate BMR using the Mifflin-St Jeor Equation
  let bmr = 0;
  if (data.gender === 'male') {
    bmr = 10 * data.current_weight_kg + 6.25 * data.height_cm - 5 * data.age + 5;
  } else if (data.gender === 'female') {
    bmr = 10 * data.current_weight_kg + 6.25 * data.height_cm - 5 * data.age - 161;
  } else {
    const bmrMale = 10 * data.current_weight_kg + 6.25 * data.height_cm - 5 * data.age + 5;
    const bmrFemale = 10 * data.current_weight_kg + 6.25 * data.height_cm - 5 * data.age - 161;
    bmr = (bmrMale + bmrFemale) / 2;
  }

  // Step 2: Calculate TDEE using selected activity multiplier
  const activityMultipliers: Record<string, number> = {
    sedentary: 1.2,
    lightly_active: 1.375,
    moderately_active: 1.55,
    very_active: 1.725,
    extra_active: 1.9
  };
  const tdee = bmr * (activityMultipliers[data.activity_level] || 1.2);

  // Step 5: Determine Recommended Calorie Adjustment
  const heightM = data.height_cm / 100;
  const bmi = data.current_weight_kg / (heightM * heightM);
  const diffMagnitude = Math.abs(weightDifference);
  
  let calorieAdjustment = 0;
  
  if (data.goal_type === 'lose_weight') {
    // Determine deficit based on total weight to lose and BMI
    if (diffMagnitude < 5) {
      calorieAdjustment = -350; // Small deficit
    } else if (diffMagnitude > 15) {
      calorieAdjustment = -600; // Larger deficit
    } else {
      calorieAdjustment = -500; // Standard deficit
    }
    
    // Adjust based on BMI obesity levels
    if (bmi > 30 && diffMagnitude > 15) {
      calorieAdjustment = -700; // Safe larger deficit
    } else if (bmi < 22) {
      calorieAdjustment = Math.max(calorieAdjustment, -300); // Keep deficit smaller if starting lean
    }
  } else if (data.goal_type === 'build_muscle') {
    // Determine surplus based on target and current weight
    if (diffMagnitude < 5) {
      calorieAdjustment = 200; // Small surplus
    } else {
      calorieAdjustment = 350; // Larger surplus
    }
  } else {
    // Maintain goal
    calorieAdjustment = 0;
  }

  let targetCalories = Math.round(tdee + calorieAdjustment);
  // Ensure medically safe minimum of 1200 kcal
  targetCalories = Math.max(targetCalories, 1200);

  // Step 6: Generate Dynamic Macro Targets
  let proteinRatio = 1.8;
  let fatPercent = 0.25;

  if (data.goal_type === 'lose_weight') {
    proteinRatio = 2.0;    // 2.0g/kg to preserve lean mass in deficit
    fatPercent = 0.20;     // 20% of calories from fat
  } else if (data.goal_type === 'build_muscle') {
    proteinRatio = 2.2;    // 2.2g/kg to support hypertrophy in surplus
    fatPercent = 0.25;     // 25% of calories from fat
  } else {
    proteinRatio = 1.8;    // 1.8g/kg for maintenance
    fatPercent = 0.25;     // 25% of calories from fat
  }

  const proteinTarget = Math.round(data.current_weight_kg * proteinRatio);
  const fatTarget = Math.round((targetCalories * fatPercent) / 9);
  
  // Carbs target gets the remainder
  const remainingCaloriesForCarbs = targetCalories - (proteinTarget * 4) - (fatTarget * 9);
  const carbsTarget = Math.max(Math.round(remainingCaloriesForCarbs / 4), 50); // Safe minimum of 50g carbs

  // Step 7: Estimate Goal Timeline
  let estimatedWeeks = '0 weeks';
  if (data.goal_type === 'lose_weight') {
    // 0.5kg to 1.0kg per week progress
    const minWeeks = Math.max(Math.round(diffMagnitude / 1.0), 1);
    const maxWeeks = Math.max(Math.round(diffMagnitude / 0.5), 1);
    estimatedWeeks = minWeeks === maxWeeks ? `${minWeeks} weeks` : `${minWeeks}–${maxWeeks} weeks`;
  } else if (data.goal_type === 'build_muscle' && diffMagnitude > 0) {
    // 0.25kg to 0.5kg per week progress
    const minWeeks = Math.max(Math.round(diffMagnitude / 0.5), 1);
    const maxWeeks = Math.max(Math.round(diffMagnitude / 0.25), 1);
    estimatedWeeks = minWeeks === maxWeeks ? `${minWeeks} weeks` : `${minWeeks}–${maxWeeks} weeks`;
  } else {
    estimatedWeeks = 'Active';
  }

  // Step 8: Generate AI Health Analysis from Gemini
  let aiAnalysis = `Based on your profile, a daily calorie target of ${targetCalories} kcal aligns with your goal.`;
  try {
    const prompt = `You are Baymax, a personal healthcare companion. Write a warm, encouraging, clinical, and personalized health summary for the user's fitness goal.

User profile details:
- Name: ${data.full_name}
- Age: ${data.age}
- Height: ${data.height_cm} cm
- Current Weight: ${data.current_weight_kg} kg
- Target Weight: ${data.weight_goal_kg} kg
- Weight Difference: ${weightDifference} kg (negative means loss, positive means gain)
- Goal: ${data.goal_type}
- Daily Calories: ${targetCalories} kcal (TDEE is ${Math.round(tdee)} kcal)
- Daily Protein: ${proteinTarget}g
- Daily Carbs: ${carbsTarget}g
- Daily Fat: ${fatTarget}g
- Estimated Timeline: ${estimatedWeeks}

Write a short summary (exactly 3-4 sentences) addressing the user directly in the style of Baymax (calm, caring, clinically sound, empathetic, saying things like "Hello Harshit, I am Baymax, your personal healthcare companion..."). Focus on the safety of the deficit/surplus, preservation of lean mass, and dynamic coaching advice.`;

    let textResult = '';
    try {
      const { text } = await generateText({
        model: google('models/gemma-4-26b-a4b-it'),
        prompt: prompt,
      });
      textResult = text;
    } catch (gemmaErr) {
      console.warn('[Profile] Primary model Gemma 4 26B failed, falling back to Gemini 3.5 Flash Lite:', gemmaErr);
      const { text } = await generateText({
        model: google('models/gemini-3.5-flash-lite'),
        prompt: prompt,
      });
      textResult = text;
    }
    
    if (textResult) {
      aiAnalysis = textResult.trim();
    }
  } catch (err) {
    console.error("Failed to generate AI analysis:", err);
  }

  // Fetch current starting weight to preserve it if it exists
  const { data: existingGoal } = await supabase
    .from('health_goals')
    .select('id, starting_weight_kg')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // If starting weight is not set, initialize it with current weight
  const startingWeight = existingGoal?.starting_weight_kg || data.current_weight_kg;

  // 5. Database Updates
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      full_name: data.full_name,
      age: data.age,
      height_cm: data.height_cm,
      gender: data.gender,
      activity_level: data.activity_level
    })
    .eq('id', user.id);

  if (profileError) {
    console.error('Profile update error:', profileError);
    throw new Error('Failed to update profile: ' + profileError.message);
  }

  const baseGoalData = {
    current_weight_kg: data.current_weight_kg,
    weight_goal_kg: data.weight_goal_kg,
    goal_type: data.goal_type,
    daily_calorie_target: targetCalories,
    daily_protein_target: proteinTarget,
    daily_carbs_target: carbsTarget,
    daily_fat_target: fatTarget,
    daily_water_target_ml: data.daily_water_target_ml,
    updated_at: new Date().toISOString()
  };

  const extendedGoalData = {
    ...baseGoalData,
    starting_weight_kg: startingWeight,
    ai_analysis: aiAnalysis,
    estimated_weeks: estimatedWeeks
  };

  // Resilient write with database schema fallback
  if (existingGoal) {
    let { error: goalsError } = await supabase
      .from('health_goals')
      .update(extendedGoalData)
      .eq('user_id', user.id);
      
    // Fallback if the database migration hasn't been run yet (missing columns)
    if (goalsError && goalsError.message.includes('starting_weight_kg')) {
      console.warn("Analytics columns not found in database. Retrying update with base schema.");
      const fallbackResult = await supabase
        .from('health_goals')
        .update(baseGoalData)
        .eq('user_id', user.id);
      goalsError = fallbackResult.error;
    }

    if (goalsError) {
      console.error('Health goals update error:', goalsError);
      throw new Error('Failed to update health goals: ' + goalsError.message);
    }
  } else {
    let { error: goalsError } = await supabase
      .from('health_goals')
      .insert({
        user_id: user.id,
        ...extendedGoalData
      });
      
    // Fallback if the database migration hasn't been run yet (missing columns)
    if (goalsError && goalsError.message.includes('starting_weight_kg')) {
      console.warn("Analytics columns not found in database. Retrying insert with base schema.");
      const fallbackResult = await supabase
        .from('health_goals')
        .insert({
          user_id: user.id,
          ...baseGoalData
        });
      goalsError = fallbackResult.error;
    }

    if (goalsError) {
      console.error('Health goals insert error:', goalsError);
      throw new Error('Failed to create health goals: ' + goalsError.message);
    }
  }

  revalidatePath('/profile');
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/nutrition');

  return { success: true };
}
