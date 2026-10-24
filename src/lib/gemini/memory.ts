import { createGoogleGenerativeAI } from '@ai-sdk/google';

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});
import { generateObject, ModelMessage } from 'ai';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

// Define the schema for extracting memories
const memoryExtractionSchema = z.object({
  operations: z.array(z.object({
    action: z.enum(['INSERT', 'UPDATE', 'DELETE']),
    memory_id: z.string().optional().describe('Required if action is UPDATE or DELETE. Must match the exact ID of the existing memory.'),
    category: z.enum(['preferences', 'dietary', 'health_goals', 'favorites', 'exercise', 'medical']).describe('The category of the memory.'),
    content: z.string().describe('The actual memory text (e.g. "User is allergic to peanuts").'),
    importance: z.number().min(1).max(5).describe('How important this memory is from 1-5 (5 being critical like allergies).')
  }))
});

export interface AgentMemory {
  id: string;
  user_id: string;
  category: string;
  content: string;
  importance: number;
  created_at: string;
  updated_at: string;
}

/**
 * Fetches all memories for a user.
 * @param token The user's access token to authenticate with Supabase.
 */
export async function getUserMemories(token: string): Promise<AgentMemory[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data, error } = await supabase
    .from('agent_memory')
    .select('*')
    .order('importance', { ascending: false });

  if (error) {
    console.error('Error fetching memories:', error);
    return [];
  }

  return data as AgentMemory[];
}

/**
 * Formats a list of memories into a single string for prompt injection.
 */
export function formatMemoriesForPrompt(memories: AgentMemory[]): string {
  if (memories.length === 0) return '';
  
  let formatted = 'IMPORTANT USER CONTEXT (Remember this):\n';
  memories.forEach(m => {
    formatted += `- [${m.category.toUpperCase()}] ${m.content}\n`;
  });
  
  return formatted;
}

/**
 * Runs asynchronously to extract new facts from the chat and store them.
 */
export async function extractAndStoreMemory(userId: string, messages: ModelMessage[], token: string, existingMemories: AgentMemory[]) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    // Filter to just the recent conversation text to save tokens
    const recentMessages = messages.slice(-5);
    
    // Create context of existing memories so the AI knows what to UPDATE/DELETE
    const existingMemoriesContext = existingMemories.length > 0 
      ? `\n\nEXISTING MEMORIES (For Reference):\n${existingMemories.map(m => `[ID: ${m.id}] [${m.category}] ${m.content}`).join('\n')}`
      : '\n\nEXISTING MEMORIES: None.';

    const systemPrompt = `You are the memory extraction engine for Baymax, a healthcare AI assistant.
Your job is to analyze the recent conversation and identify if any NEW, IMPORTANT, LONG-TERM facts about the user should be remembered.
Look for: Dietary restrictions, allergies, health goals, exercise routines, and persistent preferences.
DO NOT extract transient things (e.g. "I am hungry right now").
If you find a new fact, output an INSERT operation.
If a user contradicts an existing memory (e.g. "I am no longer vegan"), output a DELETE or UPDATE operation using the exact existing ID.
If nothing new is found, output an empty operations array.
${existingMemoriesContext}`;

    let object;
    try {
      const res = await generateObject({
        model: google('models/gemma-4-26b-a4b-it'),
        schema: memoryExtractionSchema,
        system: systemPrompt,
        messages: recentMessages,
      });
      object = res.object;
    } catch (primaryErr) {
      console.warn('[Memory] Primary model Gemma 4 26B failed, falling back to Gemini 3.5 Flash Lite:', primaryErr);
      const res = await generateObject({
        model: google('models/gemini-3.5-flash-lite'),
        schema: memoryExtractionSchema,
        system: systemPrompt,
        messages: recentMessages,
      });
      object = res.object;
    }

    // Process the operations
    for (const op of object.operations) {
      if (op.action === 'INSERT') {
        await supabase.from('agent_memory').insert({
          user_id: userId,
          category: op.category,
          content: op.content,
          importance: op.importance || 1
        });
        console.log(`[Memory] INSERTED: ${op.content}`);
      } 
      else if (op.action === 'UPDATE' && op.memory_id) {
        await supabase.from('agent_memory')
          .update({
            category: op.category,
            content: op.content,
            importance: op.importance
          })
          .eq('id', op.memory_id)
          .eq('user_id', userId);
        console.log(`[Memory] UPDATED: ${op.memory_id} to ${op.content}`);
      } 
      else if (op.action === 'DELETE' && op.memory_id) {
        await supabase.from('agent_memory')
          .delete()
          .eq('id', op.memory_id)
          .eq('user_id', userId);
        console.log(`[Memory] DELETED: ${op.memory_id}`);
      }
    }
  } catch (error) {
    console.error('[Memory] Background extraction failed:', error);
  }
}
