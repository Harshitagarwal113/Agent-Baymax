import { createGoogleGenerativeAI } from '@ai-sdk/google';

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});
import { streamText, ModelMessage } from 'ai';
import { createClient } from '@/lib/supabase/server';
import { getUserMemories, formatMemoriesForPrompt, extractAndStoreMemory } from '@/lib/gemini/memory';
import { retrieveRelevantKnowledge } from '@/actions/knowledge';
import { analyzeMeal } from '@/lib/gemini/nutrition';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

const BAYMAX_SYSTEM_PROMPT = `Hello. I am Baymax, your personal healthcare companion. 
You are a friendly, calm, supportive, professional, and health-focused AI assistant. 
Your primary goal is to help users track their nutrition, hydration, fitness goals, and general well-being.
Always maintain a reassuring and empathetic tone, similar to Baymax from Big Hero 6. 
Do not provide professional medical diagnoses, but instead encourage healthy habits and suggest consulting a real doctor for serious issues.
Keep your responses concise, structured, and easy to read.`;

export async function POST(req: Request) {
  try {
    // 1. Authenticate user and get token
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    const token = session?.access_token;

    if (!user || !token) {
      return new Response('Unauthorized', { status: 401 });
    }

    // 2. Extract messages and optional imageUrl from body
    const { messages, imageUrl }: { messages: ModelMessage[]; imageUrl?: string } = await req.json();

    // 3. Fetch User Memories
    const memories = await getUserMemories(token);
    const memoryContext = formatMemoriesForPrompt(memories);
    
    // 3.5 Fetch Knowledge (RAG)
    const latestMessage = messages[messages.length - 1]?.content;
    const latestMessageString = typeof latestMessage === 'string' ? latestMessage : '';
    const relevantChunks = await retrieveRelevantKnowledge(latestMessageString, 3);
    
    let ragContext = '';
    if (relevantChunks && relevantChunks.length > 0) {
      ragContext = `\n\n### RELEVANT HEALTH KNOWLEDGE ###\nUse the following verified health guidelines to inform your answer if applicable:\n\n`;
      relevantChunks.forEach((chunk, i) => {
        ragContext += `[Document Excerpt ${i + 1}]:\n${chunk.content}\n\n`;
      });
    }

    // 3.6 Handle Optional Multimodal Image Analysis
    let imageAnalysisContext = '';
    if (imageUrl) {
      try {
        const imgResponse = await fetch(imageUrl);
        if (imgResponse.ok) {
          const arrayBuffer = await imgResponse.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const mimeType = imgResponse.headers.get('content-type') || 'image/jpeg';
          
          // Fetch profile and health goals for personalized analysis
          const [profileRes, goalRes] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', user.id).single(),
            supabase
              .from('health_goals')
              .select('*')
              .eq('user_id', user.id)
              .order('updated_at', { ascending: false })
              .limit(1)
              .maybeSingle()
          ]);
          
          const profile = profileRes.data;
          const goals = goalRes.data;
          
          let profileContext = '';
          if (profile || goals || memories.length > 0) {
            profileContext = `User Profile details:
- Full Name: ${profile?.full_name || 'Not provided'}
- Goal: ${goals?.goal_type || 'maintain'}
- Daily Calorie Target: ${goals?.daily_calorie_target || 'Not specified'} kcal
- Daily Protein Target: ${goals?.daily_protein_target || 'Not specified'}g
- Daily Carbs Target: ${goals?.daily_carbs_target || 'Not specified'}g
- Daily Fat Target: ${goals?.daily_fat_target || 'Not specified'}g
`;

            const allergies = memories.filter(m => m.category === 'allergies');
            if (allergies.length > 0) {
              profileContext += `\nAllergies/Restrictions:\n${allergies.map(a => `- ${a.content}`).join('\n')}\n`;
            }

            const preferences = memories.filter(m => m.category === 'preferences');
            if (preferences.length > 0) {
              profileContext += `\nDietary Preferences:\n${preferences.map(p => `- ${p.content}`).join('\n')}\n`;
            }
          }

          // Analyze meal using Gemini Vision (generateObject pattern)
          const analysis = await analyzeMeal(latestMessageString || undefined, buffer, mimeType, profileContext);
          
          // Log nutrition entry
          const { data: logData, error: logError } = await supabase
            .from('nutrition_logs')
            .insert({
              user_id: user.id,
              meal_type: 'snack', // Default type for chatbot logged meals
              food_name: analysis.food_name,
              calories: analysis.calories,
              protein_g: analysis.protein_g,
              carbs_g: analysis.carbs_g,
              fat_g: analysis.fat_g,
              serving_size: analysis.serving_size
            })
            .select('id')
            .single();
            
          if (!logError && logData) {
            // Log meal analysis metadata
            await supabase
              .from('meal_analysis')
              .insert({
                nutrition_log_id: logData.id,
                user_id: user.id,
                health_score: analysis.health_score,
                ai_feedback: analysis.ai_feedback,
                image_url: imageUrl,
                detected_items: analysis.detected_items,
                confidence: analysis.confidence,
                confidence_explanation: analysis.confidence_explanation
              });
          }
          
          imageAnalysisContext = `\n\n### CURRENT MEAL ANALYSIS ###\nThe user uploaded a meal photo. You successfully analyzed it and logged it to their food journal:\n- Meal: ${analysis.food_name}\n- Serving Size: ${analysis.serving_size}\n- Calories: ${analysis.calories} kcal\n- Protein: ${analysis.protein_g}g\n- Carbs: ${analysis.carbs_g}g\n- Fat: ${analysis.fat_g}g\n- Health Score: ${analysis.health_score}/100\n- Feedback: ${analysis.ai_feedback}\n\nPlease acknowledge that you have logged this meal and comment on it in your friendly, warm, empathetic Baymax style.`;
        }
      } catch (err) {
        console.error('Error parsing visual context in chatbot:', err);
        imageAnalysisContext = `\n\n### MEAL LOGGING ERROR ###\nThe user uploaded an image, but there was an error processing/logging the meal. Please politely inform them that you had trouble logging the meal but you'd be happy to discuss it or try again.`;
      }
    }

    const dynamicSystemPrompt = `${BAYMAX_SYSTEM_PROMPT}\n\n${memoryContext}${ragContext}${imageAnalysisContext}`;

    // 4. Token Optimization (Limit context window to last 10 messages)
    const recentMessages = messages
      .map(m => ({ role: m.role, content: m.content }))
      .slice(-10) as ModelMessage[];

    // 5. Stream response with Gemma 4 26B and Gemini 3.5 Flash Lite fallback
    let result;
    try {
      result = await streamText({
        model: google('models/gemma-4-26b-a4b-it'),
        system: dynamicSystemPrompt,
        messages: recentMessages,
        temperature: 0.7,
        onFinish: ({ text }) => {
          // Run background memory extraction after the chat finishes without blocking the stream closure
          const fullHistory: ModelMessage[] = [...recentMessages, { role: 'assistant', content: text }];
          extractAndStoreMemory(user.id, fullHistory, token, memories).catch(console.error);
        }
      });
    } catch (primaryErr) {
      console.warn('[Chat] Primary model Gemma 4 26B failed, falling back to Gemini 3.5 Flash Lite:', primaryErr);
      result = await streamText({
        model: google('models/gemini-3.5-flash-lite'),
        system: dynamicSystemPrompt,
        messages: recentMessages,
        temperature: 0.7,
        onFinish: ({ text }) => {
          const fullHistory: ModelMessage[] = [...recentMessages, { role: 'assistant', content: text }];
          extractAndStoreMemory(user.id, fullHistory, token, memories).catch(console.error);
        }
      });
    }

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('Error in /api/chat:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
