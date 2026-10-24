'use server';

import { createClient, getAuthenticatedUser, getUserProfile } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { cache } from 'react';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import { PRIMARY_MODEL, FALLBACK_MODEL } from '@/lib/gemini';

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function addWaterIntake(amountMl: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Unauthorized');

  const { error } = await supabase
    .from('water_logs')
    .insert({
      user_id: user.id,
      amount_ml: amountMl
    });

  if (error) throw new Error(error.message);

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/water');
  return { success: true };
}

// Helper to compute local midnight in ms for any timezone
function getLocalMidnightMs(timezone: string = 'UTC'): number {
  try {
    const now = new Date();
    // Get YYYY-MM-DD in user's timezone
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const dateStr = formatter.format(now); // e.g. "2026-10-24"

    // Calculate timezone offset difference relative to UTC
    const tzDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
    const diffMs = tzDate.getTime() - utcDate.getTime();

    // Midnight UTC on that date
    const utcMidnight = new Date(`${dateStr}T00:00:00.000Z`).getTime();
    const targetMidnightEpoch = utcMidnight - diffMs;

    if (!isNaN(targetMidnightEpoch)) {
      return targetMidnightEpoch;
    }
  } catch (err) {
    console.error('Failed to parse timezone midnight:', err);
  }

  // Fallback to UTC start of day
  const fallback = new Date();
  fallback.setUTCHours(0, 0, 0, 0);
  return fallback.getTime();
}

// Request-level memoized query for the last 60 days of water logs.
// Powers today's water, today's logs, weekly analytics, and streaks with ONE single DB call!
export const getRecentWaterLogs = cache(async () => {
  const user = await getAuthenticatedUser();
  if (!user) return [];
  const supabase = await createClient();

  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  sixtyDaysAgo.setHours(0, 0, 0, 0);

  const { data } = await supabase
    .from('water_logs')
    .select('id, amount_ml, logged_at')
    .eq('user_id', user.id)
    .gte('logged_at', sixtyDaysAgo.toISOString())
    .order('logged_at', { ascending: false });

  return data || [];
});

export const getTodayWater = cache(async () => {
  const profile = await getUserProfile();
  const timezone = profile?.timezone || 'UTC';
  const midnightMs = getLocalMidnightMs(timezone);
  const logs = await getRecentWaterLogs();

  return logs
    .filter(log => new Date(log.logged_at).getTime() >= midnightMs)
    .reduce((sum, log) => sum + log.amount_ml, 0);
});

export const getWaterGoal = cache(async () => {
  const user = await getAuthenticatedUser();
  if (!user) return 2000;
  const supabase = await createClient();

  const { data } = await supabase
    .from('health_goals')
    .select('daily_water_target_ml')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.daily_water_target_ml || 2000;
});

export const getWeeklyWaterAnalytics = cache(async () => {
  const logs = await getRecentWaterLogs();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);
  const sevenDaysAgoMs = sevenDaysAgo.getTime();

  const dailyTotals: Record<string, number> = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgo);
    d.setDate(d.getDate() + i);
    const dateStr = d.toLocaleDateString('en-US', { weekday: 'short' });
    dailyTotals[dateStr] = 0;
  }

  logs.forEach(log => {
    const logMs = new Date(log.logged_at).getTime();
    if (logMs >= sevenDaysAgoMs) {
      const dateStr = new Date(log.logged_at).toLocaleDateString('en-US', { weekday: 'short' });
      if (dailyTotals[dateStr] !== undefined) {
        dailyTotals[dateStr] += log.amount_ml;
      }
    }
  });

  return Object.entries(dailyTotals).map(([name, amount]) => ({
    name,
    amount
  }));
});

