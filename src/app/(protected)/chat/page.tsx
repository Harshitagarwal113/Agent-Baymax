import { ChatInterface } from '@/components/features/chat/ChatInterface';
import { getAuthenticatedUser } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Chat with Baymax - Agent Baymax',
  description: 'Your personal AI healthcare companion',
};

export default async function ChatPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)]">
      <ChatInterface />
    </div>
  );
}
