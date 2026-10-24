import { createGoogleGenerativeAI } from '@ai-sdk/google';

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});
import { generateObject } from 'ai';
import { z } from 'zod';

const nutritionAnalysisSchema = z.object({
  food_name: z.string().describe('A concise name of the overall meal.'),
  serving_size: z.string().describe('Estimated overall serving size (e.g. "1 plate", "500g").'),
  calories: z.number().describe('Estimated total calories (must sum up the detected items).'),
  protein_g: z.number().describe('Estimated total protein in grams (must sum up the detected items).'),
  carbs_g: z.number().describe('Estimated total carbohydrates in grams (must sum up the detected items).'),
  fat_g: z.number().describe('Estimated total fat in grams (must sum up the detected items).'),
  health_score: z.number().min(0).max(100).describe('A score from 0 to 100 on how healthy this meal is (100 being excellent).'),
  ai_feedback: z.string().describe('Personalized, friendly, and encouraging feedback from Baymax based on the user profile goals and constraints.'),
  confidence: z.number().min(0).max(100).describe('Overall confidence percentage (0-100) of the analysis.'),
  confidence_explanation: z.string().describe('Explanation if confidence is lower (<85%), highlighting which food item or sauce could not be verified safely. Empty string if fully confident.'),
  detected_items: z.array(z.object({
    name: z.string().describe('Name of the detected food item (e.g. "Grilled Chicken Breast").'),
    portion: z.string().describe('Estimated portion size for this item (e.g. "180g", "200g").'),
    calories: z.number().describe('Estimated calories for this item.'),
    protein: z.number().describe('Protein in grams for this item.'),
    carbs: z.number().describe('Carbohydrates in grams for this item.'),
    fat: z.number().describe('Fat in grams for this item.')
  })).describe('Individual list of detected food items and their estimated portions and nutrition.')
});

export type NutritionAnalysis = z.infer<typeof nutritionAnalysisSchema>;

/**
 * Analyzes a meal using Gemini Vision/Text.
 */
export async function analyzeMeal(
  textDescription?: string, 
  imageBuffer?: Buffer, 
  mimeType?: string,
  profileContext?: string
): Promise<NutritionAnalysis> {
  const messages: Array<
    | { type: 'text'; text: string }
    | { type: 'image'; image: Buffer; mimeType: string }
  > = [];
  
  if (imageBuffer && mimeType) {
    messages.push({
      type: 'image',
      image: imageBuffer,
      mimeType: mimeType,
    });
  }
  
  if (textDescription) {
    messages.push({
      type: 'text',
      text: textDescription
    });
  }

  // If we don't have either, throw error
  if (messages.length === 0) {
    throw new Error('Must provide either text description or image for analysis.');
  }

  // The Vercel AI SDK expects `messages` in a specific structure for generateObject
  const systemPrompt = `You are Baymax, a personal healthcare companion. 
Your task is to analyze the user's meal based on the provided text description and/or image.
Identify every visible food item individually and estimate portion sizes realistically.
Be as accurate as possible with your macro and calorie estimations.
Ensure that the sum of the individual detected items' calories and macros exactly matches the total calories and macros returned.

Provide a health score (0-100) and highly personalized, friendly feedback.
${profileContext ? `\nHere is the user profile context:\n${profileContext}\nEnsure your feedback directly references these health goals, target calories/macros (e.g., how much protein this meal contributes towards their goal, or warning them if they are close to/over calorie targets), allergies (warn if any ingredient is a risk), and dietary preferences (e.g. pescatarian).` : ''}

If there's any ambiguity or if you are unsure of certain items (e.g., sauces, dressings, hidden ingredients), reflect this in the confidence score (set it lower, e.g. <85%) and provide an explanation in the 'confidence_explanation' field.`;

  try {
    const { object } = await generateObject({
      model: google('models/gemma-4-26b-a4b-it'), // Using Gemma 4 26B multimodal vision
      schema: nutritionAnalysisSchema,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: messages
        }
      ],
    });
    return object;
  } catch (primaryErr) {
    console.warn('[Nutrition] Primary model Gemma 4 26B failed, falling back to Gemini 3.5 Flash Lite:', primaryErr);
    const { object } = await generateObject({
      model: google('models/gemini-3.5-flash-lite'), // Fast, high-accuracy multimodal vision fallback
      schema: nutritionAnalysisSchema,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: messages
        }
      ],
    });
    return object;
  }
}

