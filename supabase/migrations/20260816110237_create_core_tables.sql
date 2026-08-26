/*
# BlockMotion AI — Core Schema

1. Overview
Creates the core database schema for BlockMotion AI, a full-stack Minecraft 3D animation and movie production studio.
This migration creates all tables for users, projects, videos, assets, characters, worlds, scripts, scenes, shots,
animations, cameras, lights, audio tracks, render jobs, render outputs, movie exports, AI jobs, AI providers,
project settings, and notifications.

2. New Tables
- `ai_providers` — Configured AI providers (LLM, voice, music, video, image) with status, model, and API config
- `projects` — Top-level project containers (VIDEO_TO_3D, TEXT_TO_MOVIE, HYBRID) owned by users
- `videos` — Uploaded source videos with metadata and storage paths
- `assets` — Asset library items (characters, worlds, locations, animations, models, textures, sounds, music, effects)
- `characters` — Character definitions with appearance, personality, abilities, equipment
- `character_versions` — Version history for characters (rollback support)
- `worlds` — World definitions with locations, terrain, weather, rules
- `locations` — Individual locations within worlds
- `scripts` — Screenplay metadata (title, logline, synopsis, genre, tone)
- `script_scenes` — Scene records within a screenplay
- `scenes` — Production scenes with environment, action, dialogue, camera, lighting
- `shots` — Individual shots within scenes
- `animations` — Animation plans and data
- `cameras` — Camera definitions and movements
- `lights` — Lighting definitions
- `audio_tracks` — Audio tracks (dialogue, music, SFX, ambience)
- `render_jobs` — Render queue jobs with status and progress
- `render_outputs` — Output files from render jobs
- `movie_exports` — Final assembled movie exports
- `ai_jobs` — AI generation jobs (story, script, scene, character, world, etc.)
- `project_settings` — Per-project settings (render quality, FPS, resolution, etc.)
- `notifications` — User notifications

3. Security
- RLS enabled on ALL tables
- Owner-scoped CRUD: each authenticated user can only access rows they own
- Child tables scoped through parent project ownership via EXISTS subqueries
- `user_id` columns default to `auth.uid()` so inserts work without explicit owner

4. Notes
- All tables use `gen_random_uuid()` for primary keys
- Timestamps default to `now()`
- JSONB columns used for flexible structured data (appearance, settings, etc.)
- Foreign keys with ON DELETE CASCADE where appropriate
*/

-- AI Providers (global config, per-user)
CREATE TABLE IF NOT EXISTS ai_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('llm', 'voice', 'music', 'video', 'image')),
  provider text NOT NULL,
  model text,
  api_url text,
  api_key_encrypted text,
  status text NOT NULL DEFAULT 'not_configured' CHECK (status IN ('active', 'inactive', 'not_configured', 'error')),
  config jsonb DEFAULT '{}'::jsonb,
  is_enabled boolean NOT NULL DEFAULT false,
  last_tested_at timestamptz,
  last_test_result text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ai_providers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_ai_providers" ON ai_providers;
CREATE POLICY "select_own_ai_providers" ON ai_providers FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_ai_providers" ON ai_providers;
CREATE POLICY "insert_own_ai_providers" ON ai_providers FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_ai_providers" ON ai_providers;
CREATE POLICY "update_own_ai_providers" ON ai_providers FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_ai_providers" ON ai_providers;
CREATE POLICY "delete_own_ai_providers" ON ai_providers FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  type text NOT NULL CHECK (type IN ('VIDEO_TO_3D', 'TEXT_TO_MOVIE', 'HYBRID')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'planning', 'generating', 'rendering', 'assembling', 'complete', 'failed', 'archived')),
  thumbnail_url text,
  duration_minutes integer DEFAULT 15,
  visual_style text DEFAULT 'CINEMATIC_BLOCK_MOTION',
  genre text,
  tone text,
  fps integer DEFAULT 30,
  resolution text DEFAULT '1080p',
  render_quality text DEFAULT 'draft',
  voice_enabled boolean DEFAULT false,
  music_enabled boolean DEFAULT false,
  auto_approve boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_projects" ON projects;
