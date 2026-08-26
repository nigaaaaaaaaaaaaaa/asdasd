export type ProjectType = 'VIDEO_TO_3D' | 'TEXT_TO_MOVIE' | 'HYBRID';
export type ProjectStatus = 'draft' | 'planning' | 'generating' | 'rendering' | 'assembling' | 'complete' | 'failed' | 'archived';
export type RenderStatus = 'pending' | 'queued' | 'rendering' | 'completed' | 'failed';
export type JobStatus = 'queued' | 'processing' | 'analyzing' | 'building_scene' | 'animating' | 'rendering' | 'encoding' | 'uploading' | 'complete' | 'failed' | 'cancelled';
export type AIJobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type AIJobType = 'research' | 'story' | 'character_bible' | 'world_bible' | 'screenplay' | 'scene_breakdown' | 'shot_list' | 'animation_plan' | 'asset_generation' | 'scene_construction' | 'character_animation' | 'camera_animation' | 'lighting' | 'dialogue' | 'music' | 'sfx' | 'video_analysis' | 'character_detection' | 'environment_analysis' | 'scene_detection' | 'motion_reconstruction' | 'ai_director';
export type ProviderType = 'llm' | 'voice' | 'music' | 'video' | 'image';
export type ProviderStatus = 'active' | 'inactive' | 'not_configured' | 'error';
export type UploadStatus = 'pending' | 'uploading' | 'paused' | 'completed' | 'failed' | 'cancelled';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'editing';
export type AudioType = 'dialogue' | 'music' | 'sfx' | 'ambience' | 'original_audio';
export type AnimationType = 'idle' | 'walk' | 'run' | 'sprint' | 'jump' | 'fall' | 'crouch' | 'climb' | 'swim' | 'attack' | 'block' | 'dodge' | 'turn' | 'look' | 'interact' | 'hold_item' | 'use_item' | 'reaction' | 'knockback' | 'death' | 'respawn' | 'emotional' | 'cinematic_pose' | 'custom';
export type AssetType = 'character' | 'world' | 'location' | 'animation' | 'model' | 'texture' | 'sound' | 'music' | 'effect' | 'camera_preset';
export type RenderQuality = 'draft' | '720p' | '1080p' | '1440p' | '4k';
export type CameraMode = 'original' | 'cinematic' | 'ai_director';

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  type: ProjectType;
  status: ProjectStatus;
  thumbnail_url: string | null;
  duration_minutes: number;
  visual_style: string;
  genre: string | null;
  tone: string | null;
  fps: number;
  resolution: string;
  render_quality: string;
  voice_enabled: boolean;
  music_enabled: boolean;
  auto_approve: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Video {
  id: string;
  project_id: string;
  user_id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  mime_type: string | null;
  storage_path: string;
  storage_bucket: string;
  duration_seconds: number | null;
  fps: number | null;
  width: number | null;
  height: number | null;
  codec: string | null;
  upload_status: UploadStatus;
  upload_progress: number;
  upload_speed: number | null;
  uploaded_bytes: number;
  analysis_status: string;
  analysis_result: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Character {
  id: string;
  project_id: string;
  user_id: string;
  character_id: string;
  name: string;
  role: string | null;
  description: string | null;
  appearance: Record<string, unknown>;
  face: Record<string, unknown>;
  eyes: Record<string, unknown>;
  hair: Record<string, unknown>;
  clothing: Record<string, unknown>;
  armor: Record<string, unknown>;
  accessories: Record<string, unknown>;
  colors: Record<string, unknown>;
  personality: Record<string, unknown>;
  abilities: Record<string, unknown>;
  equipment: Record<string, unknown>;
  relationships: Record<string, unknown>;
  voice_config: Record<string, unknown>;
  animation_style: Record<string, unknown>;
  model_path: string | null;
  reference_images: string[];
  thumbnail_url: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface World {
  id: string;
  project_id: string;
  user_id: string;
  name: string;
  description: string | null;
  world_bible: Record<string, unknown>;
  terrain: Record<string, unknown>;
  weather: Record<string, unknown>;
  time_settings: Record<string, unknown>;
  world_rules: Record<string, unknown>;
  important_objects: Record<string, unknown>;
  thumbnail_url: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Location {
  id: string;
  world_id: string;
  project_id: string;
  user_id: string;
  location_id: string;
  name: string;
  type: string | null;
  description: string | null;
  terrain_data: Record<string, unknown>;
  buildings: Record<string, unknown>;
  environment: Record<string, unknown>;
  model_path: string | null;
  thumbnail_url: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Script {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  logline: string | null;
  synopsis: string | null;
  genre: string | null;
  tone: string | null;
  theme: string | null;
  characters: unknown[];
  locations: unknown[];
  estimated_duration: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ScriptScene {
  id: string;
  script_id: string;
  project_id: string;
  user_id: string;
  scene_number: number;
  title: string;
  location: string | null;
  time_of_day: string | null;
  duration_seconds: number | null;
  characters: unknown[];
  action: string | null;
  dialogue: unknown[];
  camera_directions: string | null;
  lighting: string | null;
  sound: string | null;
  music: string | null;
  effects: string | null;
  transition: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Scene {
  id: string;
  project_id: string;
  user_id: string;
  script_scene_id: string | null;
  scene_id: string;
  number: number;
  title: string;
  location_id: string | null;
  duration_seconds: number | null;
  characters: unknown[];
  environment: Record<string, unknown>;
  action: string | null;
  dialogue: unknown[];
  camera: Record<string, unknown>;
  lighting: Record<string, unknown>;
  animation: Record<string, unknown>;
  audio: Record<string, unknown>;
  effects: Record<string, unknown>;
  approval_status: ApprovalStatus;
  render_status: RenderStatus;
  preview_url: string | null;
  thumbnail_url: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Shot {
  id: string;
  scene_id: string;
  project_id: string;
  user_id: string;
  shot_id: string;
  number: number;
  title: string | null;
  shot_type: string | null;
  duration_seconds: number | null;
  camera: Record<string, unknown>;
  characters: unknown[];
  action: string | null;
  dialogue: unknown[];
  effects: Record<string, unknown>;
  render_status: RenderStatus;
  preview_url: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface RenderJob {
  id: string;
  project_id: string;
  scene_id: string | null;
  shot_id: string | null;
  user_id: string;
  job_type: string;
  status: JobStatus;
  progress: number;
  current_operation: string | null;
  error: string | null;
  retry_count: number;
  max_retries: number;
  settings: Record<string, unknown>;
  output_file: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AIJob {
  id: string;
  project_id: string;
  user_id: string;
  job_type: AIJobType;
  status: AIJobStatus;
  progress: number;
  current_operation: string | null;
  input_data: Record<string, unknown>;
  output_data: Record<string, unknown>;
  error: string | null;
  provider: string | null;
  model: string | null;
  retry_count: number;
  max_retries: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AIProvider {
  id: string;
  user_id: string;
  name: string;
  type: ProviderType;
  provider: string;
  model: string | null;
  api_url: string | null;
  api_key_encrypted: string | null;
  status: ProviderStatus;
  config: Record<string, unknown>;
  is_enabled: boolean;
  last_tested_at: string | null;
  last_test_result: string | null;
  created_at: string;
  updated_at: string;
}

export interface MovieExport {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  duration_seconds: number | null;
  file_size: number | null;
  resolution: string | null;
  fps: number | null;
  codec: string | null;
  video_url: string | null;
  audio_url: string | null;
  thumbnail_url: string | null;
  subtitles_srt: string | null;
  subtitles_vtt: string | null;
  scene_count: number | null;
  audio_status: string;
  validation_status: string;
  validation_result: Record<string, unknown>;
  storage_path: string | null;
  storage_bucket: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AudioTrack {
  id: string;
  project_id: string;
  scene_id: string | null;
  character_id: string | null;
  user_id: string;
  name: string;
  type: AudioType;
  text: string | null;
  voice_config: Record<string, unknown>;
  start_time: number | null;
  duration_seconds: number | null;
  storage_path: string | null;
  storage_bucket: string;
  status: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Asset {
  id: string;
  project_id: string | null;
  user_id: string;
  name: string;
  type: AssetType;
  category: string | null;
  storage_path: string | null;
  storage_bucket: string;
  thumbnail_url: string | null;
  metadata: Record<string, unknown>;
  tags: string[];
  is_shared: boolean;
  created_at: string;
  updated_at: string;
}

export interface CharacterVersion {
  id: string;
  character_id: string;
  user_id: string;
  version_number: number;
  snapshot: Record<string, unknown>;
  change_description: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  project_id: string | null;
  type: string;
  title: string;
  message: string | null;
  severity: 'info' | 'success' | 'warning' | 'error';
  is_read: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ProjectSettings {
  id: string;
  project_id: string;
  user_id: string;
  render_quality: string;
  resolution: string;
  fps: number;
  video_codec: string;
  audio_codec: string;
  video_bitrate: string | null;
  audio_bitrate: string | null;
  llm_provider_id: string | null;
  voice_provider_id: string | null;
  music_provider_id: string | null;
  video_provider_id: string | null;
  image_provider_id: string | null;
  blender_path: string | null;
  ffmpeg_path: string | null;
  worker_config: Record<string, unknown>;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}
