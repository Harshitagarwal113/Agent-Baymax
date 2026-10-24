'use server';

import { createClient, getAuthenticatedUser, getUserProfile } from '@/lib/supabase/server';
import { analyzeMeal } from '@/lib/gemini/nutrition';
import { revalidatePath } from 'next/cache';
import { cache } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { checkRateLimit, expensiveRateLimiter } from '@/lib/ratelimit';

export async function logMealAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Unauthorized');

  // Rate Limiting by User ID to prevent spamming expensive multimodal Gemini vision analysis
  const isAllowed = await checkRateLimit(`rl_nutrition_${user.id}`, expensiveRateLimiter);
  if (!isAllowed) {
    throw new Error('Too many requests. Please wait a minute before logging another meal.');
  }

  const text = formData.get('text') as string | null;
  const image = formData.get('image') as File | null;
  const mealType = (formData.get('mealType') as string) || 'snack';

  if (!text && (!image || image.size === 0)) {
    throw new Error('Please provide a description or an image of your meal.');
  }

  let imageBuffer: Buffer | undefined;
  let mimeType: string | undefined;
  let imageUrl: string | undefined;

  // 1. Process Image if exists
  if (image && image.size > 0) {
    // Validate image file size (max 5MB)
    const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
    if (image.size > MAX_IMAGE_SIZE) {
      throw new Error('Image size must be less than 5MB.');
    }

    // Validate image MIME type to prevent malicious uploads
    const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!ALLOWED_IMAGE_TYPES.includes(image.type)) {
      throw new Error(`Invalid file type: "${image.type}". Only JPEG, PNG, WEBP, and GIF images are allowed.`);
    }

    const arrayBuffer = await image.arrayBuffer();
    imageBuffer = Buffer.from(arrayBuffer);
    mimeType = image.type;

    // Upload to Supabase Storage
    const ext = image.name.split('.').pop() || 'jpg';
    const filename = `${user.id}/${uuidv4()}.${ext}`;
    
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('food-images')
      .upload(filename, imageBuffer, {
        contentType: mimeType,
        upsert: false
      });

    if (uploadError) {
      console.error('Failed to upload image:', uploadError);
      // We can optionally proceed without the image URL, but let's log it
    } else if (uploadData) {
      // Get public URL
      const { data: { publicUrl } } = supabase
        .storage
        .from('food-images')
        .getPublicUrl(filename);
        
      imageUrl = publicUrl;
    }
  }

  // 1.5 Fetch user profile, health goals, and agent memories for personalized AI advice
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

  let profileContext = '';
  if (profile || goals || memories.length > 0) {
    profileContext = `User Profile details:
- Full Name: ${profile?.full_name || 'Not provided'}
- Age: ${profile?.age || 'Not provided'}
- Height: ${profile?.height_cm ? `${profile.height_cm} cm` : 'Not provided'}
- Gender: ${profile?.gender || 'Not provided'}
- Activity Level: ${profile?.activity_level || 'Not provided'}
- Goal: ${goals?.goal_type || 'maintain'}
- Daily Calorie Target: ${goals?.daily_calorie_target || 'Not specified'} kcal
- Daily Protein Target: ${goals?.daily_protein_target || 'Not specified'}g
- Daily Carbs Target: ${goals?.daily_carbs_target || 'Not specified'}g
- Daily Fat Target: ${goals?.daily_fat_target || 'Not specified'}g
`;

    const allergies = memories.filter(m => m.category === 'allergies');
    if (allergies.length > 0) {
      profileContext += `\nAllergies/Restrictions:\n${allergies.map(a => `- ${a.content}`).join('\n')}\n`;
    }

    const preferences = memories.filter(m => m.category === 'preferences');
    if (preferences.length > 0) {
      profileContext += `\nDietary Preferences:\n${preferences.map(p => `- ${p.content}`).join('\n')}\n`;
    }
  }

  // 2. Analyze Meal using Gemini
  const analysis = await analyzeMeal(text || undefined, imageBuffer, mimeType, profileContext);

  // 3. Save to nutrition_logs
  const { data: logData, error: logError } = await supabase
    .from('nutrition_logs')
    .insert({
      user_id: user.id,
      meal_type: mealType,
      food_name: analysis.food_name,
      serving_size: analysis.serving_size,
      calories: analysis.calories,
      protein_g: analysis.protein_g,
      carbs_g: analysis.carbs_g,
      fat_g: analysis.fat_g
    })
    .select('id')
    .single();

  if (logError || !logData) {
    throw new Error('Failed to save nutrition log: ' + (logError?.message || 'Unknown error'));
  }

  // 4. Save to meal_analysis with resilient fallback for pending migrations
  let { error: analysisError } = await supabase
    .from('meal_analysis')
    .insert({
      nutrition_log_id: logData.id,
      user_id: user.id,
      health_score: analysis.health_score,
      ai_feedback: analysis.ai_feedback,
      image_url: imageUrl,
      detected_items: analysis.detected_items,
      confidence: analysis.confidence,
      confidence_explanation: analysis.confidence_explanation
    });

  if (analysisError && analysisError.message.includes('detected_items')) {
    console.warn("Detected items column not found. Retrying meal_analysis insert with base columns.");
    const fallbackResult = await supabase
      .from('meal_analysis')
      .insert({
        nutrition_log_id: logData.id,
        user_id: user.id,
        health_score: analysis.health_score,
        ai_feedback: analysis.ai_feedback,
        image_url: imageUrl
      });
    analysisError = fallbackResult.error;
  }

  if (analysisError) {
    console.error('Failed to save meal analysis:', analysisError);
    // Don't throw, since the core log succeeded
  }

  revalidatePath('/dashboard/nutrition');
  revalidatePath('/dashboard');
  
  return { success: true, data: analysis };
}