CREATE POLICY "select_own_projects" ON projects FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_projects" ON projects;
CREATE POLICY "insert_own_projects" ON projects FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_projects" ON projects;
CREATE POLICY "update_own_projects" ON projects FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_projects" ON projects;
CREATE POLICY "delete_own_projects" ON projects FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Videos (uploaded source videos)
CREATE TABLE IF NOT EXISTS videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  filename text NOT NULL,
  original_filename text NOT NULL,
  file_size bigint NOT NULL,
  mime_type text,
  storage_path text NOT NULL,
  storage_bucket text DEFAULT 'videos',
  duration_seconds numeric,
  fps numeric,
  width integer,
  height integer,
  codec text,
  upload_status text NOT NULL DEFAULT 'pending' CHECK (upload_status IN ('pending', 'uploading', 'paused', 'completed', 'failed', 'cancelled')),
  upload_progress numeric DEFAULT 0,
  upload_speed numeric,
  uploaded_bytes bigint DEFAULT 0,
  analysis_status text DEFAULT 'pending' CHECK (analysis_status IN ('pending', 'analyzing', 'completed', 'failed')),
  analysis_result jsonb DEFAULT '{}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_videos" ON videos;
CREATE POLICY "select_own_videos" ON videos FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_videos" ON videos;
CREATE POLICY "insert_own_videos" ON videos FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_videos" ON videos;
CREATE POLICY "update_own_videos" ON videos FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_videos" ON videos;
CREATE POLICY "delete_own_videos" ON videos FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Assets (asset library)
CREATE TABLE IF NOT EXISTS assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('character', 'world', 'location', 'animation', 'model', 'texture', 'sound', 'music', 'effect', 'camera_preset')),
  category text,
  storage_path text,
  storage_bucket text DEFAULT 'assets',
  thumbnail_url text,
  metadata jsonb DEFAULT '{}'::jsonb,
  tags text[] DEFAULT '{}',
  is_shared boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_assets" ON assets;
CREATE POLICY "select_own_assets" ON assets FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_assets" ON assets;
CREATE POLICY "insert_own_assets" ON assets FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_assets" ON assets;
CREATE POLICY "update_own_assets" ON assets FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_assets" ON assets;
CREATE POLICY "delete_own_assets" ON assets FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Characters
CREATE TABLE IF NOT EXISTS characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  character_id text NOT NULL,
  name text NOT NULL,
  role text,
  description text,
  appearance jsonb DEFAULT '{}'::jsonb,
  face jsonb DEFAULT '{}'::jsonb,
  eyes jsonb DEFAULT '{}'::jsonb,
  hair jsonb DEFAULT '{}'::jsonb,
  clothing jsonb DEFAULT '{}'::jsonb,
  armor jsonb DEFAULT '{}'::jsonb,
  accessories jsonb DEFAULT '{}'::jsonb,
  colors jsonb DEFAULT '{}'::jsonb,
  personality jsonb DEFAULT '{}'::jsonb,
  abilities jsonb DEFAULT '{}'::jsonb,
  equipment jsonb DEFAULT '{}'::jsonb,
  relationships jsonb DEFAULT '{}'::jsonb,
  voice_config jsonb DEFAULT '{}'::jsonb,
  animation_style jsonb DEFAULT '{}'::jsonb,
  model_path text,
  reference_images text[] DEFAULT '{}',
  thumbnail_url text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE characters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_characters" ON characters;
CREATE POLICY "select_own_characters" ON characters FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_characters" ON characters;
CREATE POLICY "insert_own_characters" ON characters FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_characters" ON characters;
CREATE POLICY "update_own_characters" ON characters FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_characters" ON characters;
CREATE POLICY "delete_own_characters" ON characters FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Character Versions
CREATE TABLE IF NOT EXISTS character_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  snapshot jsonb NOT NULL,
  change_description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE character_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_character_versions" ON character_versions;
CREATE POLICY "select_own_character_versions" ON character_versions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_character_versions" ON character_versions;
CREATE POLICY "insert_own_character_versions" ON character_versions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_character_versions" ON character_versions;
CREATE POLICY "delete_own_character_versions" ON character_versions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Worlds
CREATE TABLE IF NOT EXISTS worlds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  world_bible jsonb DEFAULT '{}'::jsonb,
  terrain jsonb DEFAULT '{}'::jsonb,
  weather jsonb DEFAULT '{}'::jsonb,
  time_settings jsonb DEFAULT '{}'::jsonb,
  world_rules jsonb DEFAULT '{}'::jsonb,
  important_objects jsonb DEFAULT '{}'::jsonb,
  thumbnail_url text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE worlds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_worlds" ON worlds;
