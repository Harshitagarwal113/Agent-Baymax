'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Utensils, Droplet, MessageSquare, User, LogOut, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import { logout } from '@/actions/auth';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Nutrition', href: '/dashboard/nutrition', icon: Utensils },
  { name: 'Diet Planner', href: '/dashboard/diet-planner', icon: ClipboardList },
  { name: 'Water', href: '/dashboard/water', icon: Droplet },
  { name: 'Baymax Chat', href: '/chat', icon: MessageSquare },
  { name: 'Profile', href: '/profile', icon: User },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-4 z-50 w-[95%] max-w-7xl mx-auto rounded-full bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-md transition-all duration-300">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-2.5">
          <Image
            src="/logo.png"
            alt="Baymax"
            width={36}
            height={36}
            className="h-9 w-9 rounded-full object-cover shadow-md shadow-red-500/20"
            priority
          />
          <span className="text-lg font-black tracking-tight text-zinc-900 dark:text-zinc-50">Baymax</span>
        </div>

        {/* Desktop Nav */}
        <div className="hidden md:flex md:items-center md:gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                prefetch={true}
                className={cn(
                  'flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-full transition-all duration-300 hover:scale-102',
                  isActive 
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 shadow-sm' 
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100/50 dark:hover:bg-zinc-900/50'
                )}
              >
                <Icon className={cn('h-4.5 w-4.5', isActive ? 'text-red-500' : 'text-zinc-400')} />
                {item.name}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center">
          <form action={logout}>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-full border border-zinc-200/60 dark:border-zinc-800/60 bg-zinc-55/20 hover:bg-zinc-100 dark:hover:bg-zinc-900 px-4 py-2 text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-all duration-300"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </form>
        </div>
      </div>

      {/* Mobile Nav (Bottom Bar simulation for small screens) */}
      <div className="fixed bottom-4 left-4 right-4 z-50 flex h-16 items-center justify-around rounded-full bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-lg md:hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              prefetch={true}
              className={cn(
                'flex flex-col items-center justify-center gap-1.5 px-3 py-1 text-[10px] font-bold transition-all duration-300',
                isActive 
                  ? 'text-red-500 scale-105' 
                  : 'text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              )}
            >
              <Icon className={cn('h-5 w-5', isActive ? 'stroke-[2.5px]' : '')} />
              {item.name}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
