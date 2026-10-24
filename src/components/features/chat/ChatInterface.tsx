'use client';

import { ChatMessage } from './ChatMessage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, AlertCircle, RefreshCcw, HeartPulse, ImageIcon, X, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface ChatMsg {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'data';
  content: string;
  imageUrl?: string;
}

export function ChatInterface() {
  const [localInput, setLocalInput] = useState('');
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const isLoaded = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  // Load chat history from sessionStorage on mount
  useEffect(() => {
    const saved = sessionStorage.getItem('baymax_chat_messages');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Defer state update to next microtask to avoid synchronous cascading renders warning
        Promise.resolve().then(() => {
          setMessages(parsed);
          isLoaded.current = true;
        });
        return;
      } catch (e) {
        console.error('Failed to parse saved chat history:', e);
      }
    }
    isLoaded.current = true;
  }, []);

  // Sync chat history to sessionStorage on updates
  useEffect(() => {
    if (isLoaded.current) {
      sessionStorage.setItem('baymax_chat_messages', JSON.stringify(messages));
    }
  }, [messages]);

  const reload = () => {
    // Basic reload placeholder if needed
  };
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'auto', block: 'end' });
    }
  }, [messages, isLoading]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!localInput.trim() && !file) || isLoading || isUploading) return;
    
    const userText = localInput.trim();
    setLocalInput('');
    setIsLoading(true);
    setError(null);

    let imageUrl = '';
    if (file) {
      setIsUploading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        if (!user) throw new Error('You must be logged in to upload photos');

        const ext = file.name.split('.').pop() || 'jpg';
        const filename = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('food-images')
          .upload(filename, file, {
            contentType: file.type,
            upsert: false
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('food-images')
          .getPublicUrl(filename);
          
        imageUrl = publicUrl;
      } catch (err: unknown) {
        console.error('Image upload failed:', err);
        const errMsg = err instanceof Error ? err.message : 'Image upload failed';
        setError(new Error(errMsg));
        setIsLoading(false);
        setIsUploading(false);
        return;
      } finally {
        setIsUploading(false);
      }
    }

    const userMessage: ChatMsg = { 
      id: Date.now().toString(), 
      role: 'user', 
      content: userText || 'Analyzed this meal photo.', 
      imageUrl: imageUrl || undefined 
    };
    
    const currentMessages = [...messages, userMessage];
    setMessages(currentMessages);
    clearFile();

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: currentMessages, imageUrl: imageUrl || undefined })
      });

      if (!response.ok) throw new Error('Failed to connect to Baymax');
      if (!response.body) throw new Error('No stream available');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      let messageAppended = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        assistantContent += chunk;

        if (!messageAppended) {
          messageAppended = true;
          setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: assistantContent }]);
        } else {
          setMessages(prev => {
            const newMsgs = [...prev];
            newMsgs[newMsgs.length - 1] = { ...newMsgs[newMsgs.length - 1], content: assistantContent };
            return newMsgs;
          });
        }
      }
    } catch (err) {
      console.error(err);
      setError(err as Error);
      setMessages(prev => prev.slice(0, -1)); // remove empty assistant message on error
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[80vh] w-full max-w-4xl mx-auto overflow-hidden relative rounded-[2.5rem] border border-zinc-200/50 dark:border-zinc-800/50 bg-white/50 dark:bg-zinc-900/30 backdrop-blur-xl shadow-md p-2">
      {/* Header */}
      <div className="flex flex-col items-center justify-center p-4 mb-1">
        <h2 className="font-black tracking-tight text-2xl text-zinc-800 dark:text-zinc-50">Chat with Baymax</h2>
        <p className="text-xs font-semibold text-zinc-500 mt-0.5">Your personal healthcare companion</p>
      </div>

      {/* Chat Area */}
      <ScrollArea className="flex-1 min-h-0 p-0">
        {messages.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center justify-center h-full p-8 text-center text-muted-foreground mt-10"
          >
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
              <div className="relative h-24 w-24 bg-gradient-to-tr from-primary to-orange-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-primary/20">
                <HeartPulse className="h-10 w-10" />
              </div>
            </div>
            <p className="font-medium text-2xl text-foreground">Hello. I am Baymax.</p>
            <p className="max-w-xs mx-auto mt-3 text-base">How would you rate your pain on a scale of 1 to 10?</p>
          </motion.div>
        ) : (
          <div className="flex flex-col pb-4">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {isLoading && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
              <div className="flex w-full px-4 py-4 justify-start">
                <div className="flex max-w-[85%] gap-4 flex-row">
                  <div className="h-10 w-10 shrink-0 border-2 border-white shadow-sm mt-auto rounded-full bg-[#FF4B4B] text-white flex items-center justify-center">
                    <div className="h-6 w-6 flex items-center justify-center">
                      <div className="flex space-x-1">
                        <div className="h-1.5 w-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="h-1.5 w-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="h-1.5 w-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        
        {error && (
          <div className="p-4 m-4 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>An error occurred while connecting to Baymax.</span>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => reload()} className="h-8 gap-1">
              <RefreshCcw className="h-3 w-3" /> Retry
            </Button>
          </div>
        )}
        
        {/* Invisible element to scroll to */}
        <div ref={scrollRef} />
        {/* Spacer inside the scroll area so content isn't hidden behind the floating input */}
        <div className="h-32 w-full shrink-0" />
      </ScrollArea>

      {/* Floating Input Area */}
      <div className="absolute bottom-4 left-4 right-4 md:bottom-6 md:left-8 md:right-8 z-10 pointer-events-none flex flex-col items-center">
        {previewUrl && (
          <div className="relative mb-2 w-20 h-20 rounded-xl overflow-hidden border border-zinc-200/50 dark:border-zinc-800/50 shadow-md bg-white dark:bg-zinc-900 pointer-events-auto">
            <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
            <button 
              type="button" 
              onClick={clearFile}
              className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 text-xs hover:bg-black/80 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        <form onSubmit={onSubmit} className="flex w-full gap-2 p-1.5 bg-white/90 dark:bg-zinc-950/90 border border-zinc-200/50 dark:border-zinc-800/50 shadow-lg rounded-full mx-auto max-w-2xl pointer-events-auto backdrop-blur-md items-center">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className="hidden" 
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || isUploading}
            className="rounded-full h-10 w-10 shrink-0 ml-1 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          >
            {isUploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ImageIcon className="h-5 w-5" />
            )}
          </Button>
          <Input
            value={localInput}
            onChange={(e) => setLocalInput(e.target.value)}
            placeholder="Type your message or upload a meal..."
            className="flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 px-2 text-base"
            disabled={isLoading || isUploading}
          />
          <Button 
            type="submit" 
            disabled={isLoading || isUploading || (!localInput.trim() && !file)}
            className="bg-primary hover:bg-primary/90 text-white rounded-full px-6 h-12 shadow-md shadow-primary/20 transition-all hover:scale-105"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Send className="h-5 w-5 md:mr-2" />
                <span className="hidden md:inline font-medium">Send</span>
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