CREATE POLICY "select_own_worlds" ON worlds FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_worlds" ON worlds;
CREATE POLICY "insert_own_worlds" ON worlds FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_worlds" ON worlds;
CREATE POLICY "update_own_worlds" ON worlds FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_worlds" ON worlds;
CREATE POLICY "delete_own_worlds" ON worlds FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Locations
CREATE TABLE IF NOT EXISTS locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id uuid NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id text NOT NULL,
  name text NOT NULL,
  type text,
  description text,
  terrain_data jsonb DEFAULT '{}'::jsonb,
  buildings jsonb DEFAULT '{}'::jsonb,
  environment jsonb DEFAULT '{}'::jsonb,
  model_path text,
  thumbnail_url text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_locations" ON locations;
CREATE POLICY "select_own_locations" ON locations FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_locations" ON locations;
CREATE POLICY "insert_own_locations" ON locations FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_locations" ON locations;
CREATE POLICY "update_own_locations" ON locations FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_locations" ON locations;
CREATE POLICY "delete_own_locations" ON locations FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Scripts (screenplays)
CREATE TABLE IF NOT EXISTS scripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  logline text,
  synopsis text,
  genre text,
  tone text,
  theme text,
  characters jsonb DEFAULT '[]'::jsonb,
  locations jsonb DEFAULT '[]'::jsonb,
  estimated_duration integer,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE scripts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_scripts" ON scripts;
CREATE POLICY "select_own_scripts" ON scripts FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_scripts" ON scripts;
CREATE POLICY "insert_own_scripts" ON scripts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_scripts" ON scripts;
CREATE POLICY "update_own_scripts" ON scripts FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_scripts" ON scripts;
CREATE POLICY "delete_own_scripts" ON scripts FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Script Scenes
CREATE TABLE IF NOT EXISTS script_scenes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id uuid NOT NULL REFERENCES scripts(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  scene_number integer NOT NULL,
  title text NOT NULL,
  location text,
  time_of_day text,
  duration_seconds integer,
  characters jsonb DEFAULT '[]'::jsonb,
  action text,
  dialogue jsonb DEFAULT '[]'::jsonb,
  camera_directions text,
  lighting text,
  sound text,
  music text,
  effects text,
  transition text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE script_scenes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_script_scenes" ON script_scenes;
CREATE POLICY "select_own_script_scenes" ON script_scenes FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_script_scenes" ON script_scenes;
CREATE POLICY "insert_own_script_scenes" ON script_scenes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_script_scenes" ON script_scenes;
CREATE POLICY "update_own_script_scenes" ON script_scenes FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_script_scenes" ON script_scenes;
CREATE POLICY "delete_own_script_scenes" ON script_scenes FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Scenes (production scenes)
CREATE TABLE IF NOT EXISTS scenes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  script_scene_id uuid REFERENCES script_scenes(id) ON DELETE SET NULL,
  scene_id text NOT NULL,
  number integer NOT NULL,
  title text NOT NULL,
  location_id text,
  duration_seconds integer,
  characters jsonb DEFAULT '[]'::jsonb,
  environment jsonb DEFAULT '{}'::jsonb,
  action text,
  dialogue jsonb DEFAULT '[]'::jsonb,
  camera jsonb DEFAULT '{}'::jsonb,
  lighting jsonb DEFAULT '{}'::jsonb,
  animation jsonb DEFAULT '{}'::jsonb,
  audio jsonb DEFAULT '{}'::jsonb,
  effects jsonb DEFAULT '{}'::jsonb,
  approval_status text DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'editing')),
  render_status text DEFAULT 'pending' CHECK (render_status IN ('pending', 'queued', 'rendering', 'completed', 'failed')),
  preview_url text,
  thumbnail_url text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE scenes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_scenes" ON scenes;
