'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Bot, Flame, ChevronDown, Info, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export interface DetectedItem {
  name: string;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface MealLog {
  id: string;
  food_name: string;
  serving_size: string | null;
  calories: number;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  logged_at: string;
  meal_analysis: {
    health_score: number | null;
    ai_feedback: string | null;
    image_url: string | null;
    detected_items?: DetectedItem[] | null;
    confidence?: number | null;
    confidence_explanation?: string | null;
  } | null;
}

interface MealFeedProps {
  logs: MealLog[];
}

export function MealFeed({ logs }: MealFeedProps) {
  if (!logs || logs.length === 0) {
    return (
      <Card className="shadow-sm border border-zinc-200/50 dark:border-zinc-800/50 bg-white/55 dark:bg-zinc-900/30 backdrop-blur-xl">
        <CardContent className="flex flex-col items-center justify-center p-12 text-center text-zinc-500">
          <Flame className="h-12 w-12 text-zinc-300 mb-4 animate-pulse" />
          <p className="font-semibold text-zinc-700 dark:text-zinc-300">No meals logged today.</p>
          <p className="text-sm text-zinc-400 mt-1">Use the Smart Logger above to track your nutrition!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {logs.map((log) => (
        <Card key={log.id} className="shadow-sm overflow-hidden border border-zinc-200/50 dark:border-zinc-800/50 bg-white/55 dark:bg-zinc-900/30 backdrop-blur-xl hover:shadow-md transition-all duration-300 rounded-[2.5rem]">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-start">
            {/* Image (if exists) */}
            {log.meal_analysis?.image_url && (
              <div className="p-4 sm:p-5 shrink-0">
                <div className="w-full sm:w-48 h-48 sm:h-48 rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-850 relative border border-zinc-200/50 dark:border-zinc-800/30">
                  <img 
                    src={log.meal_analysis.image_url} 
                    alt={log.food_name} 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}
            
            <div className={`flex-1 p-5 md:p-6 flex flex-col justify-between ${log.meal_analysis?.image_url ? 'sm:pl-0' : ''}`}>
              <div>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 capitalize">
                      {log.food_name}
                    </h3>
                    {log.serving_size && (
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                        Overall Serving: {log.serving_size}
                      </p>
                    )}
                    
                    {/* Confidence score indicator */}
                    {log.meal_analysis?.confidence !== undefined && log.meal_analysis?.confidence !== null && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium">AI Confidence:</span>
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                          log.meal_analysis.confidence >= 85 
                            ? 'bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 border border-green-150/40 dark:border-green-900/30' 
                            : 'bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 border border-orange-150/40 dark:border-orange-900/30'
                        }`}>
                          {log.meal_analysis.confidence}%
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col items-end">
                    <span className="text-xl font-black text-orange-500">{log.calories} kcal</span>
                    <span className="text-xs text-zinc-400 mt-1 font-semibold">
                      {new Date(log.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* Detected food item tags */}
                {log.meal_analysis?.detected_items && log.meal_analysis.detected_items.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {log.meal_analysis.detected_items.map((item, idx) => (
                      <span key={idx} className="text-xs bg-zinc-150/50 dark:bg-zinc-800/40 text-zinc-650 dark:text-zinc-300 px-2.5 py-1 rounded-full font-medium border border-zinc-250/30 dark:border-zinc-700/30">
                        {item.name} ({item.portion})
                      </span>
                    ))}
                  </div>
                )}

                {/* Low confidence warning explanation */}
                {log.meal_analysis?.confidence_explanation && (
                  <div className="mt-3 flex items-start gap-2 text-xs text-orange-600 dark:text-orange-400 bg-orange-50/50 dark:bg-orange-950/10 p-2.5 rounded-xl border border-orange-200/30 dark:border-orange-900/20">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-orange-500" />
                    <div>
                      {log.meal_analysis.confidence_explanation}
                    </div>
                  </div>
                )}

                {/* Macros Overview */}
                <div className="flex gap-4 text-xs font-semibold text-zinc-600 dark:text-zinc-400 mt-3.5 bg-zinc-100/50 dark:bg-zinc-850/50 p-2.5 rounded-2xl inline-flex border border-zinc-200/30 dark:border-zinc-800/30">
                  <span>Protein: <span className="text-blue-600 dark:text-blue-400">{log.protein_g || 0}g</span></span>
                  <span>Carbs: <span className="text-purple-600 dark:text-purple-400">{log.carbs_g || 0}g</span></span>
                  <span>Fat: <span className="text-yellow-600 dark:text-yellow-500">{log.fat_g || 0}g</span></span>
                </div>

                {/* Expandable breakdown section */}
                {log.meal_analysis?.detected_items && log.meal_analysis.detected_items.length > 0 && (
                  <details className="mt-3.5 group border border-zinc-200/30 dark:border-zinc-800/30 rounded-2xl overflow-hidden bg-zinc-100/10 dark:bg-zinc-900/10">
                    <summary className="list-none flex items-center justify-between p-3 cursor-pointer text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-850 dark:hover:text-zinc-200 transition-colors select-none">
                      <span className="flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-zinc-450" /> How this was estimated
                      </span>
                      <ChevronDown className="w-4 h-4 text-zinc-400 transition-transform duration-250 group-open:rotate-180" />
                    </summary>
                    <div className="p-3 pt-0 border-t border-zinc-200/20 dark:border-zinc-800/20 text-xs">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[320px]">
                          <thead>
                            <tr className="text-zinc-400 dark:text-zinc-500 border-b border-zinc-200/30 dark:border-zinc-800/30">
                              <th className="py-2 font-semibold">Food Item (Portion)</th>
                              <th className="py-2 font-semibold text-right">Calories</th>
                              <th className="py-2 font-semibold text-right">Protein</th>
                              <th className="py-2 font-semibold text-right">Carbs</th>
                              <th className="py-2 font-semibold text-right">Fat</th>
                            </tr>
                          </thead>
                          <tbody>
                            {log.meal_analysis.detected_items.map((item, idx) => (
                              <tr key={idx} className="border-b border-zinc-100/30 dark:border-zinc-850/20 text-zinc-600 dark:text-zinc-400">
                                <td className="py-2.5 font-medium text-zinc-800 dark:text-zinc-200">
                                  {item.name} <span className="text-[10px] text-zinc-455 dark:text-zinc-500 font-normal">({item.portion})</span>
                                </td>
                                <td className="py-2.5 text-right font-semibold text-zinc-850 dark:text-zinc-150">{item.calories} kcal</td>
                                <td className="py-2.5 text-right">{item.protein}g</td>
                                <td className="py-2.5 text-right">{item.carbs}g</td>
                                <td className="py-2.5 text-right">{item.fat}g</td>
                              </tr>
                            ))}
                            {/* Summarized total row inside the dropdown for reference */}
                            <tr className="font-bold text-zinc-800 dark:text-zinc-200 bg-zinc-150/10 dark:bg-zinc-850/10">
                              <td className="py-2.5 px-1">Total</td>
                              <td className="py-2.5 text-right text-orange-500">{log.calories} kcal</td>
                              <td className="py-2.5 text-right">{log.protein_g || 0}g</td>
                              <td className="py-2.5 text-right">{log.carbs_g || 0}g</td>
                              <td className="py-2.5 text-right">{log.fat_g || 0}g</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </details>
                )}
              </div>

              {/* AI Feedback */}
              {log.meal_analysis?.ai_feedback && (
                <div className="mt-4 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 rounded-2xl border border-emerald-100/50 dark:border-emerald-900/30 flex gap-3 shadow-sm backdrop-blur-sm">
                  <div className="bg-emerald-100 dark:bg-emerald-900/50 p-1.5 rounded-xl h-fit shrink-0">
                    <Bot className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Baymax Analysis</span>
                      {log.meal_analysis.health_score !== null && (
                        <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 px-2 py-0.5 rounded-full font-extrabold border border-emerald-250/20">
                          Score: {log.meal_analysis.health_score}/100
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-emerald-950 dark:text-emerald-100 prose prose-sm max-w-none leading-relaxed">
                      <ReactMarkdown>{log.meal_analysis.ai_feedback}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
