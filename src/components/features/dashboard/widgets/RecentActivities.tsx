import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Droplet, Flame, MessageSquare } from 'lucide-react';

interface RecentActivity {
  id: string;
  type: string;
  title: string;
  desc: string;
  time: string;
  imageUrl?: string;
}

interface RecentActivitiesProps {
  activities: RecentActivity[];
}

export function RecentActivities({ activities }: RecentActivitiesProps) {
  const getIconProps = (type: string) => {
    switch (type) {
      case 'food':
        return { icon: Flame, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/30', border: 'border-orange-100 dark:border-orange-900/30' };
      case 'water':
        return { icon: Droplet, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-100 dark:border-blue-900/30' };
      case 'exercise':
        return { icon: Activity, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-100 dark:border-emerald-900/30' };
      case 'chat':
      default:
        return { icon: MessageSquare, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-950/30', border: 'border-purple-100 dark:border-purple-900/30' };
    }
  };

  return (
    <Card className="col-span-1 md:col-span-1 lg:col-span-2 border border-zinc-100 dark:border-zinc-800 bg-white/55 dark:bg-zinc-900/30 backdrop-blur-md shadow-sm rounded-[2rem] p-2 flex flex-col h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-bold text-zinc-800 dark:text-zinc-100">
          Timeline logs
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="space-y-3.5 h-full">
          {activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Activity className="h-8 w-8 text-zinc-300 dark:text-zinc-700 mb-2 stroke-1" />
              <p className="text-sm text-zinc-400 font-medium">No recent activity logs.</p>
            </div>
          ) : (
            activities.map((item) => {
              const { icon: Icon, color, bg, border } = getIconProps(item.type);
              return (
                <div 
                  key={item.id} 
                  className="flex items-center p-3.5 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/50 hover:bg-white dark:hover:bg-zinc-900 border border-transparent hover:border-zinc-150 dark:hover:border-zinc-800/80 shadow-none hover:shadow-sm transition-all duration-300 group cursor-pointer"
                >
                  <div className={`flex items-center justify-center h-10 w-10 rounded-xl border ${border} ${bg} mr-4 shrink-0 group-hover:scale-105 transition-transform duration-300 overflow-hidden`}>
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.desc} className="h-full w-full object-cover" />
                    ) : (
                      <Icon className={`h-5 w-5 ${color}`} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100 truncate">{item.title}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{item.desc}</p>
                  </div>
                  <div className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 shrink-0 pl-2">
                    {item.time}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
