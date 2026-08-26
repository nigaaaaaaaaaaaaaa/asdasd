/*
# Add 'video_to_3d' to render_jobs job_type constraint

1. Changes
- The render_jobs table's job_type CHECK constraint does not include 'video_to_3d'.
- The Video → 3D page needs to create render jobs with job_type = 'video_to_3d' when
  the user clicks "Process to 3D".
- This migration drops the old constraint and recreates it with 'video_to_3d' added.

2. Security
- No RLS or policy changes.
*/

ALTER TABLE render_jobs DROP CONSTRAINT IF EXISTS render_jobs_job_type_check;

ALTER TABLE render_jobs ADD CONSTRAINT render_jobs_job_type_check CHECK (job_type IN (
  'scene', 'shot', 'preview', 'assembly', 'full_movie', 'video_to_3d'
));
