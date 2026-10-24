# Agent Baymax 🤖🩺 — Personal AI Healthcare Companion

> **"Hello. I am Baymax, your personal healthcare companion."**  
> An autonomous, multimodal healthcare and wellness companion designed to monitor physical profiles, analyze meals via computer vision, prescribe clinical nutrition and diet timelines, and enforce hydration habits to optimize daily human well-being.

---

## 🌟 Overview: Why Agent Baymax?

Traditional health tracking is static, tedious, and manual. Users abandon typical apps because typing ingredients, calculating macros, and filling out static surveys creates excessive cognitive friction. 

**Agent Baymax** reimagines personal preventive medicine by pairing an empathetic bedside manner with a state-of-the-art AI engineering architecture. Powered primarily by the open-source **Gemma 4 26B** model with resilient **Gemini 3.5 Flash Lite** fallback, Baymax provides continuous, proactive healthcare guidance tailored to your unique biology.

### 🎯 Key Capabilities
* 📸 **Zero-Friction Vision Meal Logging**: Snap a photo of any meal; Baymax detects every visible ingredient, estimates realistic portion sizes, and computes macronutrients instantly.
* 💧 **Adaptive Hydration Assistant**: Visualizes fluid balance using dynamic SVG completion gauges, clinical hydration status indicators, and automatic sweat recovery multipliers (+800ml on workout days).
* 🥗 **Interactive AI Diet Planner**: Generates personalized 7-day meal timelines utilizing demographic parameters, allergies, and toggled diet preferences (**Veg / Non-Veg / Mix**) with direct client-side PDF export.
* 🧠 **Empathetic Long-Term Memory**: Asynchronously mines chat interactions to persist allergies, dietary restrictions, and lifestyle habits into an evolving profile.
* 📚 **Medically Grounded RAG**: Validates recommendations against verified clinical health literature indexed in Supabase `pgvector` via high-speed dense vector search.
* ⚡ **Sub-Second Performance**: Engineered with React Server Components request-level memoization, parallel queries, and client-side prefetching for instant tab transitions.

---

## 🧠 Open-Source AI Foundation: Gemma 4 26B

Agent Baymax is architected around **open-source AI leadership**, utilizing Google's open-weights **Gemma 4 26B** instruction-tuned model (`models/gemma-4-26b-a4b-it`) as the primary intelligence driver across all clinical and conversational tasks.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        AI Intelligence Pipeline                        │
├────────────────────────────────────────────────────────────────────────┤
│  Primary Open-Source Engine:                                           │
│  ⭐ Gemma 4 26B (`models/gemma-4-26b-a4b-it`)                          │
│     ├── Multimodal Food Vision & Ingredient Segmentation               │
│     ├── Clinical Diet Planning & Structured JSON Generation            │
│     ├── Empathetic Streaming Healthcare Consultation                   │
│     └── Asynchronous Long-Term Memory Extraction                       │
├────────────────────────────────────────────────────────────────────────┤
│  Resilient Enterprise Fallback:                                        │
│  🛡️ Gemini 3.5 Flash Lite (`models/gemini-3.5-flash-lite`)             │
│     └── Automatic failover upon rate limits or upstream timeouts       │
├────────────────────────────────────────────────────────────────────────┤
│  Dense Vector Retrieval:                                               │
│  🔍 text-embedding-004 / gemini-embedding-001 (768 Dimensions)         │
│     └── Grounded RAG similarity search via Supabase pgvector HNSW      │
└────────────────────────────────────────────────────────────────────────┘
```

### Why Gemma 4 26B?
1. **Open-Weights Transparency & Privacy**: Health data demands trust. Gemma 4 provides open-weight architecture with clinical-grade reasoning, free from closed-ecosystem lock-in.
2. **Native Multimodal Understanding**: Efficiently processes image attachments alongside complex text prompts to identify mixed meals, hidden sauces, and estimated portion densities.
3. **Structured JSON Compliance**: Reliably outputs strictly typed Zod schemas via Vercel AI SDK's `generateObject` for diet schedules, nutrient calculations, and database memory operations.
4. **Resilient High-Availability Fallback**: If the primary open-source endpoint experiences network congestion or rate limits, the system automatically falls back to **Gemini 3.5 Flash Lite**, guaranteeing uninterrupted companion availability.

---

## 🏗️ System Architecture & Visual Flowcharts

### 1. End-to-End System Architecture

```mermaid
graph TD
    Client[Next.js Client / PWA] -->|HTTP / Stream Request| Proxy[Edge Security Proxy / Middleware]
    
    subgraph Edge & Security Gate
        Proxy -->|Session Verification| SupabaseAuth[Supabase Auth]
        Proxy -->|Sliding Window Rate Limit| Upstash[Upstash Redis]
    end
    
    Proxy -->|Authorized Traffic| ServerActions[Server Actions & API Routes]
    
    subgraph Data & Vector Store
        ServerActions -->|Read / Write Health Records| Postgres[(Supabase Postgres)]
        ServerActions -->|Cosine Similarity Search RPC| VectorDB[(Supabase pgvector)]
    end
    
    subgraph AI Intelligence Engine
        ServerActions -->|1. Generate 768d Query Embedding| Embedder[text-embedding-004]
        Embedder -->|Vector Search| VectorDB
        ServerActions -->|2. Primary Clinical Inference| Gemma[Primary: Gemma 4 26B]
        Gemma -.->|Automatic Fallback on Failure| GeminiFallback[Fallback: Gemini 3.5 Flash Lite]
        Gemma -->|3. Streaming Response| Client
        Gemma -->|4. Post-Chat Trigger| MemoryExtractor[Async Memory Engine]
        MemoryExtractor -->|5. Commit Long-Term Facts| Postgres
    end
