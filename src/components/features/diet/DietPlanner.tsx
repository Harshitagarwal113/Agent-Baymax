'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, RotateCcw, FileText, Calendar, Apple, 
  Heart, Flame, ShieldAlert, Info, ListChecks, ChefHat, 
  ShoppingCart, HelpCircle, Timer, Bot
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { generateDietPlanAction, DietPlanResult } from '@/actions/diet';
import { jsPDF } from 'jspdf';

interface ProfileSummary {
  fullName: string;
  age: number | null;
  heightCm: number | null;
  currentWeightKg: number | null;
  gender: string | null;
  activityLevel: string | null;
  goalType: string;
  calorieTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
  dietPreference: string;
  allergies: string;
}

interface DietPlannerProps {
  initialProfile: ProfileSummary;
}

const statusPhrases = [
  "Baymax is preparing your personalized diet plan...",
  "Analyzing your daily metabolic profile and TDEE...",
  "Formatting meal targets to achieve macro distributions...",
  "Checking allergy restrictions to guarantee food safety...",
  "Structuring recipe instructions using local ingredients...",
  "Optimizing portion sizes to meet caloric guidelines...",
  "Double-checking nutritional balance. Finalizing plan..."
];

export function DietPlanner({ initialProfile }: DietPlannerProps) {
  const [plan, setPlan] = useState<DietPlanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusIdx, setStatusIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dietPreference, setDietPreference] = useState<'veg' | 'non-veg' | 'mix'>('mix');
  
  // Future ready tabs state
  const [activeTab, setActiveTab] = useState<'plan' | 'grocery' | 'weekly' | 'recipes' | 'assistant'>('plan');

  // Load from localStorage on mount
  useEffect(() => {
    const savedPlan = localStorage.getItem('baymax_diet_plan');
    const savedPref = localStorage.getItem('baymax_diet_preference') as 'veg' | 'non-veg' | 'mix' | null;
    if (savedPlan) {
      try {
        /* eslint-disable-next-line react-hooks/set-state-in-effect */
        setPlan(JSON.parse(savedPlan));
      } catch (e) {
        console.error('Failed to parse saved diet plan', e);
      }
    }
    if (savedPref) {
      setDietPreference(savedPref);
    }
  }, []);

  // Status message rotation
  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setStatusIdx((prev) => (prev + 1) % statusPhrases.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [loading]);

  const handleGenerate = async (isRegen = false) => {
    setLoading(true);
    setStatusIdx(0);
    setError(null);
    try {
      const variationSalt = isRegen ? Math.random().toString(36).substring(7) : undefined;
      const result = await generateDietPlanAction(dietPreference, variationSalt);
      setPlan(result);
      localStorage.setItem('baymax_diet_plan', JSON.stringify(result));
      localStorage.setItem('baymax_diet_preference', dietPreference);
    } catch (err: unknown) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : 'Failed to generate diet plan. Please try again.';
      setError(errMsg);
    } finally {
      setLoading(false);
      setStatusIdx(0);
    }
  };

  const handleDownloadPDF = () => {
    if (!plan) return;
    
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const primaryColor = [255, 75, 75]; 
    const darkColor = [39, 39, 42]; 
    const lightBgColor = [244, 244, 245]; 
    const borderTextColor = [113, 113, 122]; 

    let y = 15;

    // Header Banner
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, pageWidth, 28, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text("AGENT BAYMAX HEALTHCARE COMPANION", 15, 18);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Personalized Diet Plan - ${new Date().toLocaleDateString()}`, 15, 24);

    y = 36;

    // User Profile Section
    doc.setFillColor(lightBgColor[0], lightBgColor[1], lightBgColor[2]);
    doc.roundedRect(12, y, pageWidth - 24, 30, 3, 3, 'F');

    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text("User Profile Summary", 16, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(borderTextColor[0], borderTextColor[1], borderTextColor[2]);
    
    doc.text(`User: ${initialProfile.fullName}`, 16, y + 14);
    doc.text(`Goal: ${formatGoalType(initialProfile.goalType)}`, 16, y + 20);
    doc.text(`Diet Preference: ${dietPreference.toUpperCase()}`, 16, y + 26);

    const targetCol2X = pageWidth / 2 + 10;
    doc.text(`Target Calories: ${initialProfile.calorieTarget} kcal`, targetCol2X, y + 14);
    doc.text(`Macros (P/C/F): ${initialProfile.proteinTarget}g / ${initialProfile.carbsTarget}g / ${initialProfile.fatTarget}g`, targetCol2X, y + 20);
    doc.text(`Allergies: ${initialProfile.allergies}`, targetCol2X, y + 26);

    y += 38;

    // Meal Timeline Title
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text("Daily Meal Timeline", 12, y);
    y += 6;

    // Print Meals
    plan.meals.forEach((meal) => {
      // Check for page overflow
      if (y > pageHeight - 42) {
        doc.addPage();
        y = 15;
        // Page header on new page
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(0, 0, pageWidth, 12, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text("AGENT BAYMAX DIET TIMELINE (CONTINUED)", 15, 8);
        y = 22;
      }

      // Meal Card background outline
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(228, 228, 231);
      doc.roundedRect(12, y, pageWidth - 24, 28, 2, 2, 'FD');

      // Meal Time & Type
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2], 0.1);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(`${meal.time} | ${meal.meal_type.toUpperCase().replace('_', ' ')}`, 16, y + 6);

      // Meal Title & Calories
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(meal.title, 16, y + 12);
      
      const caloriesStr = `${meal.calories} kcal`;
      const calWidth = doc.getTextWidth(caloriesStr);
      doc.text(caloriesStr, pageWidth - 16 - calWidth, y + 12);

      // Items list
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(borderTextColor[0], borderTextColor[1], borderTextColor[2]);
      const itemsStr = "Ingredients: " + meal.items.map(item => `${item.name} (${item.portion})`).join(', ');
      const truncatedItems = doc.splitTextToSize(itemsStr, pageWidth - 32);
      doc.text(truncatedItems[0], 16, y + 18);

      // Empathetic advice note (small block)
      doc.setTextColor(34, 112, 60); 
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'italic');
      const whyChosenStr = `Baymax advice: ${meal.why_chosen}`;
      const truncatedAdvice = doc.splitTextToSize(whyChosenStr, pageWidth - 32);
      doc.text(truncatedAdvice[0], 16, y + 24);

      y += 32;
    });

    // Check overflow for summary
    if (y > pageHeight - 50) {
      doc.addPage();
      y = 15;
    }

    // Daily Summary
    doc.setFillColor(lightBgColor[0], lightBgColor[1], lightBgColor[2]);
    doc.setDrawColor(228, 228, 231);
    doc.roundedRect(12, y, pageWidth - 24, 20, 2, 2, 'FD');

    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text("Daily Summary Totals", 16, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Calories: ${plan.nutrition_summary.total_calories} kcal (Target: ${initialProfile.calorieTarget})`, 16, y + 14);
    doc.text(`Protein: ${plan.nutrition_summary.total_protein_g}g (Target: ${initialProfile.proteinTarget}g)`, 75, y + 14);
    doc.text(`Carbs: ${plan.nutrition_summary.total_carbs_g}g`, 125, y + 14);
    doc.text(`Fat: ${plan.nutrition_summary.total_fat_g}g`, 165, y + 14);

    y += 26;

    // Consultation Notes
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text("Baymax Health Notes", 12, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    const notesLines = doc.splitTextToSize(plan.ai_notes, pageWidth - 24);
    doc.text(notesLines, 12, y);

    // Save PDF
    doc.save(`baymax-diet-plan-${dietPreference}.pdf`);
  };

  const formatActivityLevel = (level: string | null) => {
    if (!level) return 'Not set';
    return level.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const formatGoalType = (type: string) => {
    return type.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  // Staggered list container variants
  const listVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 25 },
    show: { 
      opacity: 1, 
      y: 0, 
      transition: { type: 'spring' as const, stiffness: 100, damping: 15 } 
    }
  };

  // Extracted list of all groceries for the future ready tab
  const getAggregatedGroceries = () => {
    if (!plan) return [];
    const itemsMap = new Map<string, string[]>();
    plan.meals.forEach(meal => {
      meal.items.forEach(item => {
        const key = item.name.toLowerCase().trim();
        const existing = itemsMap.get(key) || [];
        existing.push(item.portion);
        itemsMap.set(key, existing);
      });
    });
    return Array.from(itemsMap.entries()).map(([name, portions]) => ({
      name: name.replace(/\b\w/g, c => c.toUpperCase()),
      portions: portions.join(' + ')
    }));
  };

  return (
    <div className="space-y-8 print-container">
      {/* Inject custom printable CSS rules dynamically */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          /* Hide everything except the print-only report view */
          body > *:not(.print-container) {
            display: none !important;
          }
          header, .no-print, button, nav, .mobile-nav-bar {
            display: none !important;
          }
          body {
            background: white !important;
            color: black !important;
            font-size: 12px !important;
          }
          .glass-card {
            box-shadow: none !important;
            background: white !important;
            border: 1px solid #e5e7eb !important;
            page-break-inside: avoid;
            border-radius: 12px !important;
            margin-bottom: 12px !important;
          }
          .print-title {
            font-size: 24px !important;
            font-weight: 800 !important;
            color: #FF4B4B !important;
          }
        }
      `}} />

      {/* Heading Section */}
      <div className="flex flex-col space-y-2 no-print">
        <h2 className="text-3xl font-black tracking-tight flex items-center gap-2">
          <Sparkles className="w-8 h-8 text-primary animate-pulse" /> AI Diet Planner
        </h2>
        <p className="text-muted-foreground text-sm max-w-3xl leading-relaxed">
          Generate a personalized meal plan based on your body profile, fitness goals, dietary preferences, allergies, and nutritional requirements.
        </p>
      </div>

      {/* Main Grid Layout */}
      <div className="grid gap-6 lg:grid-cols-3 items-start">
        
        {/* Left Column: Profile Card & Options */}
        <div className="lg:col-span-1 space-y-6 no-print">
          <Card className="border border-zinc-200/50 dark:border-zinc-800/50 bg-white/55 dark:bg-zinc-900/30 backdrop-blur-xl rounded-[2.5rem] shadow-sm overflow-hidden">
            <CardHeader className="border-b border-zinc-150/40 dark:border-zinc-850/40 pb-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Heart className="w-5 h-5 text-primary" /> Body Profile Summary
              </CardTitle>
              <CardDescription>Metrics configured in your settings</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1 bg-zinc-50 dark:bg-zinc-950/20 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-850/30">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500">Name</span>
                  <p className="font-semibold text-zinc-850 dark:text-zinc-200 truncate">{initialProfile.fullName}</p>
                </div>
                <div className="space-y-1 bg-zinc-50 dark:bg-zinc-950/20 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-850/30">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500">Goal</span>
                  <p className="font-semibold text-primary">{formatGoalType(initialProfile.goalType)}</p>
                </div>
                <div className="space-y-1 bg-zinc-50 dark:bg-zinc-950/20 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-850/30">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500">Age</span>
                  <p className="font-semibold text-zinc-850 dark:text-zinc-200">{initialProfile.age ? `${initialProfile.age} yrs` : 'Not set'}</p>
                </div>
                <div className="space-y-1 bg-zinc-50 dark:bg-zinc-950/20 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-850/30">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500">Gender</span>
                  <p className="font-semibold text-zinc-850 dark:text-zinc-200 capitalize">{initialProfile.gender || 'Not set'}</p>
                </div>
                <div className="space-y-1 bg-zinc-50 dark:bg-zinc-950/20 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-850/30">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500">Height</span>
                  <p className="font-semibold text-zinc-850 dark:text-zinc-200">{initialProfile.heightCm ? `${initialProfile.heightCm} cm` : 'Not set'}</p>
                </div>
                <div className="space-y-1 bg-zinc-50 dark:bg-zinc-950/20 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-850/30">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500">Weight</span>
                  <p className="font-semibold text-zinc-850 dark:text-zinc-200">{initialProfile.currentWeightKg ? `${initialProfile.currentWeightKg} kg` : 'Not set'}</p>
                </div>
                <div className="col-span-2 space-y-1 bg-zinc-50 dark:bg-zinc-950/20 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-850/30">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500">Activity Level</span>
                  <p className="font-semibold text-zinc-850 dark:text-zinc-200 truncate">{formatActivityLevel(initialProfile.activityLevel)}</p>
                </div>
                <div className="col-span-2 space-y-1 bg-zinc-50 dark:bg-zinc-950/20 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-850/30">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500">Allergies / Restrictions</span>
                  <p className="font-semibold text-orange-550 dark:text-orange-400 truncate flex items-center gap-1.5">
                    {initialProfile.allergies !== 'None' ? <ShieldAlert className="w-3.5 h-3.5" /> : null}
                    {initialProfile.allergies}
                  </p>
                </div>
                <div className="col-span-2 space-y-1 bg-zinc-50 dark:bg-zinc-950/20 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-850/30">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500">Preferences</span>
                  <p className="font-semibold text-emerald-600 dark:text-emerald-400 truncate">{initialProfile.dietPreference}</p>
                </div>
              </div>

              {/* Target Calories Summary */}
              <div className="mt-5 p-3 rounded-2xl bg-zinc-100/50 dark:bg-zinc-850/40 border border-zinc-200/30 dark:border-zinc-850/30">
                <p className="text-xs text-zinc-500 font-bold mb-2 uppercase text-center tracking-wider">Macros Calorie Target</p>
                <div className="grid grid-cols-4 gap-1.5 text-center">
                  <div className="p-1 rounded-xl bg-orange-500/10 text-orange-550">
                    <span className="text-[9px] font-black block">CAL</span>
                    <span className="text-xs font-black">{initialProfile.calorieTarget}</span>
                  </div>
                  <div className="p-1 rounded-xl bg-blue-500/10 text-blue-550">
                    <span className="text-[9px] font-black block">PRO</span>
                    <span className="text-xs font-black">{initialProfile.proteinTarget}g</span>
                  </div>
                  <div className="p-1 rounded-xl bg-purple-500/10 text-purple-550">
                    <span className="text-[9px] font-black block">CARB</span>
                    <span className="text-xs font-black">{initialProfile.carbsTarget}g</span>
                  </div>
                  <div className="p-1 rounded-xl bg-yellow-500/10 text-yellow-550">
                    <span className="text-[9px] font-black block">FAT</span>
                    <span className="text-xs font-black">{initialProfile.fatTarget}g</span>
                  </div>
                </div>
              </div>

              {/* Diet Preference Selection */}
              <div className="mt-5 space-y-2">
                <Label className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 block tracking-wider">
                  Diet Preference
                </Label>
                <div className="grid grid-cols-3 gap-1 bg-zinc-100/80 dark:bg-zinc-950/40 p-1 rounded-2xl border border-zinc-200/40 dark:border-zinc-800/40">
                  <button
                    type="button"
                    onClick={() => setDietPreference('veg')}
                    className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      dietPreference === 'veg' 
                        ? 'bg-emerald-600 text-white shadow-sm' 
                        : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                    }`}
                  >
                    Veg
                  </button>
                  <button
                    type="button"
                    onClick={() => setDietPreference('non-veg')}
                    className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      dietPreference === 'non-veg' 
                        ? 'bg-red-500 text-white shadow-sm' 
                        : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                    }`}
                  >
                    Non-Veg
                  </button>
                  <button
                    type="button"
                    onClick={() => setDietPreference('mix')}
                    className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      dietPreference === 'mix' 
                        ? 'bg-primary text-white shadow-sm' 
                        : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                    }`}
                  >
                    Mix
                  </button>
                </div>
              </div>

              {!plan && !loading && (
                <Button 
                  onClick={() => handleGenerate(false)} 
                  className="w-full mt-6 bg-primary hover:bg-primary/95 text-white font-bold rounded-2xl shadow-md py-6 transition-all hover:scale-[1.02]"
                >
                  ✨ Generate Diet Plan
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Navigation/Expanders for Future Ready tabs (when plan is ready) */}
          {plan && (
            <Card className="border border-zinc-200/50 dark:border-zinc-800/50 bg-white/55 dark:bg-zinc-900/30 backdrop-blur-xl rounded-[2rem] shadow-sm">
              <CardContent className="p-3 space-y-1">
                <Button 
                  variant={activeTab === 'plan' ? 'default' : 'ghost'} 
                  onClick={() => setActiveTab('plan')}
                  className="w-full justify-start font-semibold rounded-xl text-sm"
                >
                  <Calendar className="w-4 h-4 mr-2.5" /> Plan Timeline
                </Button>
                <Button 
                  variant={activeTab === 'grocery' ? 'default' : 'ghost'} 
                  onClick={() => setActiveTab('grocery')}
                  className="w-full justify-start font-semibold rounded-xl text-sm"
                >
                  <ShoppingCart className="w-4 h-4 mr-2.5" /> Grocery List
                </Button>
                <Button 
                  variant={activeTab === 'weekly' ? 'default' : 'ghost'} 
                  onClick={() => setActiveTab('weekly')}
                  className="w-full justify-start font-semibold rounded-xl text-sm"
                >
                  <ListChecks className="w-4 h-4 mr-2.5" /> Weekly Planner
                </Button>
                <Button 
                  variant={activeTab === 'recipes' ? 'default' : 'ghost'} 
                  onClick={() => setActiveTab('recipes')}
                  className="w-full justify-start font-semibold rounded-xl text-sm"
                >
                  <ChefHat className="w-4 h-4 mr-2.5" /> Cooking Recipes
                </Button>
                <Button 
                  variant={activeTab === 'assistant' ? 'default' : 'ghost'} 
                  onClick={() => setActiveTab('assistant')}
                  className="w-full justify-start font-semibold rounded-xl text-sm"
                >
                  <Sparkles className="w-4 h-4 mr-2.5" /> AI Shopping Assistant
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Loading state, Generation display, printout views */}
        <div className="lg:col-span-2 print-container">
          
          {/* Loading Animation */}
          {loading && (
            <Card className="border border-zinc-200/50 dark:border-zinc-800/50 bg-white/55 dark:bg-zinc-900/30 backdrop-blur-xl rounded-[2.5rem] shadow-sm p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
              <div className="relative mb-6">
                <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                <Heart className="w-6 h-6 text-primary absolute inset-0 m-auto animate-pulse" />
              </div>
              <AnimatePresence mode="wait">
                <motion.p 
                  key={statusIdx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-zinc-700 dark:text-zinc-300 font-semibold tracking-wide"
                >
                  {statusPhrases[statusIdx]}
                </motion.p>
              </AnimatePresence>
              <p className="text-xs text-zinc-400 mt-2 font-medium">Please wait while Baymax consults healthcare guidelines.</p>
            </Card>
          )}

          {/* Error Message */}
          {error && !loading && (
            <Card className="border-red-200/50 dark:border-red-900/30 bg-red-50/20 dark:bg-red-950/10 rounded-[2rem] shadow-sm p-6 text-center text-red-600 dark:text-red-400">
              <ShieldAlert className="w-12 h-12 mx-auto mb-3" />
              <h3 className="font-bold text-lg">Analysis Error</h3>
              <p className="text-sm mt-1">{error}</p>
              <Button onClick={() => handleGenerate(false)} className="mt-4 bg-primary text-white rounded-xl">
                Try Again
              </Button>
            </Card>
          )}

          {/* Placeholder state */}
          {!plan && !loading && !error && (
            <Card className="border border-zinc-200/50 dark:border-zinc-800/50 bg-white/55 dark:bg-zinc-900/30 backdrop-blur-xl rounded-[2.5rem] shadow-sm p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
              <Apple className="w-16 h-16 text-zinc-350 dark:text-zinc-650 mb-4 animate-bounce" />
              <h3 className="font-bold text-zinc-850 dark:text-zinc-200 text-xl">No active diet plan found</h3>
              <p className="text-sm text-zinc-500 max-w-md mt-2">
                Click the generate button below or on your profile card to let Baymax construct a medically guided daily meal plan for you.
              </p>
              <Button onClick={() => handleGenerate(false)} className="mt-6 bg-primary text-white px-8 py-5 rounded-2xl font-bold shadow-md hover:scale-[1.02] transition-transform">
                ✨ Generate Plan Now
              </Button>
            </Card>
          )}

          {/* Plan display & alternate tabs */}
          {plan && !loading && !error && (
            <div className="space-y-6">

              {/* Action Ribbon (Download & Regen) */}
              <div className="flex gap-3 justify-end no-print">
                <Button 
                  onClick={() => handleGenerate(true)}
                  variant="outline" 
                  className="rounded-full bg-white/60 dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-800/50 font-bold hover:bg-zinc-50 text-sm"
                >
                  <RotateCcw className="w-4 h-4 mr-2" /> Regenerate Plan
                </Button>
                <Button 
                  onClick={handleDownloadPDF}
                  className="rounded-full bg-zinc-900 text-white dark:bg-zinc-150 dark:text-zinc-950 font-bold text-sm shadow-md transition-transform hover:scale-[1.02]"
                >
                  <FileText className="w-4 h-4 mr-2" /> Download PDF
                </Button>
              </div>

              {/* TAB 1: Plan Timeline View */}
              {activeTab === 'plan' && (
                <div className="space-y-6 print-container">
                  
                  {/* Print Title Header (Only displays during print) */}
                  <div className="hidden print:block mb-6 border-b pb-4 border-zinc-200">
                    <div className="flex justify-between items-center">
                      <div>
                        <h1 className="print-title">Agent Baymax Diet Report</h1>
                        <p className="text-xs text-zinc-500">Personalized Day Plan</p>
                      </div>
                      <div className="text-right text-xs text-zinc-500 font-medium">
                        <p>Date: {new Date().toLocaleDateString()}</p>
                        <p>User: {initialProfile.fullName}</p>
                      </div>
                    </div>
                    {/* Tiny profile stats printed */}
                    <div className="grid grid-cols-5 gap-2 mt-4 text-[11px] bg-zinc-50 p-2.5 rounded-lg border">
                      <div>Goal: <strong>{formatGoalType(initialProfile.goalType)}</strong></div>
                      <div>Age: <strong>{initialProfile.age || 'Not set'} yrs</strong></div>
                      <div>Weight: <strong>{initialProfile.currentWeightKg || 'Not set'} kg</strong></div>
                      <div>Preferences: <strong>{initialProfile.dietPreference}</strong></div>
                      <div>Allergies: <strong>{initialProfile.allergies}</strong></div>
                    </div>
                  </div>

                  {/* Staggered Meals */}
                  <motion.div 
                    variants={listVariants}
                    initial="hidden"
                    animate="show"
                    className="space-y-4 print-container"
                  >
                    {plan.meals.map((meal, idx) => (
                      <motion.div key={idx} variants={cardVariants}>
                        <Card className="glass-card border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl p-5 hover:shadow-md transition-shadow">
                          <div className="flex flex-col md:flex-row md:items-start gap-4">
                            
                            {/* Time badge */}
                            <div className="shrink-0 flex items-center gap-2 md:flex-col md:items-start">
                              <span className="text-xs uppercase font-extrabold px-2.5 py-1 bg-primary/10 text-primary rounded-full tracking-wider flex items-center gap-1.5">
                                <Timer className="w-3.5 h-3.5" /> {meal.time}
                              </span>
                              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest block md:mt-2.5">
                                {meal.meal_type.replace('_', ' ')}
                              </span>
                            </div>

                            {/* Content */}
                            <div className="flex-1 space-y-3">
                              <div className="flex justify-between items-start">
                                <h3 className="font-extrabold text-zinc-900 dark:text-zinc-100 text-lg leading-tight">
                                  {meal.title}
                                </h3>
                                <span className="text-sm font-black text-orange-550 shrink-0 ml-2">{meal.calories} kcal</span>
                              </div>

                              {/* Items & Portions list */}
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                {meal.items.map((food, fIdx) => (
                                  <span key={fIdx} className="text-xs bg-zinc-100 dark:bg-zinc-850/50 text-zinc-700 dark:text-zinc-300 border border-zinc-200/20 dark:border-zinc-800/30 px-2.5 py-0.5 rounded-full font-medium">
                                    {food.name} <span className="text-[10px] text-zinc-400 font-normal">({food.portion})</span>
                                  </span>
                                ))}
                              </div>

                              {/* Empathetic Recommendation */}
                              <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100/50 dark:border-emerald-900/20 rounded-2xl p-3 flex gap-2.5 items-start text-emerald-950 dark:text-emerald-100 leading-relaxed text-xs">
                                <Bot className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                <div>
                                  {meal.why_chosen}
                                </div>
                              </div>

                              {/* Localized macros badge */}
                              <div className="text-[11px] font-bold text-zinc-550 flex gap-3 pt-1 border-t border-zinc-100 dark:border-zinc-850/30">
                                <span>P: <span className="text-blue-550">{meal.protein_g}g</span></span>
                                <span>C: <span className="text-purple-550">{meal.carbs_g}g</span></span>
                                <span>F: <span className="text-yellow-550">{meal.fat_g}g</span></span>
                              </div>

                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                  </motion.div>

                  {/* Nutrition Summary Card at bottom */}
                  <Card className="glass-card border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl p-6 bg-zinc-50/30 dark:bg-zinc-950/10">
                    <h3 className="font-extrabold text-lg text-zinc-850 dark:text-zinc-150 mb-4 flex items-center gap-2">
                      <Flame className="w-5 h-5 text-orange-550" /> Daily Plan Nutrition Summary
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                      <div className="bg-orange-500/10 text-orange-550 p-3 rounded-2xl border border-orange-200/10">
                        <span className="text-[9px] uppercase font-bold tracking-wider block">Calories</span>
                        <p className="text-lg font-black mt-1">{plan.nutrition_summary.total_calories} kcal</p>
                        <span className="text-[9px] block text-zinc-400 mt-0.5">Target: {initialProfile.calorieTarget}</span>
                      </div>
                      <div className="bg-blue-500/10 text-blue-550 p-3 rounded-2xl border border-blue-200/10">
                        <span className="text-[9px] uppercase font-bold tracking-wider block">Protein</span>
                        <p className="text-lg font-black mt-1">{plan.nutrition_summary.total_protein_g}g</p>
                        <span className="text-[9px] block text-zinc-400 mt-0.5">Target: {initialProfile.proteinTarget}g</span>
                      </div>
                      <div className="bg-purple-500/10 text-purple-550 p-3 rounded-2xl border border-purple-200/10">
                        <span className="text-[9px] uppercase font-bold tracking-wider block">Carbohydrates</span>
                        <p className="text-lg font-black mt-1">{plan.nutrition_summary.total_carbs_g}g</p>
                        <span className="text-[9px] block text-zinc-400 mt-0.5">Target: {initialProfile.carbsTarget}g</span>
                      </div>
                      <div className="bg-yellow-500/10 text-yellow-550 p-3 rounded-2xl border border-yellow-200/10">
                        <span className="text-[9px] uppercase font-bold tracking-wider block">Fat</span>
                        <p className="text-lg font-black mt-1">{plan.nutrition_summary.total_fat_g}g</p>
                        <span className="text-[9px] block text-zinc-400 mt-0.5">Target: {initialProfile.fatTarget}g</span>
                      </div>
                      <div className="col-span-2 sm:col-span-1 bg-green-500/10 text-green-550 p-3 rounded-2xl border border-green-200/10">
                        <span className="text-[9px] uppercase font-bold tracking-wider block">Goal Match</span>
                        <p className="text-lg font-black mt-1">{plan.nutrition_summary.goal_match_percentage}%</p>
                        <span className="text-[9px] block text-zinc-450 mt-0.5">Fiber: {plan.nutrition_summary.total_fiber_g}g</span>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-4 justify-between items-center text-xs text-zinc-500 pt-3 border-t border-zinc-200/30 dark:border-zinc-800/30">
                      <div className="flex items-center gap-1">
                        <Info className="w-3.5 h-3.5" />
                        <span>Recommended Daily Hydration: <strong>{(plan.nutrition_summary.water_recommendation_ml / 1000).toFixed(1)}L</strong></span>
                      </div>
                      <div>
                        <span>Generated by Agent Baymax</span>
                      </div>
                    </div>
                  </Card>

                  {/* AI Note explaining the plan structure */}
                  <Card className="glass-card border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl p-5 bg-gradient-to-tr from-primary/5 to-orange-500/5 border-primary/25">
                    <div className="flex gap-3">
                      <div className="bg-primary/10 text-primary p-2 rounded-xl h-fit">
                        <Bot className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">Baymax Health Consultation Notes</h4>
                        <p className="text-xs text-zinc-650 dark:text-zinc-350 leading-relaxed font-medium">
                          {plan.ai_notes}
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {/* TAB 2: Future Ready Grocery List */}
              {activeTab === 'grocery' && (
                <Card className="border border-zinc-200/50 dark:border-zinc-800/50 bg-white/55 dark:bg-zinc-900/30 backdrop-blur-xl rounded-[2.5rem] shadow-sm p-6 space-y-4">
                  <div className="flex items-center gap-2 border-b pb-3 border-zinc-100 dark:border-zinc-850">
                    <ShoppingCart className="w-5 h-5 text-primary" />
                    <div>
                      <h3 className="font-bold text-lg">AI Grocery List Generator</h3>
                      <p className="text-xs text-zinc-400">Ingredients aggregated from today&apos;s plan</p>
                    </div>
                  </div>
                  <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-2">
                    {getAggregatedGroceries().map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/20 border border-zinc-150/40 dark:border-zinc-850/40 text-xs font-semibold text-zinc-850 dark:text-zinc-250">
                        <span className="flex items-center gap-2">
                          <input type="checkbox" className="w-3.5 h-3.5 accent-primary cursor-pointer" />
                          <span>{item.name}</span>
                        </span>
                        <span className="text-zinc-400 font-normal">Portions: {item.portions}</span>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 bg-zinc-100/30 dark:bg-zinc-950/10 rounded-2xl text-[10px] text-zinc-450 border border-zinc-200/20">
                    💡 <em>Tip: Checking items off will prepare you for your meal prep weekend! A smart shopping assistant sub-module will be added soon.</em>
                  </div>
                </Card>
              )}

              {/* TAB 3: Future Ready Weekly Planner */}
              {activeTab === 'weekly' && (
                <Card className="border border-zinc-200/50 dark:border-zinc-800/50 bg-white/55 dark:bg-zinc-900/30 backdrop-blur-xl rounded-[2.5rem] shadow-sm p-6 space-y-4">
                  <div className="flex justify-between items-center border-b pb-3 border-zinc-100 dark:border-zinc-850">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-primary" />
                      <div>
                        <h3 className="font-bold text-lg">7-Day Weekly Meal Calendar</h3>
                        <p className="text-xs text-zinc-400">Scale meal planning across the entire week</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-bold">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => (
                      <div key={idx} className={`p-2.5 rounded-xl border ${idx === 0 ? 'bg-primary/10 text-primary border-primary/25' : 'bg-zinc-50 dark:bg-zinc-950/20 border-zinc-200/20 text-zinc-400 dark:text-zinc-500'}`}>
                        <span className="block font-black">{day}</span>
                        <span className="text-[8px] font-normal block mt-1">{idx === 0 ? 'Active' : 'Locked'}</span>
                      </div>
                    ))}
                  </div>
                  <div className="bg-zinc-100/30 dark:bg-zinc-950/10 p-4 rounded-3xl border text-xs text-zinc-500 leading-relaxed">
                    🌟 <strong>Diet Plan Expansion Coming Soon</strong>: You will be able to synchronize calendar plans, save recipes for weekdays, and schedule daily notification reminders detailing what to prep the night before.
                  </div>
                </Card>
              )}

              {/* TAB 4: Future Ready Recipe Guide */}
              {activeTab === 'recipes' && (
                <Card className="border border-zinc-200/50 dark:border-zinc-800/50 bg-white/55 dark:bg-zinc-900/30 backdrop-blur-xl rounded-[2.5rem] shadow-sm p-6 space-y-4">
                  <div className="flex items-center gap-2 border-b pb-3 border-zinc-100 dark:border-zinc-850">
                    <ChefHat className="w-5 h-5 text-primary" />
                    <div>
                      <h3 className="font-bold text-lg">Cooking Instructions & Recipes</h3>
                      <p className="text-xs text-zinc-400">Simple prep guidelines for your plan</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {plan.meals.slice(0, 3).map((meal, idx) => (
                      <div key={idx} className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-950/20 border border-zinc-100 dark:border-zinc-850/30 text-xs">
                        <h4 className="font-bold text-zinc-950 dark:text-zinc-200">{meal.title}</h4>
                        <ol className="list-decimal pl-4 mt-2 text-zinc-500 space-y-1">
                          <li>Prep portions: {meal.items.map(f => `${f.name} (${f.portion})`).join(', ')}.</li>
                          <li>Follow standard clean cooking guidelines (minimal oil, steam or bake when possible).</li>
                          <li>Enjoy your meal and log it immediately in the Nutrition tab!</li>
                        </ol>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* TAB 5: Future Ready AI Assistant */}
              {activeTab === 'assistant' && (
                <Card className="border border-zinc-200/50 dark:border-zinc-800/50 bg-white/55 dark:bg-zinc-900/30 backdrop-blur-xl rounded-[2.5rem] shadow-sm p-6 space-y-4">
                  <div className="flex items-center gap-2 border-b pb-3 border-zinc-100 dark:border-zinc-850">
                    <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                    <div>
                      <h3 className="font-bold text-lg">AI Shopping Assistant</h3>
                      <p className="text-xs text-zinc-400">Substitute ingredients or query local store details</p>
                    </div>
                  </div>
                  <div className="flex gap-2 p-2 bg-zinc-50 dark:bg-zinc-950/20 border rounded-xl items-center text-xs text-zinc-400 italic">
                    <HelpCircle className="w-4 h-4 shrink-0" />
                    <span>Say something like: &quot;What is a good high-protein vegetarian replacement for chicken?&quot;</span>
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Ask the shopping assistant..." 
                      className="flex-1 bg-white/50 dark:bg-zinc-900/50 text-xs border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 focus:outline-none"
                      disabled
                    />
                    <Button disabled className="bg-primary text-white rounded-xl text-xs font-semibold px-4">Send</Button>
                  </div>
                </Card>
              )}

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
