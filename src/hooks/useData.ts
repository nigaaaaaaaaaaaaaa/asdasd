import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Project, RenderJob, AIJob, MovieExport } from '@/types/database';

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) setError(error.message);
    else setProjects((data ?? []) as Project[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return { projects, loading, error, refetch: fetchProjects };
}

export function useProject(id: string | null) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setProject(null);
      setLoading(false);
      return;
    }
    let active = true;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (!active) return;
      if (error) setError(error.message);
      else setProject(data as Project);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [id]);

  return { project, loading, error, setProject };
}

export function useRenderJobs(projectId?: string) {
  const [jobs, setJobs] = useState<RenderJob[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = useCallback(async () => {
    let query = supabase.from('render_jobs').select('*').order('created_at', { ascending: false });
    if (projectId) query = query.eq('project_id', projectId);
    const { data } = await query;
    setJobs((data ?? []) as RenderJob[]);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, [fetchJobs]);

  return { jobs, loading, refetch: fetchJobs };
}

export function useAIJobs(projectId?: string) {
  const [jobs, setJobs] = useState<AIJob[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = useCallback(async () => {
    let query = supabase.from('ai_jobs').select('*').order('created_at', { ascending: false });
    if (projectId) query = query.eq('project_id', projectId);
    const { data } = await query;
    setJobs((data ?? []) as AIJob[]);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, [fetchJobs]);

  return { jobs, loading, refetch: fetchJobs };
}

export function useMovieExports() {
  const [exports, setExports] = useState<MovieExport[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchExports = useCallback(async () => {
    const { data } = await supabase
      .from('movie_exports')
      .select('*')
      .order('created_at', { ascending: false });
    setExports((data ?? []) as MovieExport[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchExports();
  }, [fetchExports]);

  return { exports, loading, refetch: fetchExports };
}