```

---

### 2. Multimodal Meal Vision & Nutrient Extraction Pipeline

```mermaid
sequenceDiagram
    autonumber
    actor User as User
    participant UI as Chat / Meal Logger UI
    participant Action as Server Action (analyzeMeal)
    participant Gemma as Gemma 4 26B (Primary)
    participant Gemini as Gemini 3.5 Flash Lite (Fallback)
    participant DB as Supabase PostgreSQL

    User->>UI: Uploads Food Photo (JPEG/PNG/WebP)
    UI->>Action: Transmits Base64/Buffer + User Profile Context
    
    rect rgb(240, 248, 255)
        note over Action, Gemma: Primary Inference Attempt
        Action->>Gemma: generateObject(nutritionAnalysisSchema)
        alt Gemma Succeeds
            Gemma-->>Action: Returns Parsed Food Items, Calories & Macros
        else Gemma Throttled / Timed Out
            Action->>Gemini: Fallback generateObject(nutritionAnalysisSchema)
            Gemini-->>Action: Returns Parsed Food Items, Calories & Macros
        end
    end
    
    Action->>DB: INSERT into nutrition_logs (calories, macros, serving)
    Action->>DB: INSERT into meal_analysis (health_score, ai_feedback, detected_items)
    Action-->>UI: Real-time UI Update (Macro Wheels + Coach Feedback)
```

---

### 3. Streaming Conversational AI & Asynchronous Memory Extraction

```mermaid
flowchart TD
    A[User Submits Message in Chat] --> B[Fetch User Demographics, Targets & Recent Chat History]
    B --> C[Generate Query Embedding via text-embedding-004]
    C --> D[Retrieve Verified Context from pgvector via match_document_chunks]
    D --> E[Assemble Baymax Clinical System Prompt + Memories + RAG Chunks]
    E --> F{Attempt Stream with Gemma 4 26B}
    F -->|Success| G[Stream Tokens to Chat Client]
    F -->|Fail / Timeout| H{Stream with Gemini 3.5 Flash Lite Fallback}
    H --> G
    G --> I[onFinish Callback Triggered]
    I --> J[Spawn Background Worker: extractAndStoreMemory]
    J --> K[Gemma 4 Evaluates Conversation for Long-Term Facts]
    K --> L{Detected Fact Action?}
    L -->|New Memory| M[INSERT into agent_memory]
    L -->|Contradiction| N[UPDATE / DELETE agent_memory by ID]
    L -->|Transient Chatter| O[No Operation]
