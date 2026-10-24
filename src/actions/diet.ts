'use server';

import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const dietPlanSchema = z.object({
  meals: z.array(z.object({
    meal_type: z.enum(['breakfast', 'morning_snack', 'lunch', 'evening_snack', 'dinner', 'bedtime_snack']),
    title: z.string().describe('Concise name of the meal, e.g. "Oatmeal with Blueberries & Chia Seeds"'),
    time: z.string().describe('Suggested consumption time, e.g. "08:00 AM"'),
    calories: z.number().describe('Estimated calories in kcal'),
    protein_g: z.number().describe('Protein in grams'),
    carbs_g: z.number().describe('Carbohydrates in grams'),
    fat_g: z.number().describe('Fat in grams'),
    why_chosen: z.string().describe('A short, friendly sentence explaining why Baymax chose this meal (empathetic, helpful tone)'),
    items: z.array(z.object({
      name: z.string().describe('Item name, e.g. "Rolled Oats"'),
      portion: z.string().describe('Portion estimate, e.g. "50g" or "1 cup"')
    })).describe('List of individual food items and their portions for this meal')
  })),
  nutrition_summary: z.object({
    total_calories: z.number(),
    total_protein_g: z.number(),
    total_carbs_g: z.number(),
    total_fat_g: z.number(),
    total_fiber_g: z.number().describe('Estimated total fiber in grams'),
    water_recommendation_ml: z.number().describe('Recommended water intake in ml'),
    goal_match_percentage: z.number().min(0).max(100).describe('How well this plan matches the user targets (e.g. 95 to 100)')
  }),
  ai_notes: z.string().describe('Personalized, warm, encouraging explanation from Baymax regarding the structure and health benefits of this diet plan.')
});

export type DietPlanResult = z.infer<typeof dietPlanSchema>;

export async function generateDietPlanAction(dietPreference: 'veg' | 'non-veg' | 'mix', variationSalt?: string): Promise<DietPlanResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  // Fetch profile, goals, and memories
  const [profileRes, goalRes, memoryRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase
      .from('health_goals')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from('agent_memory').select('*').eq('user_id', user.id)
  ]);

  const profile = profileRes.data;
  const goals = goalRes.data;
  const memories = memoryRes.data || [];

  if (!profile) {
    throw new Error('Please set up your profile metrics first.');
  }

  // Construct context
  const calories = goals?.daily_calorie_target || 2000;
  const protein = goals?.daily_protein_target || 130;
  const carbs = goals?.daily_carbs_target || 220;
  const fat = goals?.daily_fat_target || 65;
  const goalType = goals?.goal_type || 'maintain';

  const allergies = memories.filter(m => m.category === 'allergies').map(m => m.content).join(', ') || 'None';
  const preferences = memories.filter(m => m.category === 'preferences').map(m => m.content).join(', ') || 'None';
  const medicalConditions = memories.filter(m => m.category === 'medical_conditions').map(m => m.content).join(', ') || 'None';

  const dietPrefStr = dietPreference === 'veg' 
    ? 'Strictly Vegetarian (MUST be 100% vegetarian. NO meat, NO chicken, NO fish, NO beef, NO eggs. Dairy products are allowed).' 
    : dietPreference === 'non-veg' 
      ? 'Non-Vegetarian (Contains chicken, eggs, meat, fish, etc. Limit/avoid plain vegetarian meals where possible, optimize for protein from non-veg sources).' 
      : 'Mixed / Flexitarian (Can contain both vegetarian and non-vegetarian components, balanced naturally).';

  const prompt = `You are Baymax, a personal healthcare companion. Your task is to generate a personalized, practical, and highly realistic daily diet plan for the user based on their profile and goals.

User Profile:
- Name/Email: ${profile.full_name || user.email}
- Age: ${profile.age || 'Not provided'}
- Height: ${profile.height_cm ? `${profile.height_cm} cm` : 'Not provided'}
- Current Weight: ${goals?.current_weight_kg ? `${goals.current_weight_kg} kg` : 'Not provided'}
- Target Weight: ${goals?.weight_goal_kg ? `${goals.weight_goal_kg} kg` : 'Not provided'}
- Gender: ${profile.gender || 'Not provided'}
- Activity Level: ${profile.activity_level || 'Not provided'}
- Health Goal: ${goalType} (lose_weight, maintain, build_muscle)
- Target Daily Calories: ${calories} kcal
- Target Macros: Protein ${protein}g, Carbs ${carbs}g, Fat ${fat}g
- Allergies / Restrictions: ${allergies}
- Dietary Preferences (STRICT CONSTRAINT): ${dietPrefStr} (Other preferences: ${preferences})
- Medical Conditions: ${medicalConditions}

Plan Requirements:
1. Suggest practical, locally available, and affordable food items. Avoid exotic, extremely expensive, or impossible foods.
2. The total calories and macros of the suggested meals must closely align with the user's targets (within 5-10% deviation).
3. The plan must contain a set of meals: Breakfast, Morning Snack (optional), Lunch, Evening Snack (optional), Dinner, and Bedtime Snack (optional).
4. For each meal, specify individual food items and estimated portions, estimated calories, and macro values.
5. Provide a warm, friendly, empathetic explanation in 'why_chosen' for each meal, writing in the style of Baymax.
6. In 'ai_notes', write a short general summary of the day's diet plan, optimizing for the user's specific goals.
${variationSalt ? `\nMake this plan slightly different from standard suggestions to offer a fresh alternative (use variation key: ${variationSalt}). Ensure it is completely unique while still fitting the targets.` : ''}
`;

  try {
    const { object } = await generateObject({
      model: google('models/gemma-4-26b-a4b-it'),
      schema: dietPlanSchema,
      system: `You are Baymax, a personal healthcare companion. You generate structured, practical, and highly personalized diet plans that align with the user's demographic properties, macro targets, preferences, and allergies. Your tone is warm, friendly, calm, and reassuring. Always return a valid JSON object matching the requested schema.`,
      prompt: prompt,
      temperature: 0.8
    });
    return object;
  } catch (primaryErr) {
    console.warn('[Diet] Primary model Gemma 4 26B failed, falling back to Gemini 3.5 Flash Lite:', primaryErr);
    const { object } = await generateObject({
      model: google('models/gemini-3.5-flash-lite'),
      schema: dietPlanSchema,
      system: `You are Baymax, a personal healthcare companion. You generate structured, practical, and highly personalized diet plans that align with the user's demographic properties, macro targets, preferences, and allergies. Your tone is warm, friendly, calm, and reassuring.`,
      prompt: prompt,
      temperature: 0.8
    });
    return object;
  }
}