export const getWaterStreak = cache(async () => {
  const [profile, goal, logs] = await Promise.all([
    getUserProfile(),
    getWaterGoal(),
    getRecentWaterLogs()
  ]);

  if (!logs || logs.length === 0) return { currentStreak: 0, bestStreak: 0 };
  const userTimezone = profile?.timezone || 'UTC';

  const dailyTotals: Record<string, number> = {};
  logs.forEach(log => {
    const dateKey = new Date(log.logged_at).toLocaleDateString('en-US', { timeZone: userTimezone });
    dailyTotals[dateKey] = (dailyTotals[dateKey] || 0) + log.amount_ml;
  });

  const dates = Object.keys(dailyTotals).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  let currentStreak = 0;
  let bestStreak = 0;
  let tempStreak = 0;

  const now = new Date();
  const todayStr = now.toLocaleDateString('en-US', { timeZone: userTimezone });

  // Best Streak Calculation
  for (let i = 0; i < dates.length; i++) {
    if (dailyTotals[dates[i]] >= goal) {
      tempStreak++;
      if (tempStreak > bestStreak) bestStreak = tempStreak;
    } else {
      tempStreak = 0;
    }
  }

  // Current Streak Calculation
  let checkDate = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }));
  while (true) {
    const dStr = checkDate.toLocaleDateString('en-US');
    if (dailyTotals[dStr] >= goal) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (dStr === todayStr) {
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return { currentStreak, bestStreak };
});

export async function deleteWaterLog(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Unauthorized');

  const { error } = await supabase
    .from('water_logs')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw new Error(error.message);

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/water');
  return { success: true };
}

export const getTodayWaterLogs = cache(async () => {
  const profile = await getUserProfile();
  const timezone = profile?.timezone || 'UTC';
  const midnightMs = getLocalMidnightMs(timezone);
  const logs = await getRecentWaterLogs();

  return logs.filter(log => new Date(log.logged_at).getTime() >= midnightMs);
});

export async function getWaterCoachingAndInsightsAction(currentMl: number, goalMl: number, isWorkoutDay: boolean) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return {
      coachAdvice: "Hello! Log in to get personalized hydration coaching from Baymax.",
      insights: "Streaks and insights will unlock once you start tracking."
    };
  }

  const supabase = await createClient();
  // Fetch profile and goal details
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

  const goal = goalRes.data;

  const pct = goalMl > 0 ? Math.round((currentMl / goalMl) * 100) : 0;

  let coachAdvice = "Keep drinking water to stay on track for the day.";
  let insights = "Try to distribute your hydration evenly throughout the day.";

  try {
    const coachPrompt = `You are Baymax, a personal healthcare companion. Provide a friendly, concise, clinically-sound hydration recommendation.
    
User metrics:
- Name: ${profile?.full_name || 'User'}
- Weight: ${goal?.current_weight_kg || '70'} kg
- Goal: ${goal?.goal_type || 'maintain'}
- Activity Level: ${profile?.activity_level || 'moderately_active'}
- Worked out today? ${isWorkoutDay ? 'Yes (high sweat rate)' : 'No (rest day)'}
- Today's Water Target: ${goalMl} ml
- Current Intake: ${currentMl} ml (${pct}% completed)

Write exactly 2-3 sentences. Focus on immediate hydration timing, workout recovery (if workout is yes, emphasize salt/sweat balance), and Baymax style (concise, warm, clinical, addressing the user directly).`;

    const { text: adviceText } = await generateText({
      model: google('gemini-3.1-flash-lite'),
      prompt: coachPrompt,
    });
    if (adviceText) coachAdvice = adviceText.trim();

    const insightsPrompt = `You are Baymax, a personal healthcare companion. Analyze this user's current hydration:
- Target: ${goalMl} ml
- Current Intake: ${currentMl} ml (${pct}% completed)
- Workout status: ${isWorkoutDay ? 'Worked out' : 'Rest day'}

Generate a short hydration insight (maximum 2 lines / 15 words). E.g. "You are spreading your intake well today." or "Drink more now to avoid fatigue later." Keep it clinical, brief, and actionable.`;

    const { text: insightsText } = await generateText({
      model: google('gemini-3.1-flash-lite'),
      prompt: insightsPrompt,
    });
    if (insightsText) insights = insightsText.trim();

  } catch (err) {
    console.error("Failed to generate water AI response:", err);
  }

  return { coachAdvice, insights };
}

export async function updateWaterGoalAction(goalMl: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Unauthorized');

  const { error } = await supabase
    .from('health_goals')
    .update({
      daily_water_target_ml: goalMl,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', user.id);

  if (error) throw new Error(error.message);

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/water');
  return { success: true };
}
