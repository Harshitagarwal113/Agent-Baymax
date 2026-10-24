'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

async function redirectBasedOnProfile(userId: string) {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, age')
    .eq('id', userId)
    .single();

  if (profile && profile.full_name && profile.age) {
    redirect('/dashboard');
  } else {
    redirect('/profile');
  }
}

export async function login(prevState: unknown, formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  if (data?.user) {
    await redirectBasedOnProfile(data.user.id);
  }

  redirect('/profile');
}

export async function signup(prevState: unknown, formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  // If email verification is enabled in Supabase, session will be null/undefined.
  // In that case, instruct the user to verify their email instead of redirecting.
  if (data?.user && !data.session) {
    return { success: 'Signup successful! Please check your email for a confirmation link before logging in.' };
  }

  if (data?.user && data.session) {
    await redirectBasedOnProfile(data.user.id);
  }

  redirect('/profile');
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export async function loginWithGoogle() {
  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${siteUrl}/auth/callback`,
    },
  });

  if (data.url) {
    redirect(data.url);
  }

  if (error) {
    throw new Error(error.message);
  }
}
