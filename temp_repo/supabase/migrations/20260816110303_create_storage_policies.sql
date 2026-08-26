/*
# Storage Policies for BlockMotion AI

1. Overview
Creates storage bucket policies for file uploads (videos, assets, audio, renders, exports).
Each user can only access files in their own folder path: user_id/...

2. Security
- RLS policies on storage objects
- Users can CRUD files within their own user_id folder
- Authenticated users only
*/

-- Videos bucket policies
DROP POLICY IF EXISTS "Users can upload own videos" ON storage.objects;
CREATE POLICY "Users can upload own videos" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'videos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can read own videos" ON storage.objects;
CREATE POLICY "Users can read own videos" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'videos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update own videos" ON storage.objects;
CREATE POLICY "Users can update own videos" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'videos' AND (storage.foldername(name))[1] = auth.uid()::text) WITH CHECK (bucket_id = 'videos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete own videos" ON storage.objects;
CREATE POLICY "Users can delete own videos" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'videos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Assets bucket policies
DROP POLICY IF EXISTS "Users can upload own assets" ON storage.objects;
CREATE POLICY "Users can upload own assets" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'assets' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can read own assets" ON storage.objects;
CREATE POLICY "Users can read own assets" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'assets' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update own assets" ON storage.objects;
CREATE POLICY "Users can update own assets" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'assets' AND (storage.foldername(name))[1] = auth.uid()::text) WITH CHECK (bucket_id = 'assets' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete own assets" ON storage.objects;
CREATE POLICY "Users can delete own assets" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'assets' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Audio bucket policies
DROP POLICY IF EXISTS "Users can upload own audio" ON storage.objects;
CREATE POLICY "Users can upload own audio" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'audio' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can read own audio" ON storage.objects;
CREATE POLICY "Users can read own audio" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'audio' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update own audio" ON storage.objects;
CREATE POLICY "Users can update own audio" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'audio' AND (storage.foldername(name))[1] = auth.uid()::text) WITH CHECK (bucket_id = 'audio' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete own audio" ON storage.objects;
CREATE POLICY "Users can delete own audio" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'audio' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Renders bucket policies
DROP POLICY IF EXISTS "Users can upload own renders" ON storage.objects;
CREATE POLICY "Users can upload own renders" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'renders' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can read own renders" ON storage.objects;
CREATE POLICY "Users can read own renders" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'renders' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update own renders" ON storage.objects;
CREATE POLICY "Users can update own renders" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'renders' AND (storage.foldername(name))[1] = auth.uid()::text) WITH CHECK (bucket_id = 'renders' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete own renders" ON storage.objects;
CREATE POLICY "Users can delete own renders" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'renders' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Exports bucket policies
DROP POLICY IF EXISTS "Users can upload own exports" ON storage.objects;
CREATE POLICY "Users can upload own exports" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'exports' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can read own exports" ON storage.objects;
CREATE POLICY "Users can read own exports" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'exports' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update own exports" ON storage.objects;
CREATE POLICY "Users can update own exports" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'exports' AND (storage.foldername(name))[1] = auth.uid()::text) WITH CHECK (bucket_id = 'exports' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete own exports" ON storage.objects;
CREATE POLICY "Users can delete own exports" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'exports' AND (storage.foldername(name))[1] = auth.uid()::text);