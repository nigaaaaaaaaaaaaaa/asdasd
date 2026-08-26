import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from '@/context/RouteContext';
import { EmptyState, LoadingSpinner, ErrorState } from '@/components/ui';
import type { Scene } from '@/types/database';
import {
  Sparkles, Send, Loader2, Undo2, ChevronRight, Film,
  Camera, Sun, Cloud, Users, AlertCircle,
} from 'lucide-react';

const DIRECTOR_SUGGESTIONS = [
  'Make this scene more cinematic.',
  'Make the camera follow the hero.',
  'Add a close-up.',
  'Make the lighting darker.',
  'Add rain.',
  'Make the villain more intimidating.',
  'Slow down the fight.',
  'Add a dramatic camera movement.',
  'Make this scene more emotional.',
];

export function AIDirector() {
  const { params, navigate } = useRouter();
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null);
  const [instruction, setInstruction] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastChange, setLastChange] = useState<{ summary: string; previousScene: Scene } | null>(null);

  const fetchScenes = async () => {
    const { data } = await supabase.from('scenes').select('*').order('number', { ascending: true });
    setScenes((data ?? []) as Scene[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchScenes();
  }, []);

  useEffect(() => {
    if (params.id) {
      const scene = scenes.find((s) => s.id === params.id);
      if (scene) setSelectedScene(scene);
    }
  }, [params.id, scenes]);

  const handleDirect = async () => {
    if (!selectedScene || !instruction.trim()) return;

    setGenerating(true);
    setError(null);

    const { data: provider } = await supabase
      .from('ai_providers')
      .select('*')
      .eq('type', 'llm')
      .eq('is_enabled', true)
      .maybeSingle();

    if (!provider) {
      setError('LLM provider not configured. Go to AI Providers to set up an LLM provider for the AI Director.');
      setGenerating(false);
      return;
    }

    const { data: job } = await supabase.from('ai_jobs').insert({
      project_id: selectedScene.project_id,
      job_type: 'ai_director',
      status: 'processing',
      input_data: { sceneId: selectedScene.id, instruction },
      provider: provider.provider,
      model: provider.model,
    }).select().single();

    try {
      const apiUrl = `/supabase-proxy/functions/v1/ai-generate`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer dummy-anon-key-single-user-proxy`,
        },
        body: JSON.stringify({
          jobId: job.id,
          jobType: 'ai_director',
          provider,
          input: {
            scene: selectedScene,
            instruction,
          },
        }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || `AI Director failed (${response.status})`);
      }

      const result = await response.json();
      const output = result.output ?? result;

      // Apply changes to scene
      const updates: Partial<Scene> = {};
      if (output.camera) updates.camera = output.camera;
      if (output.lighting) updates.lighting = output.lighting;
      if (output.effects) updates.effects = output.effects;

      await supabase.from('scenes').update(updates).eq('id', selectedScene.id);
      await supabase.from('ai_jobs').update({
        status: 'completed',
        output_data: output,
        completed_at: new Date().toISOString(),
      }).eq('id', job.id);

      setLastChange({
        summary: output.summary ?? 'Scene updated by AI Director',
        previousScene: { ...selectedScene },
      });

      setSelectedScene({ ...selectedScene, ...updates });
      setInstruction('');
      setGenerating(false);
      fetchScenes();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      await supabase.from('ai_jobs').update({ status: 'failed', error: msg }).eq('id', job.id);
      setError(msg);
      setGenerating(false);
    }
  };

  const handleUndo = async () => {
    if (!lastChange || !selectedScene) return;
    await supabase.from('scenes').update({
      camera: lastChange.previousScene.camera,
      lighting: lastChange.previousScene.lighting,
      effects: lastChange.previousScene.effects,
    }).eq('id', selectedScene.id);
    setSelectedScene(lastChange.previousScene);
    setLastChange(null);
    fetchScenes();
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  if (scenes.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="p-6 max-w-4xl mx-auto">
          <EmptyState
            icon={Sparkles}
            title="No scenes to direct"
            description="Generate a movie first, then use the AI Director to modify scenes with natural language instructions."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Scene List */}
      <div className="w-64 bg-bg-secondary border-r border-border-subtle overflow-y-auto scrollbar-thin shrink-0">
        <div className="p-3 border-b border-border-subtle">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">AI Director</div>
        </div>
        <div className="p-2 space-y-0.5">
          {scenes.map((scene) => (
            <button
              key={scene.id}
              onClick={() => { setSelectedScene(scene); setLastChange(null); navigate('ai-director', { id: scene.id }); }}
              className={`w-full flex items-center gap-2 p-2 rounded-md text-left transition-colors ${
                selectedScene?.id === scene.id ? 'bg-blue-600/15 text-blue-400' : 'text-gray-400 hover:bg-bg-tertiary'
              }`}
            >
              <div className="w-6 h-6 rounded bg-bg-elevated flex items-center justify-center text-[10px] font-bold shrink-0">
                {scene.number}
              </div>
              <span className="text-xs truncate">{scene.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Director Panel */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {selectedScene ? (
          <div className="p-6 max-w-3xl mx-auto">
            <div className="glass-panel p-5 mb-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-blue-600/15 flex items-center justify-center">
                  <Film className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Scene {selectedScene.number}: {selectedScene.title}</h2>
                  <div className="text-xs text-gray-500">{selectedScene.scene_id} · {selectedScene.duration_seconds ?? 0}s</div>
                </div>
              </div>
              {selectedScene.action && <p className="text-sm text-gray-400">{selectedScene.action}</p>}
            </div>

            {/* Current Settings */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="glass-panel p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Camera className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs font-medium text-gray-400">Camera</span>
                </div>
                <div className="text-xs text-gray-500">
                  {Object.keys(selectedScene.camera || {}).length > 0 ? JSON.stringify(selectedScene.camera) : 'Default'}
                </div>
              </div>
              <div className="glass-panel p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Sun className="w-3.5 h-3.5 text-yellow-400" />
                  <span className="text-xs font-medium text-gray-400">Lighting</span>
                </div>
                <div className="text-xs text-gray-500">
                  {Object.keys(selectedScene.lighting || {}).length > 0 ? JSON.stringify(selectedScene.lighting) : 'Default'}
                </div>
              </div>
              <div className="glass-panel p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-xs font-medium text-gray-400">Effects</span>
                </div>
                <div className="text-xs text-gray-500">
                  {Object.keys(selectedScene.effects || {}).length > 0 ? JSON.stringify(selectedScene.effects) : 'None'}
                </div>
              </div>
            </div>

            {/* AI Change Result */}
            {lastChange && (
              <div className="glass-panel p-4 mb-6 border-emerald-500/30">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-white font-medium">AI Director Applied Changes</div>
                    <div className="text-xs text-gray-400 mt-1">{lastChange.summary}</div>
                  </div>
                  <button onClick={handleUndo} className="btn-secondary flex items-center gap-1 text-xs">
                    <Undo2 className="w-3.5 h-3.5" /> Undo
                  </button>
                </div>
              </div>
            )}

            {error && (
              <ErrorState
                title="AI Director Error"
                message={error}
                onRetry={handleDirect}
                secondaryAction={
                  <button onClick={() => navigate('ai-providers')} className="btn-secondary text-xs">
                    Open AI Settings
                  </button>
                }
              />
            )}

            {/* Instruction Input */}
            <div className="glass-panel p-4">
              <label className="block text-xs font-medium text-gray-400 mb-2">Director Instruction</label>
              <textarea
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="Tell the AI Director what to change about this scene..."
                className="input-field min-h-[80px] resize-y mb-3"
              />
              <div className="flex flex-wrap gap-2 mb-3">
                {DIRECTOR_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setInstruction(s)}
                    className="text-xs px-2.5 py-1 rounded-md bg-bg-tertiary text-gray-400 hover:text-white hover:bg-border-subtle transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
              <button
                onClick={handleDirect}
                disabled={generating || !instruction.trim()}
                className="btn-primary flex items-center gap-2"
              >
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Apply AI Direction
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <EmptyState icon={Sparkles} title="Select a scene" description="Choose a scene from the left to direct it with AI." />
          </div>
        )}
      </div>
    </div>
  );
}