```

---

### 4. Hydration & Sweat Recovery State Machine

```mermaid
stateDiagram-v2
    [*] --> Idle: User navigates to Hydration feature
    Idle --> Fetching: Fetch cached water logs & daily target
    Fetching --> Calculated: Compute intake vs goal (Intl Timezone Epoch)
    
    Calculated --> NormalDay: Workout Day = OFF
    Calculated --> WorkoutDay: Workout Day = ON (+800ml sweat adjustment)
    
    NormalDay --> StatusEval: Evaluate intake percentage
    WorkoutDay --> StatusEval: Evaluate intake percentage
    
    state StatusEval {
        [*] --> Dehydrated: Intake < 35%
        [*] --> BehindSchedule: 35% <= Intake < 70%
        [*] --> Good: 70% <= Intake < 100%
        [*] --> Excellent: Intake >= 100%
    }
    
    StatusEval --> GemmaCoach: Send metrics to Gemma 4 26B
    GemmaCoach --> UIUpdate: Render SVG dynamic ring, timeline & AI tips
    UIUpdate --> [*]
```

---

## 🧮 Clinical & Mathematical Engines

### 1. Mifflin-St Jeor Energy Expenditure Formulations
Basal Metabolic Rate (BMR) and Total Daily Energy Expenditure (TDEE) are computed dynamically as physical metrics evolve:

$$\text{BMR}_{\text{Male}} = 10 \times \text{weight (kg)} + 6.25 \times \text{height (cm)} - 5 \times \text{age (yrs)} + 5$$

$$\text{BMR}_{\text{Female}} = 10 \times \text{weight (kg)} + 6.25 \times \text{height (cm)} - 5 \times \text{age (yrs)} - 161$$

$$\text{TDEE} = \text{BMR} \times \text{Activity Multiplier}$$

| Activity Level | Multiplier | Clinical Definition |
| :--- | :--- | :--- |
| **Sedentary** | `1.200` | Desk work, little to no intentional exercise |
| **Lightly Active** | `1.375` | Light exercise or sports 1–3 days per week |
| **Moderately Active** | `1.550` | Moderate exercise or sports 3–5 days per week |
| **Very Active** | `1.725` | Hard physical training 6–7 days per week |
| **Extra Active** | `1.900` | Elite athlete training or rigorous physical job |

### 2. Goal-Based Macronutrient Allocation
* **Weight Loss Deficit**: Calories set to safe daily deficit ($-500\text{ kcal}$). Protein is boosted to **2.0g per kg** of body weight to preserve lean tissue, and fat is set to **20%** of total caloric intake.
* **Muscle Gain Surplus**: Calories set to gentle surplus ($+300\text{ kcal}$). Protein is scaled to **2.2g per kg**, and fat is set to **25%** of total intake.
* **Maintenance**: Calories match TDEE. Protein is set to **1.8g per kg**, and fat is set to **25%** of total intake.
* *Note: Carbohydrates dynamically fulfill the remaining energy balance ($1\text{g protein} = 4\text{ kcal}, 1\text{g carb} = 4\text{ kcal}, 1\text{g fat} = 9\text{ kcal}$).*

### 3. Dynamic Hydration Baseline & Workout Scaling
Baseline water quota is clinically evaluated based on body mass:

$$\text{Daily Water Target (ml)} = \text{Weight (kg)} \times 35\text{ ml} + (\text{Workout Day} \ ? \ 800\text{ ml} : 0\text{ ml})$$

---

## 🗄️ Database Architecture & Relational Schema

Agent Baymax is backed by Supabase PostgreSQL with the `pgvector` extension enabled for cosine similarity search:

| Table Name | Primary Key | Description | Relationships / Foreign Keys |
| :--- | :--- | :--- | :--- |
| **`profiles`** | `id` (UUID) | Stores user identity, metadata, full name, and IANA timezone. | Maps 1:1 to `auth.users.id` |
| **`health_goals`** | `id` (UUID) | Stores current/starting weight, target calories, BMR, TDEE, macros, and AI coach summaries. | Unique per `profiles.id` |
| **`water_logs`** | `id` (UUID) | Stores logged fluid amounts (ml) and exact timestamp. | Many-to-one to `profiles.id` |
| **`nutrition_logs`** | `id` (UUID) | Stores logged meal foods, types (breakfast, lunch, dinner, snack), calories, and macros. | Many-to-one to `profiles.id` |
| **`meal_analysis`** | `id` (UUID) | Stores AI generated health score (0-100), clinical feedback, detected food items, and image URL. | One-to-one to `nutrition_logs.id` |
| **`agent_memory`** | `id` (UUID) | Stores extracted long-term memories (allergies, preferences, restrictions) categorized for RAG. | Many-to-one to `profiles.id` |
| **`knowledge_documents`**| `id` (UUID) | Stores metadata of admin-uploaded reference health guides and clinical PDFs. | Admin uploaded |
| **`document_chunks`** | `id` (UUID) | Stores document text segments and corresponding 768-dimensional `vector` embeddings. | Many-to-one to `knowledge_documents.id` |

---

## ⚡ Performance & Engineering Highlights

* **Sub-Second Tab Switching**: Solved multi-second Next.js navigation latency by introducing request-level memoization via React `cache()` in `src/lib/supabase/server.ts`. Deduplicates Supabase Auth verification from **6 HTTPS calls down to 1**, dropping page load time from **>5s to under 400ms**.
* **Aggregated In-Memory Analytics**: Water and dashboard metrics compute daily totals, timelines, weekly trends, and streaks in-memory from a single database fetch rather than executing multiple sequential queries.
* **Link Prefetching**: Desktop and mobile navigation links utilize `prefetch={true}` to prime route transitions ahead of user interaction.
* **Fail-Open Rate Limiting**: Upstash Redis sliding window algorithm ensures system stability under load without blocking authentic healthcare users during unexpected Redis downtime.

---

## 🛠️ Technology Stack

| Domain | Technology / Library | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | **Next.js 16 (App Router)** | Server Components, Streaming SSR, API Routes |
| **Language & Typing** | **TypeScript 5** | Strict type safety across client, server, and AI schemas |
| **Component System** | **React 19 & Radix UI** | Accessible, headless UI primitives |
| **Styling & Animation**| **Tailwind CSS v4 & Framer Motion** | Glassmorphic design, smooth micro-animations |
| **Primary AI Model** | **Gemma 4 26B (`gemma-4-26b-a4b-it`)** | Open-source primary engine for clinical reasoning & vision |
| **Fallback AI Model** | **Gemini 3.5 Flash Lite** | High-throughput multimodal and structured fallback |
| **Vector Embeddings** | **text-embedding-004** | 768-dimensional dense vector embeddings |
| **AI Tooling & SDKs** | **Vercel AI SDK (`ai`, `@ai-sdk/google`)** | Streaming text, structured object generation, token pipes |
| **Database & Vector** | **Supabase (PostgreSQL + pgvector)** | Relational storage, Auth, Row-Level Security, vector search |
| **Rate Limiting** | **Upstash Redis** | Edge API rate limiting via sliding window counter |
| **PDF Generation** | **jsPDF** | Direct client-side PDF meal plan generation |

---

## 🚀 Getting Started

### Prerequisites
* **Node.js**: v20.x or later installed
* **Supabase**: A free Supabase project with PostgreSQL
* **Google Gemini API Key**: For Gemma 4 and Gemini inference
* **Upstash Redis**: (Optional) For API rate limiting

### 1. Clone the Repository
```bash
git clone https://github.com/Harshitagarwal113/Agent-Baymax.git
cd Agent-Baymax
npm install
```

### 2. Configure Environment Variables
Create a `.env.local` file in the root directory:
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Google Gemini API Configuration (Powers Gemma 4 & Gemini Fallback)
GEMINI_API_KEY=your-gemini-api-key

# Upstash Redis (Optional for rate limiting)
KV_REST_API_URL=your-upstash-redis-rest-url
KV_REST_API_TOKEN=your-upstash-redis-rest-token

# Site Settings
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 3. Initialize the Database
Execute the SQL script located in [supabase/init_database.sql](file:///c:/Users/lenov/OneDrive/Desktop/HARSHIT/Projects/Agent%20Baymax/supabase/init_database.sql) inside your Supabase SQL Editor. This will automatically configure:
* All database tables with Row Level Security (RLS)
* User profile auto-creation trigger upon auth signup
* The `pgvector` extension and cosine similarity search function
* Storage buckets for meal photo uploads

### 4. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to start your healthcare companion journey!

---

## 📄 License

This project is open-source and distributed under the **MIT License**. See the [LICENSE](file:///c:/Users/lenov/OneDrive/Desktop/HARSHIT/Projects/Agent%20Baymax/LICENSE) file for complete details.

```
MIT License
Copyright (c) 2026 Harshit Agarwal
```

---

<p align="center">
  <b>Agent Baymax</b> • Engineered with care by <a href="https://github.com/Harshitagarwal113">Harshit Agarwal</a>
</p>
