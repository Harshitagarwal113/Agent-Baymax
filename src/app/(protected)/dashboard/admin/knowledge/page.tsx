'use client';

import { useState } from 'react';
import { uploadKnowledgeDocument } from '@/actions/knowledge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Loader2, UploadCloud } from 'lucide-react';

export default function KnowledgeUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const result = await uploadKnowledgeDocument(formData);
      
      alert(`Success! Generated ${result.chunkCount} vector chunks for Baymax.`);
      setFile(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to upload document.';
      alert(message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 max-w-4xl mx-auto w-full">
      <div className="flex flex-col space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">RAG Knowledge Base</h2>
        <p className="text-muted-foreground">
          Upload PDF guides. Baymax will read, chunk, and remember them using Gemini Embeddings and pgvector.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload Document</CardTitle>
          <CardDescription>Only PDF files are supported currently.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center justify-center w-full">
              <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-64 border-2 border-zinc-300 border-dashed rounded-lg cursor-pointer bg-zinc-50 dark:hover:bg-bray-800 dark:bg-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:hover:border-zinc-500 dark:hover:bg-zinc-600">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {file ? (
                    <>
                      <FileText className="w-10 h-10 text-emerald-500 mb-3" />
                      <p className="mb-2 text-sm font-semibold">{file.name}</p>
                      <p className="text-xs text-zinc-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-10 h-10 text-zinc-400 mb-3" />
                      <p className="mb-2 text-sm text-zinc-500 dark:text-zinc-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">PDF documents only</p>
                    </>
                  )}
                </div>
                <input 
                  id="dropzone-file" 
                  type="file" 
                  className="hidden" 
                  accept="application/pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </label>
            </div> 
            
            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              disabled={!file || isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing & Embedding...
                </>
              ) : (
                'Upload & Train Baymax'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
