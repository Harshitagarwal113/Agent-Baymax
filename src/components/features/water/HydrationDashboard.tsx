/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
'use client';

import { useState, useEffect, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Droplet, Plus, Trash2, Zap, Check, Calendar, 
  TrendingUp, Sparkles, BrainCircuit, Trophy, Award, Activity 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  addWaterIntake, 
  deleteWaterLog, 
  getWaterCoachingAndInsightsAction, 
  updateWaterGoalAction,
  getTodayWaterLogs
} from '@/actions/water';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, 
  ResponsiveContainer, ReferenceLine 
} from 'recharts';

interface HydrationDashboardProps {
  initialCurrentMl: number;
  initialGoalMl: number;
  initialLogs: { id: string; amount_ml: number; logged_at: string }[];
  initialStreak: { currentStreak: number; bestStreak: number };
  initialAnalytics: { name: string; amount: number }[];
  profile: {
    fullName?: string;
    age?: number;
    heightCm?: number;
    gender?: string;
    activityLevel?: string;
    currentWeightKg?: number;
    weightGoalKg?: number;
    goalType?: string;
  };
}

export function HydrationDashboard({
  initialCurrentMl,
  initialGoalMl,
  initialLogs,
  initialStreak,
  initialAnalytics,
  profile
}: HydrationDashboardProps) {
  const [currentMl, setCurrentMl] = useState(initialCurrentMl);
  const [goalMl, setGoalMl] = useState(initialGoalMl);
  const [logs, setLogs] = useState(initialLogs);
  const [streak] = useState(initialStreak);
  const [analytics, setAnalytics] = useState(initialAnalytics);
  const [workoutDay, setWorkoutDay] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [coachAdvice, setCoachAdvice] = useState('Generating hydration protocol...');
  const [insights, setInsights] = useState('Analyzing hydration history...');
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [, startTransition] = useTransition();

  // Synchronize state when navigating between features or when server props refresh
  useEffect(() => {
    setCurrentMl(initialCurrentMl);
    setGoalMl(initialGoalMl);
    setLogs(initialLogs);
    setAnalytics(initialAnalytics);
  }, [initialCurrentMl, initialGoalMl, initialLogs, initialAnalytics]);

  const weight = profile.currentWeightKg || 70;
  const activityLevel = profile.activityLevel || 'moderately_active';
  const goalType = profile.goalType || 'maintain';

  // Step 7: Smart Daily Goal Formula
  const calculateDynamicWaterGoal = (isWorkout: boolean) => {
    let baseline = weight * 35; // 35 ml per kg
    if (baseline <= 0) baseline = 2000;

    const activityAdds: Record<string, number> = {
      sedentary: 0,
      lightly_active: 350,
      moderately_active: 500,
      very_active: 750,
      extra_active: 750
    };
    baseline += activityAdds[activityLevel] || 0;

    if (goalType === 'lose_weight') baseline += 250;
    else if (goalType === 'build_muscle') baseline += 500;

    if (isWorkout) baseline += 800; // Workout sweat replenishment

    return Math.round(baseline / 100) * 100;
  };

  // Sync workout toggle changes with dynamic goal updates
  useEffect(() => {
    const computed = calculateDynamicWaterGoal(workoutDay);
    setGoalMl(computed);
    
    // Save to database background
    startTransition(async () => {
      try {
        await updateWaterGoalAction(computed);
      } catch (err) {
        console.error("Failed to update water goal:", err);
      }
    });
  }, [workoutDay]);

  // Fetch AI Coaching and Insights dynamically when current intake/goal changes
  const fetchAICoachData = async (current: number, target: number) => {
    setLoadingAdvice(true);
    try {
      const res = await getWaterCoachingAndInsightsAction(current, target, workoutDay);
      setCoachAdvice(res.coachAdvice);
      setInsights(res.insights);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAdvice(false);
    }
  };

  useEffect(() => {
    fetchAICoachData(currentMl, goalMl);
  }, [currentMl, goalMl]);

  // Percentage Calculations
  const pct = goalMl > 0 ? Math.round((currentMl / goalMl) * 100) : 0;
  const radius = 80;
  const stroke = 12;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (Math.min(pct, 100) / 100) * circumference;

  // Hydration status evaluation
  const getHydrationStatus = () => {
    if (pct >= 100) return { label: 'Excellent', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' };
    if (pct >= 75) return { label: 'Good', color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' };
    if (pct >= 40) return { label: 'Behind Schedule', color: 'text-orange-500 bg-orange-500/10 border-orange-500/20' };
    return { label: 'Dehydrated', color: 'text-red-500 bg-red-500/10 border-red-500/20' };
  };

  const status = getHydrationStatus();

  // Log Actions
  const handleAddWater = async (amount: number) => {
    try {
      setCurrentMl(prev => prev + amount);
      await addWaterIntake(amount);
      const updatedLogs = await getTodayWaterLogs();
      setLogs(updatedLogs);
      
      // Update charts data point locally
      setAnalytics(prev => prev.map((item, idx) => {
        if (idx === prev.length - 1) {
          return { ...item, amount: item.amount + amount };
        }
        return item;
      }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleCustomAdd = () => {
    const amt = parseInt(customAmount);
    if (amt > 0) {
      handleAddWater(amt);
      setCustomAmount('');
    }
  };

  const handleDeleteLog = async (id: string, amount: number) => {
    try {
      setCurrentMl(prev => Math.max(0, prev - amount));
      setLogs(prev => prev.filter(log => log.id !== id));
      await deleteWaterLog(id);
      
      // Update charts data point locally
      setAnalytics(prev => prev.map((item, idx) => {
        if (idx === prev.length - 1) {
          return { ...item, amount: Math.max(0, item.amount - amount) };
        }
        return item;
      }));
    } catch (err) {
      console.error(err);
    }
  };

  // Weekly Stats calculation
  const totalWaterThisWeek = analytics.reduce((sum, d) => sum + d.amount, 0);
  const avgWeeklyIntake = Math.round(totalWaterThisWeek / 7);
  const maxDay = [...analytics].sort((a,b) => b.amount - a.amount)[0];
  const minDay = [...analytics].sort((a,b) => a.amount - b.amount)[0];
  const goalCompletionDays = analytics.filter(d => d.amount >= goalMl).length;
  const goalCompletionRate = Math.round((goalCompletionDays / 7) * 100);

  return (
    <div className="grid gap-6 md:grid-cols-12 max-w-7xl mx-auto w-full">
      
      {/* Left Column: Progress circle, goal calculators, quick add (4 Cols) */}
      <div className="md:col-span-4 space-y-6">
        
        {/* SECTION 1: Today's Hydration Progress Ring */}
        <Card className="border border-zinc-200/50 dark:border-zinc-800/50 bg-white/55 dark:bg-zinc-900/30 backdrop-blur-xl rounded-[2.5rem] shadow-sm overflow-hidden p-6 text-center">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-base font-bold text-zinc-900 dark:text-zinc-50">Today&apos;s Hydration</CardTitle>
            <CardDescription className="text-xs">Dynamic liquid balance levels</CardDescription>
          </CardHeader>
          <CardContent className="p-0 flex flex-col items-center">
            
            {/* SVG Progress Circle */}
            <div className="relative h-44 w-44 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                {/* Background Track */}
                <circle
                  stroke="rgba(244, 244, 245, 0.4)"
                  fill="transparent"
                  strokeWidth={stroke}
                  r={normalizedRadius}
                  cx={radius + 8}
                  cy={radius + 8}
                  className="dark:stroke-zinc-850/50"
                />
                {/* Fill Ring */}
                <circle
                  stroke="url(#water-gradient)"
                  fill="transparent"
                  strokeWidth={stroke}
                  strokeDasharray={circumference + ' ' + circumference}
                  style={{ strokeDashoffset }}
                  strokeLinecap="round"
                  r={normalizedRadius}
                  cx={radius + 8}
                  cy={radius + 8}
                  className="transition-all duration-700 ease-out"
                />
                
                {/* Gradients */}
                <defs>
                  <linearGradient id="water-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#60a5fa" />
                  </linearGradient>
                </defs>
              </svg>

              <div className="absolute flex flex-col items-center text-center">
                <span className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
                  {pct}%
                </span>
                <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 tracking-wider">
                  {currentMl} / {goalMl} ml
                </span>
              </div>
            </div>

            {/* Clinical status badge */}
            <div className={`mt-4 px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${status.color}`}>
              {status.label}
            </div>

          </CardContent>
        </Card>

        {/* SECTION 7: Smart Daily Goal Calculator */}
        <Card className="border border-zinc-200/50 dark:border-zinc-800/50 bg-white/55 dark:bg-zinc-900/30 backdrop-blur-xl rounded-[2.5rem] shadow-sm p-5">
          <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-50 mb-3 flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-blue-500" /> Smart Daily Goal
          </h3>
          
          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center bg-zinc-100/50 dark:bg-zinc-950/20 p-2.5 rounded-xl border border-zinc-200/20 dark:border-zinc-800/30">
              <div>
                <span className="font-bold text-zinc-800 dark:text-zinc-200 block">Workout Day?</span>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500">Adds 800ml for hydration recovery</span>
              </div>
              <button 
                onClick={() => setWorkoutDay(!workoutDay)}
                className={`w-10 h-6 rounded-full transition-all flex items-center p-0.5 cursor-pointer ${
                  workoutDay ? 'bg-blue-600 justify-end' : 'bg-zinc-300 dark:bg-zinc-800 justify-start'
                }`}
              >
                <span className="w-5 h-5 bg-white rounded-full shadow-sm" />
              </button>
            </div>

            {/* Calculations breakdown */}
            <div className="p-3 bg-zinc-50 dark:bg-zinc-950/10 border border-zinc-200/20 dark:border-zinc-800/30 rounded-xl space-y-1.5 text-zinc-500 dark:text-zinc-400">
              <div className="flex justify-between">
                <span>Weight Baseline (35ml/kg)</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">{(weight * 35).toFixed(0)} ml</span>
              </div>
              <div className="flex justify-between">
                <span>Activity Factor ({activityLevel.replace('_', ' ')})</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  +{activityLevel === 'sedentary' ? 0 : activityLevel === 'lightly_active' ? 350 : activityLevel === 'moderately_active' ? 500 : 750} ml
                </span>
              </div>
              <div className="flex justify-between">
                <span>Goal Adjustment ({goalType.replace('_', ' ')})</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  +{goalType === 'lose_weight' ? 250 : goalType === 'build_muscle' ? 500 : 0} ml
                </span>
              </div>
              {workoutDay && (
                <div className="flex justify-between text-blue-600 dark:text-blue-400 font-bold">
                  <span>Workout Replenishment</span>
                  <span>+800 ml</span>
                </div>
              )}
              <div className="pt-2 border-t border-zinc-200/40 dark:border-zinc-800/40 flex justify-between font-black text-zinc-950 dark:text-zinc-50">
                <span>Total Target Goal</span>
                <span>{goalMl} ml</span>
              </div>
            </div>
          </div>
        </Card>

        {/* SECTION 3: Quick Add Water */}
        <Card className="border border-zinc-200/50 dark:border-zinc-800/50 bg-white/55 dark:bg-zinc-900/30 backdrop-blur-xl rounded-[2.5rem] shadow-sm p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-base font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-blue-500" /> Log Water Intake
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 space-y-4">
            
            {/* Presets Grid */}
            <div className="grid grid-cols-2 gap-2">
              <Button 
                onClick={() => handleAddWater(250)}
                variant="outline" 
                className="rounded-2xl border-zinc-200/60 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 hover:text-blue-500 font-bold py-5 cursor-pointer text-xs"
              >
                💧 +250 ml
              </Button>
              <Button 
                onClick={() => handleAddWater(500)}
                variant="outline" 
                className="rounded-2xl border-zinc-200/60 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 hover:text-blue-500 font-bold py-5 cursor-pointer text-xs"
              >
                🥛 +500 ml
              </Button>
              <Button 
                onClick={() => handleAddWater(750)}
                variant="outline" 
                className="rounded-2xl border-zinc-200/60 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 hover:text-blue-500 font-bold py-5 cursor-pointer text-xs"
              >
                🥤 +750 ml
              </Button>
              <Button 
                onClick={() => handleAddWater(1000)}
                variant="outline" 
                className="rounded-2xl border-zinc-200/60 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 hover:text-blue-500 font-bold py-5 cursor-pointer text-xs"
              >
                🫙 +1 L
              </Button>
            </div>

            {/* Custom Input */}
            <div className="flex gap-2">
              <Input 
                type="number"
                placeholder="Custom (e.g. 350)"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="rounded-2xl border-zinc-200 focus-visible:ring-blue-500"
              />
              <Button 
                onClick={handleCustomAdd}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold cursor-pointer shrink-0"
              >
                Add ml
              </Button>
            </div>

          </CardContent>
        </Card>

      </div>

      {/* Right Column: AI Coach advice, timelines, charts (8 Cols) */}
      <div className="md:col-span-8 space-y-6">

        {/* Dynamic Coach Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          
          {/* SECTION 2: AI Hydration Coach */}
          <Card className="border border-zinc-200/50 dark:border-zinc-800/50 bg-white/55 dark:bg-zinc-900/30 backdrop-blur-xl rounded-[2.5rem] shadow-sm p-6 relative overflow-hidden flex flex-col justify-between min-h-[180px]">
            <div className="absolute -right-6 -bottom-6 h-28 w-28 bg-blue-400/10 rounded-full blur-xl pointer-events-none" />
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/20">
                  <BrainCircuit className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-50">Baymax Hydration Coach</h3>
                  <p className="text-[8px] uppercase font-bold text-zinc-400 tracking-wider">companion advice</p>
                </div>
              </div>
              <p className="text-zinc-650 dark:text-zinc-350 text-xs md:text-sm leading-relaxed italic font-medium">
                &ldquo;{coachAdvice}&rdquo;
              </p>
            </div>
            {loadingAdvice && (
              <span className="text-[10px] text-zinc-400 mt-2 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-ping" />
                Generating advice...
              </span>
            )}
          </Card>

          {/* SECTION 8: AI Insights Card */}
          <Card className="border border-zinc-200/50 dark:border-zinc-800/50 bg-white/55 dark:bg-zinc-900/30 backdrop-blur-xl rounded-[2.5rem] shadow-sm p-6 relative overflow-hidden flex flex-col justify-between min-h-[180px]">
            <div className="absolute -left-6 -bottom-6 h-28 w-28 bg-emerald-400/10 rounded-full blur-xl pointer-events-none" />
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-50">AI Hydration Insights</h3>
                  <p className="text-[8px] uppercase font-bold text-zinc-400 tracking-wider">hydration trends</p>
                </div>
              </div>
              <p className="text-zinc-650 dark:text-zinc-350 text-xs md:text-sm leading-relaxed font-bold text-emerald-600 dark:text-emerald-400">
                &ldquo;{insights}&rdquo;
              </p>
            </div>
          </Card>

        </div>

        {/* SECTION 4: Today's Hydration Timeline */}
        <Card className="border border-zinc-200/50 dark:border-zinc-800/50 bg-white/55 dark:bg-zinc-900/30 backdrop-blur-xl rounded-[2.5rem] shadow-sm p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-base font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-blue-500" /> Today&apos;s Hydration Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {logs.length === 0 ? (
              <div className="text-center py-6 text-zinc-400 dark:text-zinc-500 text-sm">
                No hydration records logged today. Keep drinking water!
              </div>
            ) : (
              <div className="relative border-l border-zinc-200/70 dark:border-zinc-800/60 ml-3 pl-4 space-y-5">
                <AnimatePresence initial={false}>
                  {logs.map((log) => {
                    const timeStr = new Date(log.logged_at).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    });
                    
                    return (
                      <motion.div 
                        key={log.id} 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="relative flex items-center justify-between"
                      >
                        {/* Timeline bubble */}
                        <div className="absolute -left-[23px] h-3.5 w-3.5 rounded-full bg-blue-500 border border-white dark:border-zinc-950 flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-white stroke-[3px]" />
                        </div>
                        
                        <div>
                          <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{timeStr}</span>
                          <span className="text-xs text-zinc-400 dark:text-zinc-500 ml-2">Intake Amount</span>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <span className="font-black text-sm text-blue-600 dark:text-blue-400">{log.amount_ml} ml</span>
                          <Button 
                            onClick={() => handleDeleteLog(log.id, log.amount_ml)}
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-zinc-400 hover:text-red-500 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </CardContent>
        </Card>

        {/* SECTION 5: Weekly Analytics Graph */}
        <Card className="border border-zinc-200/50 dark:border-zinc-800/50 bg-white/55 dark:bg-zinc-900/30 backdrop-blur-xl rounded-[2.5rem] shadow-sm p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-base font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-blue-500" /> Weekly Hydration Analytics
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="area-water" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#60a5fa" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="name" 
                    stroke="currentColor" 
                    className="text-[10px] text-zinc-400 dark:text-zinc-650" 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis 
                    stroke="currentColor" 
                    className="text-[10px] text-zinc-400 dark:text-zinc-650" 
                    tickLine={false} 
                    axisLine={false}
                    domain={[0, 'dataMax + 1000']} 
                  />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '16px', 
                      backgroundColor: 'rgba(255,255,255,0.85)', 
                      border: '1px solid rgba(228,228,231,0.5)',
                      backdropFilter: 'blur(8px)',
                      color: '#09090b',
                      fontWeight: 'bold',
                      fontSize: '11px'
                    }}
                    cursor={{ stroke: 'rgba(59,130,246,0.2)', strokeWidth: 1.5 }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#3b82f6" 
                    strokeWidth={2.5} 
                    fillOpacity={1} 
                    fill="url(#area-water)" 
                  />
                  <ReferenceLine y={goalMl} stroke="#f43f5e" strokeDasharray="3 3" label={{ value: 'Target', position: 'top', fill: '#f43f5e', fontSize: 9, fontWeight: 'bold' }} />
                  <ReferenceLine y={avgWeeklyIntake} stroke="#10b981" strokeDasharray="4 4" label={{ value: 'Avg', position: 'bottom', fill: '#10b981', fontSize: 9, fontWeight: 'bold' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Weekly Analytics Details Footer */}
            <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-zinc-200/40 dark:border-zinc-800/40 text-center text-xs">
              <div>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase font-bold tracking-wider block">Daily Average</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">{avgWeeklyIntake} ml</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase font-bold tracking-wider block">Best Day</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">{maxDay?.name || '--'} ({maxDay?.amount || 0}ml)</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase font-bold tracking-wider block">Worst Day</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">{minDay?.name || '--'} ({minDay?.amount || 0}ml)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SECTION 6: Achievements & Streaks */}
        <Card className="border border-zinc-200/50 dark:border-zinc-800/50 bg-white/55 dark:bg-zinc-900/30 backdrop-blur-xl rounded-[2.5rem] shadow-sm p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-base font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-500" /> Hydration Achievements
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            
            <div className="p-4 bg-zinc-100/50 dark:bg-zinc-950/20 rounded-3xl border border-zinc-200/20 dark:border-zinc-800/30 flex flex-col items-center justify-center">
              <Zap className="w-6 h-6 text-orange-500 mb-1 animate-pulse" />
              <span className="text-[9px] uppercase font-bold text-zinc-400 block tracking-wider">Current Streak</span>
              <span className="text-lg font-black text-zinc-800 dark:text-zinc-50">{streak.currentStreak} Days</span>
            </div>

            <div className="p-4 bg-zinc-100/50 dark:bg-zinc-950/20 rounded-3xl border border-zinc-200/20 dark:border-zinc-800/30 flex flex-col items-center justify-center">
              <Award className="w-6 h-6 text-yellow-500 mb-1" />
              <span className="text-[9px] uppercase font-bold text-zinc-400 block tracking-wider">Longest Streak</span>
              <span className="text-lg font-black text-zinc-800 dark:text-zinc-50">{streak.bestStreak} Days</span>
            </div>

            <div className="p-4 bg-zinc-100/50 dark:bg-zinc-950/20 rounded-3xl border border-zinc-200/20 dark:border-zinc-800/30 flex flex-col items-center justify-center">
              <Droplet className="w-6 h-6 text-blue-500 mb-1" />
              <span className="text-[9px] uppercase font-bold text-zinc-400 block tracking-wider">Total Weekly</span>
              <span className="text-lg font-black text-zinc-800 dark:text-zinc-50">{(totalWaterThisWeek / 1000).toFixed(1)} L</span>
            </div>

            <div className="p-4 bg-zinc-100/50 dark:bg-zinc-950/20 rounded-3xl border border-zinc-200/20 dark:border-zinc-800/30 flex flex-col items-center justify-center">
              <div className="h-6 w-6 rounded-full bg-emerald-500/10 text-emerald-500 font-black text-[9px] flex items-center justify-center border border-emerald-500/20 mb-1">
                {goalCompletionRate}%
              </div>
              <span className="text-[9px] uppercase font-bold text-zinc-400 block tracking-wider">Completion Rate</span>
              <span className="text-lg font-black text-zinc-800 dark:text-zinc-50">{goalCompletionRate}%</span>
            </div>

          </CardContent>
        </Card>

      </div>

    </div>
  );
}
