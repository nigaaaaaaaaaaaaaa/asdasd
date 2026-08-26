/*
# Add 'audio' to ai_jobs job_type constraint

1. Changes
- The ai_jobs table's job_type CHECK constraint does not include 'audio', but the Movie Generator frontend creates jobs with job_type = 'audio' for the audio planning stage.
- This migration drops the old constraint and recreates it with 'audio' added to the allowed values.
- No data is lost — only the constraint is replaced.

2. Security
- No RLS or policy changes.
*/

ALTER TABLE ai_jobs DROP CONSTRAINT IF EXISTS ai_jobs_job_type_check;

ALTER TABLE ai_jobs ADD CONSTRAINT ai_jobs_job_type_check CHECK (job_type IN (
  'research', 'story', 'character_bible', 'world_bible', 'screenplay',
  'scene_breakdown', 'shot_list', 'animation_plan', 'asset_generation',
  'scene_construction', 'character_animation', 'camera_animation', 'lighting',
  'dialogue', 'music', 'sfx', 'audio',
  'video_analysis', 'character_detection', 'environment_analysis',
  'scene_detection', 'motion_reconstruction', 'ai_director'
));
