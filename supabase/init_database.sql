-- ==========================================
-- Agent Baymax - Initial Database Schema
-- ==========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. Tables Creation
-- ==========================================

-- Users Profile Table (Extends Supabase auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    timezone TEXT DEFAULT 'UTC',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Profile Settings
CREATE TABLE public.profile_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
    theme TEXT DEFAULT 'system',
    notifications_enabled BOOLEAN DEFAULT true,
    weekly_report_enabled BOOLEAN DEFAULT true,
    measurement_system TEXT DEFAULT 'metric' CHECK (measurement_system IN ('metric', 'imperial')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Health Goals
CREATE TABLE public.health_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
    daily_calorie_target INTEGER,
    daily_protein_target INTEGER,
    daily_carbs_target INTEGER,
    daily_fat_target INTEGER,
    daily_water_target_ml INTEGER DEFAULT 2000,
    weight_goal_kg NUMERIC(5,2),
    current_weight_kg NUMERIC(5,2),
    goal_type TEXT CHECK (goal_type IN ('lose_weight', 'maintain', 'build_muscle')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Chat History (Sessions & Messages)
CREATE TABLE public.chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES public.chat_sessions(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    role TEXT CHECK (role IN ('user', 'assistant', 'system')) NOT NULL,
    content TEXT NOT NULL,
    tokens_used INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Agent Memory (Long-term context)
CREATE TABLE public.agent_memory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    category TEXT NOT NULL, -- e.g., 'allergies', 'preferences', 'medical_conditions'
    content TEXT NOT NULL,
    importance INTEGER DEFAULT 1 CHECK (importance BETWEEN 1 AND 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Nutrition Logs
CREATE TABLE public.nutrition_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    meal_type TEXT CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
    food_name TEXT NOT NULL,
    calories INTEGER NOT NULL,
    protein_g NUMERIC(5,2),
    carbs_g NUMERIC(5,2),
    fat_g NUMERIC(5,2),
    logged_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Meal Analysis (AI generated insights)
CREATE TABLE public.meal_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nutrition_log_id UUID REFERENCES public.nutrition_logs(id) ON DELETE CASCADE NOT NULL UNIQUE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    health_score INTEGER CHECK (health_score BETWEEN 0 AND 100),
    ai_feedback TEXT,
    image_url TEXT, -- If user uploaded photo
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Water Logs
CREATE TABLE public.water_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    amount_ml INTEGER NOT NULL,
    logged_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- 2. Indexes for Performance
-- ==========================================

CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_chat_messages_session_id ON public.chat_messages(session_id);
CREATE INDEX idx_chat_messages_user_id ON public.chat_messages(user_id);
CREATE INDEX idx_nutrition_logs_user_logged_at ON public.nutrition_logs(user_id, logged_at);
CREATE INDEX idx_water_logs_user_logged_at ON public.water_logs(user_id, logged_at);
CREATE INDEX idx_agent_memory_user_category ON public.agent_memory(user_id, category);

-- ==========================================
-- 3. Update Triggers (updated_at)
-- ==========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_profile_settings_updated_at BEFORE UPDATE ON public.profile_settings FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_health_goals_updated_at BEFORE UPDATE ON public.health_goals FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_chat_sessions_updated_at BEFORE UPDATE ON public.chat_sessions FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_agent_memory_updated_at BEFORE UPDATE ON public.agent_memory FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ==========================================
-- 4. Automatically Create Profile on Signup
-- ==========================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  
  -- Create default settings
  INSERT INTO public.profile_settings (user_id) VALUES (new.id);
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==========================================
-- 5. Row Level Security (RLS) & Policies
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_logs ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Profile Settings
CREATE POLICY "Users can view own settings" ON public.profile_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON public.profile_settings FOR UPDATE USING (auth.uid() = user_id);

-- Health Goals
CREATE POLICY "Users can view own goals" ON public.health_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own goals" ON public.health_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own goals" ON public.health_goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own goals" ON public.health_goals FOR DELETE USING (auth.uid() = user_id);

-- Chat Sessions
CREATE POLICY "Users can view own sessions" ON public.chat_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sessions" ON public.chat_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON public.chat_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sessions" ON public.chat_sessions FOR DELETE USING (auth.uid() = user_id);

-- Chat Messages
CREATE POLICY "Users can view own messages" ON public.chat_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own messages" ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Agent Memory
CREATE POLICY "Users can view own memory" ON public.agent_memory FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own memory" ON public.agent_memory FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own memory" ON public.agent_memory FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own memory" ON public.agent_memory FOR DELETE USING (auth.uid() = user_id);

-- Nutrition Logs
CREATE POLICY "Users can view own nutrition logs" ON public.nutrition_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own nutrition logs" ON public.nutrition_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own nutrition logs" ON public.nutrition_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own nutrition logs" ON public.nutrition_logs FOR DELETE USING (auth.uid() = user_id);

-- Meal Analysis
CREATE POLICY "Users can view own meal analysis" ON public.meal_analysis FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own meal analysis" ON public.meal_analysis FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own meal analysis" ON public.meal_analysis FOR UPDATE USING (auth.uid() = user_id);

-- Water Logs
CREATE POLICY "Users can view own water logs" ON public.water_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own water logs" ON public.water_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own water logs" ON public.water_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own water logs" ON public.water_logs FOR DELETE USING (auth.uid() = user_id);
-- Create a public bucket for food images
insert into storage.buckets (id, name, public)
values ('food-images', 'food-images', true)
on conflict (id) do nothing;

-- Set up Row Level Security (RLS) for the bucket

-- Allow public read access to food images
create policy "Public Access"
on storage.objects for select
to public
using ( bucket_id = 'food-images' );

-- Allow authenticated users to upload food images
create policy "Authenticated users can upload images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'food-images'
);

-- Allow users to delete their own uploaded images
create policy "Users can update/delete their own images"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'food-images' AND 
  auth.uid() = owner
);
-- Add serving_size to nutrition_logs
ALTER TABLE public.nutrition_logs 
ADD COLUMN IF NOT EXISTS serving_size TEXT;
-- Enable the pgvector extension to work with embedding vectors
create extension if not exists vector;

-- Create a table to track uploaded documents
create table public.knowledge_documents (
  id uuid primary key default uuid_generate_v4(),
  filename text not null,
  content_type text,
  size_bytes bigint,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create a table for the document chunks and their vector embeddings
create table public.document_chunks (
  id uuid primary key default uuid_generate_v4(),
  document_id uuid references public.knowledge_documents(id) on delete cascade not null,
  content text not null,
  embedding vector(768) not null, -- Gemini text-embedding-004 outputs 768 dimensions
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create a generic HNSW index for fast vector similarity search
create index on public.document_chunks using hnsw (embedding vector_cosine_ops);

-- Create a function to similarity search for document chunks
create or replace function match_document_chunks (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  similarity float
)
language sql stable
as $$
  select
    document_chunks.id,
    document_chunks.document_id,
    document_chunks.content,
    1 - (document_chunks.embedding <=> query_embedding) as similarity
  from document_chunks
  where 1 - (document_chunks.embedding <=> query_embedding) > match_threshold
  order by document_chunks.embedding <=> query_embedding
  limit match_count;
$$;
-- Add new demographic and physical data points to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS age INTEGER,
ADD COLUMN IF NOT EXISTS height_cm NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female', 'other')),
ADD COLUMN IF NOT EXISTS activity_level TEXT CHECK (activity_level IN ('sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active'));

-- Enable Row Level Security for RAG tables
ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

-- Policies for knowledge_documents
CREATE POLICY "Allow authenticated users to read knowledge documents" 
ON public.knowledge_documents FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert knowledge documents" 
ON public.knowledge_documents FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update knowledge documents" 
ON public.knowledge_documents FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to delete knowledge documents" 
ON public.knowledge_documents FOR DELETE TO authenticated USING (true);

-- Policies for document_chunks
CREATE POLICY "Allow authenticated users to read document chunks" 
ON public.document_chunks FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert document chunks" 
ON public.document_chunks FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update document chunks" 
ON public.document_chunks FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to delete document chunks" 
ON public.document_chunks FOR DELETE TO authenticated USING (true);

-- Add detailed meal analysis fields to meal_analysis table
ALTER TABLE public.meal_analysis 
ADD COLUMN IF NOT EXISTS detected_items JSONB,
ADD COLUMN IF NOT EXISTS confidence INTEGER,
ADD COLUMN IF NOT EXISTS confidence_explanation TEXT;

-- Add analytics fields to health_goals table (Migration 0007)
ALTER TABLE public.health_goals
ADD COLUMN IF NOT EXISTS starting_weight_kg NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS ai_analysis TEXT,
ADD COLUMN IF NOT EXISTS estimated_weeks TEXT;-- Performance Indexes for instant querying and tab switching
CREATE INDEX IF NOT EXISTS idx_water_logs_user_logged ON public.water_logs (user_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_nutrition_logs_user_logged ON public.nutrition_logs (user_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_health_goals_user ON public.health_goals (user_id);
CREATE INDEX IF NOT EXISTS idx_agent_memory_user ON public.agent_memory (user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON public.chat_messages (session_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON public.chat_sessions (user_id, updated_at DESC);
