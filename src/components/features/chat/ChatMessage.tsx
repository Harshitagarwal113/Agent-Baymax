import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { HeartPulse, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion } from 'framer-motion';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'data';
  content: string;
  imageUrl?: string;
}

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isAssistant = message.role === 'assistant';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={cn('flex w-full px-4 py-4', isAssistant ? 'justify-start' : 'justify-end')}
    >
      <div className={cn('flex max-w-[85%] gap-4', isAssistant ? 'flex-row' : 'flex-row-reverse')}>
        
        {/* Avatar */}
        <Avatar className="h-10 w-10 shrink-0 border-2 border-white shadow-sm mt-auto">
          {isAssistant ? (
            <>
              <AvatarFallback className="bg-[#FF4B4B] text-white">
                <HeartPulse className="h-6 w-6" />
              </AvatarFallback>
            </>
          ) : (
            <>
              <AvatarFallback className="bg-[#F5F5F5] text-[#171717] dark:bg-[#262626] dark:text-[#FAFAFA]">
                <User className="h-6 w-6" />
              </AvatarFallback>
            </>
          )}
        </Avatar>

        {/* Bubble */}
        <div
          className={cn(
            'flex flex-col space-y-2 px-6 py-4 rounded-3xl shadow-sm',
            isAssistant 
              ? 'glass-card border-white/40 dark:border-white/10 text-foreground rounded-bl-none'
              : 'bg-gradient-to-br from-primary to-orange-500 text-white rounded-br-none shadow-primary/20 shadow-lg'
          )}
        >
          {message.imageUrl && (
            <div className="mb-2 max-w-sm rounded-2xl overflow-hidden border border-white/20 shadow-md">
              <img src={message.imageUrl} alt="Uploaded attachment" className="w-full max-h-60 object-cover" />
            </div>
          )}
          <div className={cn("prose prose-sm md:prose-base max-w-none break-words whitespace-pre-wrap leading-relaxed", isAssistant ? "prose-zinc dark:prose-invert" : "prose-invert")}>
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
