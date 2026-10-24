import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Activity, Droplet, MessageCircleHeart } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center bg-[#FFFFFF] dark:bg-[#0A0A0A]">
      
      {/* Navbar Minimal */}
      <header className="w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="Baymax"
            width={32}
            height={32}
            className="h-8 w-8 rounded-full object-cover"
            priority
          />
          <span className="font-bold text-xl tracking-tight text-[#171717] dark:text-[#FAFAFA]">Baymax</span>
        </div>
        <div className="flex gap-4">
          <Link href="/login">
            <Button variant="ghost" className="rounded-full text-[#737373] hover:text-[#171717] dark:hover:text-[#FAFAFA]">Sign In</Button>
          </Link>
          <Link href="/signup">
            <Button className="rounded-full bg-[#FF4B4B] hover:bg-[#E03C3C] text-white shadow-lg shadow-red-500/20">Get Started</Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-20 md:py-32 flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-8 duration-1000">
        
        <div className="inline-flex items-center rounded-full border border-[#E5E5E5] dark:border-[#262626] bg-[#F5F5F5] dark:bg-[#171717] px-3 py-1 text-sm font-medium text-[#737373] dark:text-[#A3A3A3] mb-8">
          <span className="flex h-2 w-2 rounded-full bg-[#FF4B4B] mr-2 animate-pulse"></span>
          Your Personal Healthcare Companion
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-[#171717] dark:text-[#FAFAFA] mb-6 max-w-4xl">
          Hello. I am Baymax.<br />
          <span className="text-[#FF4B4B]">How would you rate your pain?</span>
        </h1>
        
        <p className="text-lg md:text-xl text-[#737373] dark:text-[#A3A3A3] max-w-2xl mb-10 leading-relaxed">
          I will monitor your physical profile, analyze your meals, and ensure your daily hydration. 
          My primary protocol is to improve your well-being.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md mx-auto">
          <Link href="/signup" className="w-full">
            <Button size="lg" className="w-full rounded-full bg-[#FF4B4B] hover:bg-[#E03C3C] text-white shadow-xl shadow-red-500/20 text-lg h-14">
              Begin Health Assessment
            </Button>
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24 w-full">
          
          <div className="flex flex-col items-center text-center p-8 rounded-[2rem] bg-[#F5F5F5] dark:bg-[#171717] transition-transform hover:-translate-y-1">
            <div className="h-14 w-14 rounded-full bg-white dark:bg-[#0A0A0A] flex items-center justify-center shadow-sm mb-6">
              <Activity className="h-6 w-6 text-[#FF4B4B]" />
            </div>
            <h3 className="font-bold text-[#171717] dark:text-[#FAFAFA] text-lg mb-2">Dynamic Profiles</h3>
            <p className="text-[#737373] dark:text-[#A3A3A3] text-sm">
              My physics engine automatically calculates your BMR and optimal targets based on your unique goals.
            </p>
          </div>

          <div className="flex flex-col items-center text-center p-8 rounded-[2rem] bg-[#F5F5F5] dark:bg-[#171717] transition-transform hover:-translate-y-1">
            <div className="h-14 w-14 rounded-full bg-white dark:bg-[#0A0A0A] flex items-center justify-center shadow-sm mb-6">
              <MessageCircleHeart className="h-6 w-6 text-[#FF4B4B]" />
            </div>
            <h3 className="font-bold text-[#171717] dark:text-[#FAFAFA] text-lg mb-2">Multimodal AI Engine</h3>
            <p className="text-[#737373] dark:text-[#A3A3A3] text-sm">
              Upload photos of your food. I will analyze the contents, estimate macros, and provide supportive feedback.
            </p>
          </div>

          <div className="flex flex-col items-center text-center p-8 rounded-[2rem] bg-[#F5F5F5] dark:bg-[#171717] transition-transform hover:-translate-y-1">
            <div className="h-14 w-14 rounded-full bg-white dark:bg-[#0A0A0A] flex items-center justify-center shadow-sm mb-6">
              <Droplet className="h-6 w-6 text-[#FF4B4B]" />
            </div>
            <h3 className="font-bold text-[#171717] dark:text-[#FAFAFA] text-lg mb-2">Hydration Rings</h3>
            <p className="text-[#737373] dark:text-[#A3A3A3] text-sm">
              Close your daily rings with my gamified water tracker, designed to keep your hydration optimal.
            </p>
          </div>

        </div>

      </main>
    </div>
  );
}
