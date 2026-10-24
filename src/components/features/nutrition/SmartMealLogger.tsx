'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { logMealAction } from '@/actions/nutrition';
import { Camera, Image as ImageIcon, Loader2, Send } from 'lucide-react';

export function SmartMealLogger() {
  const [isPending, setIsPending] = useState(false);
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const url = URL.createObjectURL(selectedFile);
      setPreview(url);
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text && !file) return;

    setIsPending(true);
    try {
      const formData = new FormData();
      if (text) formData.append('text', text);
      if (file) formData.append('image', file);
      formData.append('mealType', 'snack'); // In a real app, you could add a selector

      await logMealAction(formData);
      
      setText('');
      clearFile();
    } catch (error) {
      console.error('Failed to log meal:', error);
      alert('Failed to log meal. See console.');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card className="border border-zinc-200/50 dark:border-zinc-800/50 bg-white/55 dark:bg-zinc-900/30 backdrop-blur-xl shadow-sm rounded-[2.5rem] p-2">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Log a Meal</CardTitle>
        <CardDescription>Describe what you ate or snap a picture.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mealDesc">What did you have?</Label>
            <Input 
              id="mealDesc"
              placeholder="e.g. A bowl of oatmeal with blueberries..." 
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={isPending}
            />
          </div>
          
          <div className="flex items-center gap-4">
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
            />
            
            {preview ? (
              <div className="relative w-24 h-24 rounded-md overflow-hidden border border-zinc-200">
                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                <button 
                  type="button" 
                  onClick={clearFile}
                  className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 text-xs"
                >
                  X
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isPending}
                >
                  <Camera className="w-4 h-4 mr-2" /> Photo
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isPending}
                >
                  <ImageIcon className="w-4 h-4 mr-2" /> Gallery
                </Button>
              </div>
            )}
          </div>

          <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={isPending || (!text && !file)}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing with Baymax...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" /> Log Meal
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
