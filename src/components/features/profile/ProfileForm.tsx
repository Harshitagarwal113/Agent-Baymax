'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { updateProfile } from '@/actions/profile';

const profileSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  age: z.number().min(1, 'Age must be positive'),
  height_cm: z.number().min(50, 'Height must be valid'),
  gender: z.enum(['male', 'female', 'other']),
  activity_level: z.enum(['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active']),
  current_weight_kg: z.number().min(20, 'Weight must be valid'),
  weight_goal_kg: z.number().min(20, 'Goal weight must be valid'),
  goal_type: z.enum(['lose_weight', 'maintain', 'build_muscle']),
  daily_water_target_ml: z.number().min(500, 'Must be at least 500ml').max(10000, 'Please set a safe amount'),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface ProfileFormProps {
  initialData: {
    profile: {
      full_name?: string | null;
      age?: number | null;
      height_cm?: number | null;
      gender?: string | null;
      activity_level?: string | null;
    } | null;
    goals: {
      current_weight_kg?: number | null;
      weight_goal_kg?: number | null;
      goal_type?: "lose_weight" | "maintain" | "build_muscle" | null;
      daily_water_target_ml?: number | null;
    } | null;
  };
}

export function ProfileForm({ initialData }: ProfileFormProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: initialData.profile?.full_name || '',
      age: initialData.profile?.age || 30,
      height_cm: initialData.profile?.height_cm || 170,
      gender: (initialData.profile?.gender || 'other') as "male" | "female" | "other",
      activity_level: (initialData.profile?.activity_level || 'sedentary') as "sedentary" | "lightly_active" | "moderately_active" | "very_active" | "extra_active",
      current_weight_kg: initialData.goals?.current_weight_kg || 70,
      weight_goal_kg: initialData.goals?.weight_goal_kg || 70,
      goal_type: (initialData.goals?.goal_type || 'maintain') as z.infer<typeof profileSchema>['goal_type'],
      daily_water_target_ml: initialData.goals?.daily_water_target_ml || 2000,
    }
  });

  const onSubmit = async (data: ProfileFormValues) => {
    setIsPending(true);
    setSuccess(false);
    try {
      await updateProfile(data);
      setSuccess(true);
      router.refresh();
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update profile';
      alert(message);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto border border-zinc-200/50 dark:border-zinc-800/50 bg-white/55 dark:bg-zinc-900/30 backdrop-blur-xl shadow-sm rounded-[2.5rem] p-2">
      <CardHeader>
        <CardTitle className="text-2xl">Physical Profile</CardTitle>
        <CardDescription>
          Update your metrics. Baymax will automatically recalculate your daily BMR, TDEE, and optimal macro targets.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input {...register('full_name')} />
            {errors.full_name && <p className="text-sm text-red-500">{errors.full_name.message}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Age (years)</Label>
              <Input type="number" {...register('age', { valueAsNumber: true })} />
              {errors.age && <p className="text-sm text-red-500">{errors.age.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Gender</Label>
              <select 
                {...register('gender')}
                className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 dark:border-zinc-800 dark:bg-zinc-950 dark:ring-offset-zinc-950 dark:focus-visible:ring-zinc-300"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Height (cm)</Label>
              <Input type="number" step="0.1" {...register('height_cm', { valueAsNumber: true })} />
              {errors.height_cm && <p className="text-sm text-red-500">{errors.height_cm.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Activity Level</Label>
              <select 
                {...register('activity_level')}
                className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 dark:border-zinc-800 dark:bg-zinc-950 dark:ring-offset-zinc-950 dark:focus-visible:ring-zinc-300"
              >
                <option value="sedentary">Sedentary (office job, little exercise)</option>
                <option value="lightly_active">Lightly Active (1-3 days/week)</option>
                <option value="moderately_active">Moderately Active (3-5 days/week)</option>
                <option value="very_active">Very Active (6-7 days/week)</option>
                <option value="extra_active">Extra Active (physical job & training)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Current Weight (kg)</Label>
              <Input type="number" step="0.1" {...register('current_weight_kg', { valueAsNumber: true })} />
              {errors.current_weight_kg && <p className="text-sm text-red-500">{errors.current_weight_kg.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Target Weight (kg)</Label>
              <Input type="number" step="0.1" {...register('weight_goal_kg', { valueAsNumber: true })} />
              {errors.weight_goal_kg && <p className="text-sm text-red-500">{errors.weight_goal_kg.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Primary Goal</Label>
              <select 
                {...register('goal_type')}
                className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 dark:border-zinc-800 dark:bg-zinc-950 dark:ring-offset-zinc-950 dark:focus-visible:ring-zinc-300"
              >
                <option value="lose_weight">Lose Weight (Fat Loss)</option>
                <option value="maintain">Maintain Current State</option>
                <option value="build_muscle">Build Muscle (Hypertrophy)</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Daily Water Goal (ml)</Label>
              <Input type="number" step="100" {...register('daily_water_target_ml', { valueAsNumber: true })} />
              {errors.daily_water_target_ml && <p className="text-sm text-red-500">{errors.daily_water_target_ml.message}</p>}
            </div>
          </div>

          <Button type="submit" disabled={isPending} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700">
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {isPending ? 'Calculating Metrics...' : 'Save & Calculate Targets'}
          </Button>

          {success && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-md text-sm font-medium">
              Profile updated! Baymax has recalculated your optimal macro targets.
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
