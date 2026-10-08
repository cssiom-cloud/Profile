-- =============================================================================
-- Dynamic Creative Profile & Link Hub - Supabase Database Schema
-- Run this script in the Supabase SQL Editor to set up all tables, RLS policies,
-- updated_at triggers, and initial seed profile data.
-- =============================================================================

-- Ensure cryptographic extensions are enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. TABLE DEFINITIONS
-- =============================================================================

-- 1.1 PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL DEFAULT 'Alex Rivera',
    handle TEXT DEFAULT '@alexrivera',
    bio TEXT DEFAULT 'Creative Technologist & UI Engineer. Crafting digital realities with code, sound, and interactive canvas aesthetics.',
    quote TEXT DEFAULT '"Dream in algorithms, craft in color, build for the future."',
    avatar_url TEXT DEFAULT 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    banner_url TEXT DEFAULT 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80',
    location TEXT DEFAULT 'Tokyo & Neo-Metropolis',
    status_badge TEXT DEFAULT '⚡ Exploring Creative Frontiers',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 1.2 LINKS TABLE
CREATE TABLE IF NOT EXISTS public.links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    icon TEXT DEFAULT 'Globe',
    category TEXT DEFAULT 'social', -- 'project', 'social', 'work', 'contact', 'other'
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    highlight_color TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 1.3 FAVORITES & INTERESTS TABLE
CREATE TABLE IF NOT EXISTS public.favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    category TEXT NOT NULL, -- 'tech', 'gaming', 'anime', 'music', 'hobbies'
    title TEXT NOT NULL,
    subtitle TEXT,
    icon_or_image TEXT,
    badge TEXT,
    link_url TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 1.4 SITE SETTINGS TABLE (1:1 with profile)
CREATE TABLE IF NOT EXISTS public.site_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
    theme_preset TEXT DEFAULT 'cyber-neon', -- 'cyber-neon', 'midnight-glow', 'lofi-aesthetic', 'clean-minimalist', 'retro-vaporwave'
    layout_style TEXT DEFAULT 'bento',       -- 'bento', 'stack', 'cards'
    card_style TEXT DEFAULT 'glassmorphism', -- 'glassmorphism', 'neon-border', 'minimal-flat'
    particle_density TEXT DEFAULT 'medium',  -- 'off', 'low', 'medium', 'high'
    music_title TEXT DEFAULT 'Synthetic Serenade',
    music_artist TEXT DEFAULT 'Lofi Tokyo Beats',
    music_audio_url TEXT DEFAULT 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3',
    music_cover_url TEXT DEFAULT 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=300&q=80',
    music_spotify_url TEXT DEFAULT 'https://open.spotify.com',
    music_youtube_url TEXT DEFAULT 'https://youtube.com',
    custom_css_or_config JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =============================================================================
-- 2. INDEXES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_links_profile_id ON public.links(profile_id);
CREATE INDEX IF NOT EXISTS idx_links_sort_order ON public.links(sort_order);
CREATE INDEX IF NOT EXISTS idx_favorites_profile_id ON public.favorites(profile_id);
CREATE INDEX IF NOT EXISTS idx_favorites_sort_order ON public.favorites(sort_order);
CREATE INDEX IF NOT EXISTS idx_site_settings_profile_id ON public.site_settings(profile_id);

-- =============================================================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running script
DROP POLICY IF EXISTS "Public can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can update profiles" ON public.profiles;

DROP POLICY IF EXISTS "Public can view active links" ON public.links;
DROP POLICY IF EXISTS "Authenticated users can manage links" ON public.links;

DROP POLICY IF EXISTS "Public can view favorites" ON public.favorites;
DROP POLICY IF EXISTS "Authenticated users can manage favorites" ON public.favorites;

DROP POLICY IF EXISTS "Public can view site settings" ON public.site_settings;
DROP POLICY IF EXISTS "Authenticated users can manage site settings" ON public.site_settings;

-- Public Read Policies (Visitors can read profile, active links, favorites, and settings)
CREATE POLICY "Public can view profiles" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Public can view active links" ON public.links
    FOR SELECT USING (is_active = true OR auth.role() = 'authenticated');

CREATE POLICY "Public can view favorites" ON public.favorites
    FOR SELECT USING (true);

CREATE POLICY "Public can view site settings" ON public.site_settings
    FOR SELECT USING (true);

-- Authenticated Write Policies (Only logged-in owners can create/update/delete)
CREATE POLICY "Authenticated users can insert profiles" ON public.profiles
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update profiles" ON public.profiles
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage links" ON public.links
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage favorites" ON public.favorites
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage site settings" ON public.site_settings
    FOR ALL USING (auth.role() = 'authenticated');