export const getDailyNutrition = cache(async (date?: string) => {
  const user = await getAuthenticatedUser();
  if (!user) return { logs: [], macros: { calories: 0, protein: 0, carbs: 0, fat: 0 } };

  const supabase = await createClient();

  // Fetch user's timezone (memoized)
  const profile = await getUserProfile();
  const userTimezone = profile?.timezone || 'UTC';

  // Determine date bounds in user timezone
  const targetDate = date ? new Date(date) : new Date();
  
  const localDateStr = targetDate.toLocaleDateString('en-US', { timeZone: userTimezone });
  const localDate = new Date(localDateStr);
  let offset = targetDate.toLocaleString('en-US', { timeZoneName: 'shortOffset', timeZone: userTimezone }).split('GMT')[1] || '+00:00';
  
  // Normalize offset to valid ISO-8601 format (+HH:MM)
  if (offset !== '+00:00' && offset !== 'Z') {
    const match = offset.match(/^([+-])(\d{1,2}):(\d{2})$/);
    if (match) {
      const [, sign, hours, minutes] = match;
      offset = `${sign}${hours.padStart(2, '0')}:${minutes}`;
    }
  }

  const isoDateStr = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}T00:00:00${offset}`;
  
  let todayStartIso: string;
  let nextDayIso: string;
  try {
    const start = new Date(isoDateStr);
    todayStartIso = start.toISOString();
    
    const nextDay = new Date(start);
    nextDay.setDate(nextDay.getDate() + 1);
    nextDayIso = nextDay.toISOString();
  } catch {
    // Fallback if parsing fails
    targetDate.setHours(0, 0, 0, 0);
    todayStartIso = targetDate.toISOString();
    
    const nextDate = new Date(targetDate);
    nextDate.setDate(nextDate.getDate() + 1);
    nextDayIso = nextDate.toISOString();
  }

  // Fetch logs and joined analysis with resilient fallback for pending migrations
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  let data: any[] | null = null;
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  let error: any = null;

  try {
    const primaryResult = await supabase
      .from('nutrition_logs')
      .select(`
        *,
        meal_analysis (
          health_score,
          ai_feedback,
          image_url,
          detected_items,
          confidence,
          confidence_explanation
        )
      `)
      .eq('user_id', user.id)
      .gte('logged_at', todayStartIso)
      .lt('logged_at', nextDayIso)
      .order('logged_at', { ascending: false });

    data = primaryResult.data;
    error = primaryResult.error;

    if (error && error.message.includes('detected_items')) {
      console.warn("Detected items column not found. Retrying with fallback columns.");
      const fallbackResult = await supabase
        .from('nutrition_logs')
        .select(`
          *,
          meal_analysis (
            health_score,
            ai_feedback,
            image_url
          )
        `)
        .eq('user_id', user.id)
        .gte('logged_at', todayStartIso)
        .lt('logged_at', nextDayIso)
        .order('logged_at', { ascending: false });

      data = fallbackResult.data;
      error = fallbackResult.error;
    }
  } catch (err) {
    console.error("Failed to fetch nutrition logs:", err);
  }

  if (error || !data) {
    return { logs: [], macros: { calories: 0, protein: 0, carbs: 0, fat: 0 } };
  }

  // Calculate Macros
  const macros = data.reduce((acc, log) => ({
    calories: acc.calories + log.calories,
    protein: acc.protein + (log.protein_g || 0),
    carbs: acc.carbs + (log.carbs_g || 0),
    fat: acc.fat + (log.fat_g || 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  return { logs: data, macros };
});
