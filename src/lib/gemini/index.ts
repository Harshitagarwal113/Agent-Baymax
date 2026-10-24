import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export const PRIMARY_MODEL = 'models/gemma-4-26b-a4b-it';
export const FALLBACK_MODEL = 'models/gemini-3.5-flash-lite';

export const getGeminiModel = () => PRIMARY_MODEL;

export const generateResponse = async (prompt: string, systemInstruction?: string) => {
  try {
    const response = await ai.models.generateContent({
      model: PRIMARY_MODEL,
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });
    return response.text;
  } catch (error) {
    console.warn(`[AI] Primary model ${PRIMARY_MODEL} failed, switching to fallback ${FALLBACK_MODEL}:`, error);
    try {
      const fallbackResponse = await ai.models.generateContent({
        model: FALLBACK_MODEL,
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });
      return fallbackResponse.text;
    } catch (fallbackError) {
      console.error('Error calling AI fallback:', fallbackError);
      throw new Error('Failed to generate response from Agent Baymax');
    }
  }
};

export default ai;