-- =============================================================================
-- 4. AUTOMATIC updated_at TRIGGER FUNCTION
-- =============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_profiles_updated ON public.profiles;
CREATE TRIGGER on_profiles_updated
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_site_settings_updated ON public.site_settings;
CREATE TRIGGER on_site_settings_updated
    BEFORE UPDATE ON public.site_settings
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- 5. RICH SEED DATA INSERTION (Idempotent)
-- =============================================================================
DO $$
DECLARE
    v_profile_id UUID;
BEGIN
    -- Only insert if profiles table is empty
    IF NOT EXISTS (SELECT 1 FROM public.profiles LIMIT 1) THEN
        -- 5.1 Insert Seed Profile
        INSERT INTO public.profiles (name, handle, bio, quote, avatar_url, banner_url, location, status_badge)
        VALUES (
            'Alex Rivera',
            '@alexrivera',
            'Creative Technologist & UI Engineer. Crafting digital realities with code, sound, and interactive canvas aesthetics.',
            '"Dream in algorithms, craft in color, build for the future."',
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
            'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80',
            'Tokyo & Neo-Metropolis',
            '⚡ Exploring Creative Frontiers'
        ) RETURNING id INTO v_profile_id;

        -- 5.2 Insert 6 Seed Links
        INSERT INTO public.links (profile_id, title, url, icon, category, sort_order, is_active, highlight_color) VALUES
        (v_profile_id, 'GitHub Repositories', 'https://github.com', 'Github', 'project', 0, true, '#00f2fe'),
        (v_profile_id, 'X / Twitter Dispatch', 'https://twitter.com', 'Twitter', 'social', 1, true, '#38bdf8'),
        (v_profile_id, 'LinkedIn Network', 'https://linkedin.com', 'Linkedin', 'work', 2, true, '#818cf8'),
        (v_profile_id, 'YouTube Creative Lab', 'https://youtube.com', 'Youtube', 'social', 3, true, '#f43f5e'),
        (v_profile_id, 'Discord Community', 'https://discord.com', 'MessageSquare', 'social', 4, true, '#a855f7'),
        (v_profile_id, 'Interactive Portfolio', 'https://example.com', 'Globe', 'project', 5, true, '#10b981');

        -- 5.3 Insert 9 Seed Favorites Across 4 Categories
        INSERT INTO public.favorites (profile_id, category, title, subtitle, icon_or_image, badge, sort_order) VALUES
        (v_profile_id, 'tech', 'React & Next.js', 'Frontend Framework & SSR', 'Code', 'Daily Driver', 0),
        (v_profile_id, 'tech', 'TypeScript', 'Type Safety & DX Scalability', 'Terminal', 'Core', 1),
        (v_profile_id, 'tech', 'Tailwind CSS', 'Modern Styling Engine', 'Sparkles', 'Speed', 2),
        (v_profile_id, 'tech', 'Three.js / WebGL', '3D Creative Code & Shaders', 'Layers', 'Passion', 3),
        (v_profile_id, 'gaming', 'Elden Ring', 'FromSoftware Masterpiece', 'Gamepad2', '100% Cleared', 4),
        (v_profile_id, 'gaming', 'Cyberpunk 2077', 'Night City Nomad', 'Gamepad2', 'Phantom Liberty', 5),
        (v_profile_id, 'anime', 'Steins;Gate', 'Sci-Fi Time Travel Peak', 'Film', 'El Psy Kongroo', 6),
        (v_profile_id, 'anime', 'Cyberpunk: Edgerunners', 'Studio Trigger Visual Tour', 'Film', 'Sandy 2.0', 7),
        (v_profile_id, 'music', 'Synthwave & Lo-Fi', 'Night Coding Flow Vibes', 'Music', 'Endless Loop', 8);

        -- 5.4 Insert Seed Site Settings
        INSERT INTO public.site_settings (
            profile_id,
            theme_preset,
            layout_style,
            card_style,
            particle_density,
            music_title,
            music_artist,
            music_audio_url,
            music_cover_url,
            music_spotify_url,
            music_youtube_url
        ) VALUES (
            v_profile_id,
            'cyber-neon',
            'bento',
            'glassmorphism',
            'medium',
            'Synthetic Serenade',
            'Lofi Tokyo Beats',
            'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3',
            'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=300&q=80',
            'https://open.spotify.com',
            'https://youtube.com'
        );
    END IF;
END $$;
