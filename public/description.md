# Agent Baymax: Personal AI Healthcare Companion

**Agent Baymax** is an autonomous, multimodal AI healthcare and wellness companion designed to eliminate the friction of traditional fitness tracking through empathetic conversation and clinical intelligence. Powered primarily by the open-source **Gemma 4 26B** model with resilient **Gemini 3.5 Flash Lite** fallback, Baymax pairs state-of-the-art AI engineering with an approachable bedside manner.

### Core Architecture & Capabilities
* **Primary Open-Source Model (Gemma 4 26B)**: Drives platform-wide clinical reasoning, 7-day meal planning, and multimodal vision, falling back to Gemini 3.5 Flash Lite during high traffic.
* **Multimodal Vision Meal Journaling**: Instantly identifies foods, calculates portion sizes, and estimates macronutrients from uploaded photos using Gemma 4 vision.
* **Empathetic Reasoning & Memory**: Asynchronously extracts dietary preferences, health goals, and medical sensitivities into long-term memory to personalize coaching.
* **Clinical Health Engine**: Computes BMR and TDEE dynamically via Mifflin-St Jeor formulations, adjusting calorie targets and macro distributions for personal goals.
* **Grounded Medical RAG**: Employs Supabase `pgvector` with 768-dimensional text embeddings to validate guidance against verified clinical literature.
* **Smart Hydration Assistant**: Features dynamic SVG hydration rings, workout fluid multipliers, and historical trends.

Agent Baymax transforms preventive health into a proactive, continuous, and frictionless daily experience.
