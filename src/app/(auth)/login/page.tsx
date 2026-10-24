'use client';

import { login } from '@/actions/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { AlertCircle } from 'lucide-react';
import { useActionState, useEffect } from 'react';

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, null);

  // Clear session storage on landing (logout completion)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('baymax_chat_messages');
    }
  }, []);

  return (
    <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500 mx-auto mt-20">
      <Card className="w-full max-w-md shadow-sm border-[#E5E5E5] dark:border-[#262626] rounded-[1.5rem] bg-white dark:bg-[#171717]">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <Image
              src="/logo.png"
              alt="Baymax"
              width={48}
              height={48}
              className="h-12 w-12 rounded-full object-cover"
              priority
            />
          </div>
          <CardTitle className="text-2xl font-bold text-[#171717] dark:text-[#FAFAFA]">Welcome to Baymax</CardTitle>
          <CardDescription className="text-[#737373] dark:text-[#A3A3A3]">
            Log in to continue your healthcare journey
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={formAction} className="space-y-4">
            {state?.error && (
              <div className="p-3 text-sm bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-lg flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {state.error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#171717] dark:text-[#FAFAFA]">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="hiro@sanfransokyo.edu"
                required
                className="bg-[#F5F5F5] dark:bg-[#262626] border-none rounded-lg h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#171717] dark:text-[#FAFAFA]">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                className="bg-[#F5F5F5] dark:bg-[#262626] border-none rounded-lg h-12"
              />
            </div>
            <Button type="submit" disabled={pending} className="w-full bg-[#FF4B4B] hover:bg-[#E03C3C] text-white rounded-full h-12 text-lg shadow-lg shadow-red-500/20 disabled:opacity-70">
              {pending ? 'Logging in...' : 'Log In'}
            </Button>
          </form>

          <div className="text-center text-sm text-[#737373] dark:text-[#A3A3A3] pt-2">
            Need a companion?{' '}
            <Link href="/signup" className="text-[#FF4B4B] hover:underline font-medium">
              Create an account
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
