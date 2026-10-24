'use client';

import { motion, Variants } from 'framer-motion';
import { CalorieWidget } from './widgets/CalorieWidget';
import { WaterWidget } from './widgets/WaterWidget';
import { WeeklyTrendsChart } from './widgets/WeeklyTrendsChart';
import { RecentActivities } from './widgets/RecentActivities';
import { MacrosProgressChart } from './widgets/MacrosProgressChart';
import { HeartPulse } from 'lucide-react';

interface DashboardProps {
  userName?: string;
  water: { current: number; goal: number };
  calories: { current: number; goal: number };
  macroGoals: { protein: number; carbs: number; fat: number };
  goalType?: string;
  weeklyTrends: { name: string; calories: number; water: number; protein?: number; carbs?: number; fat?: number; }[];
  recentActivities: { id: string; type: string; title: string; desc: string; time: string }[];
  currentWeight?: number;
  targetWeight?: number;
  startingWeight?: number;
  aiAnalysis?: string;
  estimatedWeeks?: string;
  heightCm?: number;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08
    }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120, damping: 15 } }
};

export function Dashboard({ 
  userName, 
  water, 
  calories, 
  macroGoals, 
  goalType = 'maintain', 
  weeklyTrends, 
  recentActivities,
  currentWeight,
  targetWeight,
  startingWeight,
  aiAnalysis,
  estimatedWeeks,
  heightCm
}: DashboardProps) {
  const waterPct = water.goal > 0 ? Math.round((water.current / water.goal) * 100) : 0;
  const calPct = calories.goal > 0 ? Math.round((calories.current / calories.goal) * 100) : 0;

  let progressPercent = 0;
  const effectiveStartWeight = startingWeight ?? currentWeight ?? 70;
  const effectiveCurrentWeight = currentWeight ?? 70;
  const effectiveTargetWeight = targetWeight ?? 70;

  if (goalType === 'lose_weight') {
    if (effectiveCurrentWeight >= effectiveStartWeight) {
      progressPercent = 0;
    } else if (effectiveCurrentWeight <= effectiveTargetWeight) {
      progressPercent = 100;
    } else {
      progressPercent = ((effectiveStartWeight - effectiveCurrentWeight) / (effectiveStartWeight - effectiveTargetWeight)) * 100;
    }
  } else if (goalType === 'build_muscle') {
    if (effectiveCurrentWeight <= effectiveStartWeight) {
      progressPercent = 0;
    } else if (effectiveCurrentWeight >= effectiveTargetWeight) {
      progressPercent = 100;
    } else {
      progressPercent = ((effectiveCurrentWeight - effectiveStartWeight) / (effectiveTargetWeight - effectiveStartWeight)) * 100;
    }
  } else {
    progressPercent = 100;
  }

  // BMI calculations
  let bmiVal: number | null = null;
  let bmiClass = '';
  if (effectiveCurrentWeight && heightCm && heightCm > 0) {
    const heightM = heightCm / 100;
    bmiVal = effectiveCurrentWeight / (heightM * heightM);
    if (bmiVal < 18.5) bmiClass = 'Underweight';
    else if (bmiVal < 25) bmiClass = 'Normal';
    else if (bmiVal < 30) bmiClass = 'Overweight';
    else bmiClass = 'Obese';
  }

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="flex-1 space-y-8 p-2 md:p-6 max-w-7xl mx-auto w-full"
    >
      {/* Dynamic Welcome Card */}
      <motion.div 
        variants={itemVariants} 
        className="relative overflow-hidden rounded-[2.5rem] bg-white/40 dark:bg-zinc-900/30 backdrop-blur-2xl border border-zinc-200/50 dark:border-zinc-800/40 p-8 md:p-10 shadow-xl shadow-zinc-150/10 dark:shadow-none"
      >
        {/* Shifting Liquid Background Blobs */}
        <div className="absolute -left-12 -top-12 h-80 w-80 bg-gradient-to-br from-red-400 to-orange-300 rounded-full blur-3xl opacity-25 dark:opacity-15 animate-pulse pointer-events-none" style={{ animationDuration: '7s' }} />
        <div className="absolute -right-12 -bottom-12 h-80 w-80 bg-gradient-to-tr from-blue-400 to-cyan-300 rounded-full blur-3xl opacity-25 dark:opacity-15 animate-pulse pointer-events-none" style={{ animationDuration: '9s' }} />
        <div className="absolute left-1/3 top-1/4 h-64 w-64 bg-purple-400/10 rounded-full blur-3xl opacity-20 pointer-events-none" />
        
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50/80 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-xs font-bold uppercase tracking-wider border border-red-100/50 dark:border-red-950/20 backdrop-blur-md shadow-sm">
              <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              Healthcare Companion Protocol
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight text-zinc-900 dark:text-zinc-50">
              Hello{userName ? `, ${userName}` : ''}.<br />
              I am <span className="text-red-500">Baymax</span>.
            </h1>
            <p className="text-zinc-650 dark:text-zinc-300 max-w-2xl text-sm md:text-base font-medium leading-relaxed">
              Your physical logs are active. Today, your hydration stands at <span className="text-blue-600 dark:text-blue-400 font-bold">{waterPct}%</span> of daily targets, and your calorie intake is at <span className="text-orange-600 dark:text-orange-400 font-bold">{calPct}%</span> of your metabolic balance. How would you rate your pain?
            </p>
          </div>
          
          <div className="flex shrink-0 items-center justify-center h-20 w-20 md:h-28 md:w-28 rounded-full bg-gradient-to-br from-red-500 to-orange-500 text-white shadow-xl shadow-red-500/20 border border-red-400/20 hover:scale-105 transition-transform duration-300">
            <HeartPulse className="h-10 w-10 md:h-14 md:w-14 text-white animate-pulse" />
          </div>
        </div>
      </motion.div>

      {/* Goal Progress & AI Healthcare Analysis */}
      {currentWeight !== undefined && targetWeight !== undefined && (
        <motion.div 
          variants={itemVariants} 
          className="grid gap-6 md:grid-cols-12"
        >
          {/* Baymax AI Health Summary Card - 7 Columns */}
          <div className="md:col-span-7 relative overflow-hidden rounded-[2.5rem] bg-white/40 dark:bg-zinc-900/30 backdrop-blur-2xl border border-zinc-200/50 dark:border-zinc-800/40 p-6 md:p-8 shadow-xl shadow-zinc-150/5 dark:shadow-none flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center border border-red-500/20">
                  <span className="font-black text-sm">AI</span>
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900 dark:text-zinc-50 text-base">Baymax Health Analysis</h3>
                  <p className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 tracking-wider">Companion Coaching</p>
                </div>
              </div>
              <p className="text-zinc-705 dark:text-zinc-300 text-sm md:text-base leading-relaxed font-medium italic">
                &ldquo;{aiAnalysis || 'Hello! Update your weight goal details in your profile, and I will construct a personalized medical-coaching analysis for you here.'}&rdquo;
              </p>
            </div>
            
            <div className="mt-6 pt-4 border-t border-zinc-200/40 dark:border-zinc-800/40 flex items-center justify-between text-xs text-zinc-400 dark:text-zinc-500">
              <span className="flex items-center gap-1.5 font-bold">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                Active Medical Companion Mode
              </span>
              <span>Updated: Real-time</span>
            </div>
          </div>

          {/* Goal & Weight Tracker - 5 Columns */}
          <div className="md:col-span-5 relative overflow-hidden rounded-[2.5rem] bg-white/40 dark:bg-zinc-900/30 backdrop-blur-2xl border border-zinc-200/50 dark:border-zinc-800/40 p-6 md:p-8 shadow-xl shadow-zinc-150/5 dark:shadow-none">
            <h3 className="font-bold text-zinc-900 dark:text-zinc-50 text-base mb-4 flex items-center gap-2">
              <span className="text-primary">🎯</span> Goal Progress
            </h3>
            
            <div className="grid grid-cols-3 gap-2 text-center mb-5">
              <div className="p-3 bg-zinc-100/50 dark:bg-zinc-950/20 rounded-2xl border border-zinc-200/20 dark:border-zinc-800/30">
                <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">Current</span>
                <span className="text-sm font-black text-zinc-800 dark:text-zinc-250">{currentWeight} kg</span>
              </div>
              <div className="p-3 bg-zinc-100/50 dark:bg-zinc-950/20 rounded-2xl border border-zinc-200/20 dark:border-zinc-800/30">
                <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">Target</span>
                <span className="text-sm font-black text-zinc-800 dark:text-zinc-250">{targetWeight} kg</span>
              </div>
              <div className="p-3 bg-zinc-100/50 dark:bg-zinc-950/20 rounded-2xl border border-zinc-200/20 dark:border-zinc-800/30">
                <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">Remaining</span>
                <span className="text-sm font-black text-primary">{Number(Math.abs(currentWeight - targetWeight).toFixed(1))} kg</span>
              </div>
            </div>

            {/* Goal Progress bar */}
            <div className="space-y-2 mb-5">
              <div className="flex justify-between text-xs font-bold text-zinc-650 dark:text-zinc-350">
                <span>Progress to Goal</span>
                <span>{Math.round(progressPercent)}%</span>
              </div>
              <div className="h-3 w-full bg-zinc-100 dark:bg-zinc-950 rounded-full overflow-hidden border border-zinc-200/40 dark:border-zinc-800/45">
                <div 
                  className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Extra Analytics (BMI & Est. Weeks) */}
            <div className="space-y-3 pt-3 border-t border-zinc-200/40 dark:border-zinc-800/40 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-zinc-500 dark:text-zinc-400">Body Mass Index (BMI)</span>
                <div className="flex items-center gap-1.5 font-black text-zinc-700 dark:text-zinc-250">
                  <span>{bmiVal !== null ? bmiVal.toFixed(1) : '--'}</span>
                  {bmiVal !== null && (
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                      bmiClass === 'Normal' 
                        ? 'bg-emerald-500/10 text-emerald-500' 
                        : bmiClass === 'Underweight'
                        ? 'bg-blue-500/10 text-blue-500'
                        : bmiClass === 'Overweight'
                        ? 'bg-orange-500/10 text-orange-500'
                        : 'bg-red-500/10 text-red-500'
                    }`}>
                      {bmiClass}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-zinc-500 dark:text-zinc-400">Est. Time to Goal</span>
                <span className="font-black text-zinc-700 dark:text-zinc-250">{estimatedWeeks || 'Active'}</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Top Metrics Grid */}
      <motion.div variants={itemVariants} className="grid gap-6 md:grid-cols-2">
        <div className="group transition-all duration-300 hover:scale-[1.01]">
          <a href="/dashboard/nutrition" className="block">
            <CalorieWidget current={calories.current} goal={calories.goal} />
          </a>
        </div>
        <div className="group transition-all duration-300 hover:scale-[1.01]">
          <a href="/dashboard/water" className="block">
            <WaterWidget currentMl={water.current} goalMl={water.goal} />
          </a>
        </div>
      </motion.div>

      {/* Main Charts & Activities */}
      <motion.div variants={itemVariants} className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
        <WeeklyTrendsChart data={weeklyTrends} calorieGoal={calories.goal} waterGoal={water.goal} currentCalPct={calPct} goalType={goalType} />
        <RecentActivities activities={recentActivities} />
      </motion.div>

      {/* Macro Completion Progress */}
      <motion.div variants={itemVariants} className="grid gap-6">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <MacrosProgressChart data={weeklyTrends as any} goals={macroGoals} />
      </motion.div>
    </motion.div>
  );
}
