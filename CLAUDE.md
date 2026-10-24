# Agent Baymax 🤖🩺 - Developer & Agent Brain

This file serves as the core context, codebase reference, and development guide for Agent Baymax. Refer to this file to understand the architecture, project structure, conventions, and run commands before exploring or making changes to the codebase.

---

## 🚀 Commands & Development Workflow

- **Install dependencies**: `npm install`
- **Start development server**: `npm run dev`
- **Build production app**: `npm run build`
- **Lint code**: `npm run lint`
- **Database init**: SQL commands located in [init_database.sql](file:///c:/Users/kapil/Desktop/Agent-Baymax-V2/supabase/init_database.sql)

---

## 🛠️ Technology Stack

- **Core Framework**: Next.js 16.2 (App Router, Turbopack) & React 19
- **Aesthetics & Styling**: Tailwind CSS v4, custom glassmorphism utilities & CSS variables (defined in [globals.css](file:///c:/Users/kapil/Desktop/Agent-Baymax-V2/src/app/globals.css)), Framer Motion for micro-animations, Lucide Icons
- **Backend & Authentication**: Supabase (Postgres + pgvector for RAG), Supabase Auth (SSR), Supabase Storage for meal photo uploads
- **Caching & Rate Limiting**: Upstash Redis (sliding window rate limiters)
- **AI Integrations**: Vercel AI SDK (`ai` & `@ai-sdk/google`) and Google Gen AI SDK (`@google/genai`)
- **Validation**: Zod + React Hook Form + hookform resolvers

---

## 📂 Codebase Directory Structure

```
Agent-Baymax-V2/
├── supabase/                    # Database migrations & schemas
│   └── init_database.sql        # Database initialization & RLS policies
├── src/
│   ├── actions/                 # Next.js Server Actions (mutations & queries)
│   │   ├── auth.ts              # Signup, login, signout, OAuth flow
│   │   ├── dashboard.ts         # User metrics aggregation
│   │   ├── knowledge.ts         # Admin document upload/parsing/embedding triggers
│   │   ├── nutrition.ts         # Meal log creations, vision analysis, history
│   │   ├── profile.ts           # Profile initialization & Mifflin-St Jeor updates
│   │   └── water.ts             # Hydration log tracking, targets, history
│   │
│   ├── app/                     # Next.js Routing
│   │   ├── (auth)/              # Authentication pages (login, signup)
│   │   ├── (protected)/         # Authenticated route layouts & templates
│   │   │   ├── chat/            # Empathetic Healthcare Companion Chat interface
│   │   │   ├── dashboard/       # Main dashboard layout, nutrition & hydration pages
│   │   │   └── profile/         # Health profile customization
│   │   ├── api/                 # API endpoints
│   │   │   └── chat/            # Streaming Gemini completion endpoint with memory triggers
│   │   ├── auth/                # OAuth callback logic
│   │   └── globals.css          # Tailwind configurations & theme styles
│   │
│   ├── components/              # UI Component Layer
│   │   ├── ui/                  # Atom-level reusable controls (shadcn-based)
│   │   ├── layout/              # Structural wrappers (Navbar.tsx)
│   │   └── features/            # Feature-specific panels (chat, nutrition, hydration)
│   │
│   ├── lib/                     # System Utilities
│   │   ├── gemini/              # Embedding client, memory logic, meal vision parsing
│   │   ├── rag/                 # RAG document chunking logic
│   │   ├── supabase/            # SSR/Server/Client database connections
│   │   └── ratelimit.ts         # Upstash Redis connection & sliding window limiter
│   │
│   └── proxy.ts                 # Dev environment proxy
```

---

## 🧠 Core System Workflows & Implementations

### 1. Mifflin-St Jeor Caloric & Macro Engine
Calculations for BMR & TDEE based on physical profiles are handled in [profile.ts](file:///c:/Users/kapil/Desktop/Agent-Baymax-V2/src/actions/profile.ts):
- **BMR (Male)**: $10 \times \text{weight (kg)} + 6.25 \times \text{height (cm)} - 5 \times \text{age (yrs)} + 5$
- **BMR (Female)**: $10 \times \text{weight (kg)} + 6.25 \times \text{height (cm)} - 5 \times \text{age (yrs)} - 161$
- **Macros**: Target proteins based on activity/weight; 25% fats; rest allocated to carbohydrates.

### 2. Chat Streaming & Long-Term Memory Extraction
- Chat stream API endpoint is located in [route.ts](file:///c:/Users/kapil/Desktop/Agent-Baymax-V2/src/app/api/chat/route.ts).
- Memory extraction is run asynchronously using `extractAndStoreMemory` in [memory.ts](file:///c:/Users/kapil/Desktop/Agent-Baymax-V2/src/lib/gemini/memory.ts) upon completion of chat sessions. It extracts facts, preferences, and allergens to persist them into Supabase.

### 3. RAG Grounding Search
- Grounded data queries are processed using an HNSW Cosine Similarity search over document chunks via the `match_document_chunks` RPC function in Supabase.
- Document chunks are vectorized using Google's `embedding-001` model in [embedding.ts](file:///c:/Users/kapil/Desktop/Agent-Baymax-V2/src/lib/gemini/embedding.ts).

### 4. Multimodal Food Vision
- Food pictures are parsed via `gemini-3.1-flash-lite` utilizing Vercel AI SDK's `generateObject` with strict schema validation in [nutrition.ts](file:///c:/Users/kapil/Desktop/Agent-Baymax-V2/src/lib/gemini/nutrition.ts).

### 5. AI Diet Planner
- Dynamic 7-day meal timelines are composed via `gemini-3.1-flash-lite` using Zod schema models, responding to vegetarian/non-vegetarian/mixed toggles.
- Supports client-side reports export building (via custom `jsPDF` structures) to initiate immediate downloads bypassing browser print previews.

### 6. AI-Powered Hydration Assistant
- Hydration targets recalculate dynamically based on body weight baseline ($35\text{ml/kg}$), active multipliers, and fitness goal offsets.
- Toggling "Workout Day" adds 800ml for hydration sweat recovery and commits updates to Supabase, which triggers dashboard updates.
- Real-time SVG circular trackers, interactive Recharts trend graphs, and streaks widgets reflect changes instantly.

---

## 🎨 Styling & Design Aesthetics Guidelines

- **Theme**: Premium dark mode by default, featuring high glassmorphism contrast, harmonized neon color accents (never raw/flat primary colors), subtle radial glow layers, and smooth spring-based micro-animations (Framer Motion).
- **Core CSS Classes**: Use modern Tailwind utility patterns combined with native CSS variables defined under `@theme` in [globals.css](file:///c:/Users/kapil/Desktop/Agent-Baymax-V2/src/app/globals.css).

---

## 🛡️ Coding Guidelines & Conventions

1. **Next.js & React 19 conventions**:
   - Always read the Next.js instructions before developing new pages (some Next.js API surface behaviors vary in newer Next.js 16/React 19 builds).
   - Use server components for data fetching and Server Actions for data mutations.
2. **Supabase SSR Clients**:
   - Create Supabase client instances dynamically using the utility functions in `src/lib/supabase/`:
     - Server Component: `createServerClient` from [server.ts](file:///c:/Users/kapil/Desktop/Agent-Baymax-V2/src/lib/supabase/server.ts)
     - Client Component: `createClient` from [client.ts](file:///c:/Users/kapil/Desktop/Agent-Baymax-V2/src/lib/supabase/client.ts)
     - Middleware: `updateSession` from [middleware.ts](file:///c:/Users/kapil/Desktop/Agent-Baymax-V2/src/lib/supabase/middleware.ts)
3. **Error Handling & Types**:
   - Strong typing is mandatory; avoid `any` in TypeScript.
   - Wrap server actions and external API requests in `try/catch` and return consistent result objects (e.g. `{ success: boolean, data?: T, error?: string }`).
4. **Rate Limiting**:
   - Perform IP-based rate limiting via Upstash Redis before executing expensive AI calls (vision/chat API completions).