CREATE POLICY "select_own_scenes" ON scenes FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_scenes" ON scenes;
CREATE POLICY "insert_own_scenes" ON scenes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_scenes" ON scenes;
CREATE POLICY "update_own_scenes" ON scenes FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_scenes" ON scenes;
CREATE POLICY "delete_own_scenes" ON scenes FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Shots
CREATE TABLE IF NOT EXISTS shots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id uuid NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  shot_id text NOT NULL,
  number integer NOT NULL,
  title text,
  shot_type text,
  duration_seconds integer,
  camera jsonb DEFAULT '{}'::jsonb,
  characters jsonb DEFAULT '[]'::jsonb,
  action text,
  dialogue jsonb DEFAULT '[]'::jsonb,
  effects jsonb DEFAULT '{}'::jsonb,
  render_status text DEFAULT 'pending' CHECK (render_status IN ('pending', 'queued', 'rendering', 'completed', 'failed')),
  preview_url text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE shots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_shots" ON shots;
CREATE POLICY "select_own_shots" ON shots FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_shots" ON shots;
CREATE POLICY "insert_own_shots" ON shots FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_shots" ON shots;
CREATE POLICY "update_own_shots" ON shots FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_shots" ON shots;
CREATE POLICY "delete_own_shots" ON shots FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Animations
CREATE TABLE IF NOT EXISTS animations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  scene_id uuid REFERENCES scenes(id) ON DELETE CASCADE,
  character_id uuid REFERENCES characters(id) ON DELETE SET NULL,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('idle', 'walk', 'run', 'sprint', 'jump', 'fall', 'crouch', 'climb', 'swim', 'attack', 'block', 'dodge', 'turn', 'look', 'interact', 'hold_item', 'use_item', 'reaction', 'knockback', 'death', 'respawn', 'emotional', 'cinematic_pose', 'custom')),
  duration_seconds numeric,
  data jsonb DEFAULT '{}'::jsonb,
  file_path text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE animations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_animations" ON animations;
CREATE POLICY "select_own_animations" ON animations FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_animations" ON animations;
CREATE POLICY "insert_own_animations" ON animations FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_animations" ON animations;
CREATE POLICY "update_own_animations" ON animations FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_animations" ON animations;
CREATE POLICY "delete_own_animations" ON animations FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Cameras
CREATE TABLE IF NOT EXISTS cameras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  scene_id uuid REFERENCES scenes(id) ON DELETE CASCADE,
  shot_id uuid REFERENCES shots(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text,
  movement text,
  position jsonb DEFAULT '{}'::jsonb,
  target jsonb DEFAULT '{}'::jsonb,
  fov numeric DEFAULT 50,
  settings jsonb DEFAULT '{}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE cameras ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_cameras" ON cameras;
CREATE POLICY "select_own_cameras" ON cameras FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_cameras" ON cameras;
CREATE POLICY "insert_own_cameras" ON cameras FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_cameras" ON cameras;
CREATE POLICY "update_own_cameras" ON cameras FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_cameras" ON cameras;
CREATE POLICY "delete_own_cameras" ON cameras FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Lights
CREATE TABLE IF NOT EXISTS lights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  scene_id uuid REFERENCES scenes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text,
  position jsonb DEFAULT '{}'::jsonb,
  color text DEFAULT '#ffffff',
  intensity numeric DEFAULT 1.0,
  settings jsonb DEFAULT '{}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE lights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_lights" ON lights;
CREATE POLICY "select_own_lights" ON lights FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_lights" ON lights;
CREATE POLICY "insert_own_lights" ON lights FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_lights" ON lights;
CREATE POLICY "update_own_lights" ON lights FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_lights" ON lights;
CREATE POLICY "delete_own_lights" ON lights FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Audio Tracks
CREATE TABLE IF NOT EXISTS audio_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  scene_id uuid REFERENCES scenes(id) ON DELETE CASCADE,
  character_id uuid REFERENCES characters(id) ON DELETE SET NULL,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('dialogue', 'music', 'sfx', 'ambience', 'original_audio')),
  text text,
  voice_config jsonb DEFAULT '{}'::jsonb,
  start_time numeric,
  duration_seconds numeric,
  storage_path text,
  storage_bucket text DEFAULT 'audio',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE audio_tracks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_audio_tracks" ON audio_tracks;
