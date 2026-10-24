'use client';

import { useEffect } from 'react';
import { HeartPulse } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // In production, this error would be automatically logged by Vercel.
    console.error('Global Application Error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center bg-[#FFFFFF] dark:bg-[#0A0A0A] p-4 text-center">
        <div className="h-16 w-16 bg-[#FF4B4B] rounded-full flex items-center justify-center mb-6 shadow-lg shadow-red-500/20 animate-pulse">
          <HeartPulse className="text-white h-8 w-8" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-[#171717] dark:text-[#FAFAFA] mb-4">
          I am experiencing a critical malfunction.
        </h1>
        <p className="text-[#737373] dark:text-[#A3A3A3] max-w-md mb-8">
          A fatal error occurred. I have logged the diagnostic data. Please attempt to reset my systems.
        </p>
        <Button 
          onClick={() => reset()} 
          className="rounded-full bg-[#FF4B4B] hover:bg-[#E03C3C] text-white px-8 h-12 text-lg"
        >
          Reset Baymax
        </Button>
      </body>
    </html>
  );
}