CREATE POLICY "select_own_audio_tracks" ON audio_tracks FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_audio_tracks" ON audio_tracks;
CREATE POLICY "insert_own_audio_tracks" ON audio_tracks FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_audio_tracks" ON audio_tracks;
CREATE POLICY "update_own_audio_tracks" ON audio_tracks FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_audio_tracks" ON audio_tracks;
CREATE POLICY "delete_own_audio_tracks" ON audio_tracks FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Render Jobs
CREATE TABLE IF NOT EXISTS render_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  scene_id uuid REFERENCES scenes(id) ON DELETE CASCADE,
  shot_id uuid REFERENCES shots(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  job_type text NOT NULL CHECK (job_type IN ('scene', 'shot', 'preview', 'assembly', 'full_movie')),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'analyzing', 'building_scene', 'animating', 'rendering', 'encoding', 'uploading', 'complete', 'failed', 'cancelled')),
  progress numeric DEFAULT 0,
  current_operation text,
  error text,
  retry_count integer DEFAULT 0,
  max_retries integer DEFAULT 3,
  settings jsonb DEFAULT '{}'::jsonb,
  output_file text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE render_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_render_jobs" ON render_jobs;
CREATE POLICY "select_own_render_jobs" ON render_jobs FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_render_jobs" ON render_jobs;
CREATE POLICY "insert_own_render_jobs" ON render_jobs FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_render_jobs" ON render_jobs;
CREATE POLICY "update_own_render_jobs" ON render_jobs FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_render_jobs" ON render_jobs;
CREATE POLICY "delete_own_render_jobs" ON render_jobs FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Render Outputs
CREATE TABLE IF NOT EXISTS render_outputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  render_job_id uuid NOT NULL REFERENCES render_jobs(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  storage_path text NOT NULL,
  storage_bucket text DEFAULT 'renders',
  file_size bigint,
  duration_seconds numeric,
  width integer,
  height integer,
  fps numeric,
  codec text,
  thumbnail_url text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE render_outputs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_render_outputs" ON render_outputs;
CREATE POLICY "select_own_render_outputs" ON render_outputs FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_render_outputs" ON render_outputs;
CREATE POLICY "insert_own_render_outputs" ON render_outputs FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_render_outputs" ON render_outputs;
CREATE POLICY "update_own_render_outputs" ON render_outputs FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_render_outputs" ON render_outputs;
CREATE POLICY "delete_own_render_outputs" ON render_outputs FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Movie Exports
CREATE TABLE IF NOT EXISTS movie_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  duration_seconds numeric,
  file_size bigint,
  resolution text,
  fps numeric,
  codec text,
  video_url text,
  audio_url text,
  thumbnail_url text,
  subtitles_srt text,
  subtitles_vtt text,
  scene_count integer,
  audio_status text DEFAULT 'pending' CHECK (audio_status IN ('pending', 'mixed', 'completed', 'failed')),
  validation_status text DEFAULT 'pending' CHECK (validation_status IN ('pending', 'valid', 'invalid')),
  validation_result jsonb DEFAULT '{}'::jsonb,
  storage_path text,
  storage_bucket text DEFAULT 'exports',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE movie_exports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_movie_exports" ON movie_exports;
CREATE POLICY "select_own_movie_exports" ON movie_exports FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_movie_exports" ON movie_exports;
CREATE POLICY "insert_own_movie_exports" ON movie_exports FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_movie_exports" ON movie_exports;
CREATE POLICY "update_own_movie_exports" ON movie_exports FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_movie_exports" ON movie_exports;
CREATE POLICY "delete_own_movie_exports" ON movie_exports FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- AI Jobs
CREATE TABLE IF NOT EXISTS ai_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  job_type text NOT NULL CHECK (job_type IN ('research', 'story', 'character_bible', 'world_bible', 'screenplay', 'scene_breakdown', 'shot_list', 'animation_plan', 'asset_generation', 'scene_construction', 'character_animation', 'camera_animation', 'lighting', 'dialogue', 'music', 'sfx', 'video_analysis', 'character_detection', 'environment_analysis', 'scene_detection', 'motion_reconstruction', 'ai_director')),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
  progress numeric DEFAULT 0,
  current_operation text,
  input_data jsonb DEFAULT '{}'::jsonb,
  output_data jsonb DEFAULT '{}'::jsonb,
  error text,
  provider text,
  model text,
  retry_count integer DEFAULT 0,
  max_retries integer DEFAULT 3,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ai_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_ai_jobs" ON ai_jobs;
CREATE POLICY "select_own_ai_jobs" ON ai_jobs FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_ai_jobs" ON ai_jobs;
CREATE POLICY "insert_own_ai_jobs" ON ai_jobs FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_ai_jobs" ON ai_jobs;
CREATE POLICY "update_own_ai_jobs" ON ai_jobs FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_ai_jobs" ON ai_jobs;
CREATE POLICY "delete_own_ai_jobs" ON ai_jobs FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Project Settings
CREATE TABLE IF NOT EXISTS project_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  render_quality text DEFAULT 'draft',
  resolution text DEFAULT '1080p',
  fps integer DEFAULT 30,
  video_codec text DEFAULT 'h264',
  audio_codec text DEFAULT 'aac',
  video_bitrate text,
  audio_bitrate text,
  llm_provider_id uuid REFERENCES ai_providers(id) ON DELETE SET NULL,
  voice_provider_id uuid REFERENCES ai_providers(id) ON DELETE SET NULL,
  music_provider_id uuid REFERENCES ai_providers(id) ON DELETE SET NULL,
  video_provider_id uuid REFERENCES ai_providers(id) ON DELETE SET NULL,
  image_provider_id uuid REFERENCES ai_providers(id) ON DELETE SET NULL,
  blender_path text,
  ffmpeg_path text,
  worker_config jsonb DEFAULT '{}'::jsonb,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(project_id)
);

ALTER TABLE project_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_project_settings" ON project_settings;
CREATE POLICY "select_own_project_settings" ON project_settings FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_project_settings" ON project_settings;
CREATE POLICY "insert_own_project_settings" ON project_settings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_project_settings" ON project_settings;
CREATE POLICY "update_own_project_settings" ON project_settings FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_project_settings" ON project_settings;
CREATE POLICY "delete_own_project_settings" ON project_settings FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text,
  severity text DEFAULT 'info' CHECK (severity IN ('info', 'success', 'warning', 'error')),
  is_read boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_notifications" ON notifications;
CREATE POLICY "select_own_notifications" ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_notifications" ON notifications;
CREATE POLICY "insert_own_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_notifications" ON notifications;
CREATE POLICY "delete_own_notifications" ON notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_videos_project_id ON videos(project_id);
CREATE INDEX IF NOT EXISTS idx_videos_user_id ON videos(user_id);
CREATE INDEX IF NOT EXISTS idx_assets_project_id ON assets(project_id);
CREATE INDEX IF NOT EXISTS idx_assets_user_id ON assets(user_id);
CREATE INDEX IF NOT EXISTS idx_characters_project_id ON characters(project_id);
CREATE INDEX IF NOT EXISTS idx_characters_user_id ON characters(user_id);
CREATE INDEX IF NOT EXISTS idx_worlds_project_id ON worlds(project_id);
CREATE INDEX IF NOT EXISTS idx_worlds_user_id ON worlds(user_id);
CREATE INDEX IF NOT EXISTS idx_locations_world_id ON locations(world_id);
CREATE INDEX IF NOT EXISTS idx_scripts_project_id ON scripts(project_id);
CREATE INDEX IF NOT EXISTS idx_script_scenes_script_id ON script_scenes(script_id);
CREATE INDEX IF NOT EXISTS idx_scenes_project_id ON scenes(project_id);
CREATE INDEX IF NOT EXISTS idx_shots_scene_id ON shots(scene_id);
CREATE INDEX IF NOT EXISTS idx_render_jobs_project_id ON render_jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_render_jobs_status ON render_jobs(status);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_project_id ON ai_jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_status ON ai_jobs(status);
CREATE INDEX IF NOT EXISTS idx_ai_providers_user_id ON ai_providers(user_id);
CREATE INDEX IF NOT EXISTS idx_movie_exports_project_id ON movie_exports(project_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_audio_tracks_project_id ON audio_tracks(project_id);

-- updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all tables with updated_at
DO $$
DECLARE
  t text;
  tables text[] := ARRAY['ai_providers','projects','videos','assets','characters','worlds','locations','scripts','script_scenes','scenes','shots','animations','cameras','lights','audio_tracks','render_jobs','render_outputs','movie_exports','ai_jobs','project_settings','notifications'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'updated_at') THEN
      EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON %I', t);
      EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t);
    END IF;
  END LOOP;
END;
$$;