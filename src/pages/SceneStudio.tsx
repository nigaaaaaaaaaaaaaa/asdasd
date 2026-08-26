import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from '@/context/RouteContext';
import { StatusBadge, EmptyState, Modal } from '@/components/ui';
import type { Scene, Shot } from '@/types/database';
import {
  Film, ChevronRight, Loader2, Search, Camera, Play,
  CheckCircle2, XCircle, Clock, Eye,
} from 'lucide-react';

export function SceneStudio() {
  const { params, navigate } = useRouter();
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Scene | null>(null);
  const [shots, setShots] = useState<Shot[]>([]);
  const [previewScene, setPreviewScene] = useState<Scene | null>(null);

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
      if (scene) selectScene(scene);
    }
  }, [params.id, scenes]);

  const selectScene = async (scene: Scene) => {
    setSelected(scene);
    const { data } = await supabase
      .from('shots')
      .select('*')
      .eq('scene_id', scene.id)
      .order('number', { ascending: true });
    setShots((data ?? []) as Shot[]);
  };

  const approveScene = async (scene: Scene) => {
    await supabase.from('scenes').update({ approval_status: 'approved' }).eq('id', scene.id);
    fetchScenes();
    if (selected?.id === scene.id) setSelected({ ...scene, approval_status: 'approved' });
  };

  const rejectScene = async (scene: Scene) => {
    await supabase.from('scenes').update({ approval_status: 'rejected' }).eq('id', scene.id);
    fetchScenes();
    if (selected?.id === scene.id) setSelected({ ...scene, approval_status: 'rejected' });
  };

  const filtered = scenes.filter((s) =>
    s.title.toLowerCase().includes(search.toLowerCase())
  );

  if (selected) {
    return (
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="p-6 max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => { setSelected(null); navigate('scene-studio'); }} className="btn-ghost flex items-center gap-1">
              <ChevronRight className="w-4 h-4 rotate-180" /> Back to scenes
            </button>
            <div className="flex items-center gap-2">
              <button onClick={() => setPreviewScene(selected)} className="btn-secondary flex items-center gap-2 text-xs">
                <Eye className="w-3.5 h-3.5" /> Preview
              </button>
              <button onClick={() => approveScene(selected)} className="btn-primary flex items-center gap-2 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5" /> Approve
              </button>
              <button onClick={() => rejectScene(selected)} className="btn-secondary flex items-center gap-2 text-xs !text-red-400">
                <XCircle className="w-3.5 h-3.5" /> Reject
              </button>
            </div>
          </div>

          <div className="glass-panel p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-blue-600/15 flex items-center justify-center text-lg font-bold text-blue-400 shrink-0">
                {selected.number}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-white">{selected.title}</h2>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  <span>{selected.scene_id}</span>
                  {selected.location_id && <span>· {selected.location_id}</span>}
                  {selected.duration_seconds && <span>· {selected.duration_seconds}s</span>}
                  <StatusBadge status={selected.approval_status} />
                  <StatusBadge status={selected.render_status} />
                </div>
              </div>
            </div>
            {selected.action && <p className="text-sm text-gray-400 mt-4">{selected.action}</p>}
          </div>

          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Camera className="w-4 h-4 text-gray-500" /> Shots ({shots.length})
          </h3>

          {shots.length === 0 ? (
            <EmptyState icon={Camera} title="No shots" description="Shots are generated from the shot list stage." />
          ) : (
            <div className="space-y-2">
              {shots.map((shot) => (
                <div key={shot.id} className="glass-panel p-3 flex items-center gap-3">
                  <Camera className="w-4 h-4 text-gray-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">Shot {shot.number}: {shot.title ?? 'Untitled'}</div>
                    <div className="text-xs text-gray-500">{shot.shot_type ?? ''} · {shot.duration_seconds ?? ''}s</div>
                  </div>
                  <StatusBadge status={shot.render_status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {previewScene && (
          <Modal open={true} onClose={() => setPreviewScene(null)} title={`Preview: ${previewScene.title}`} maxWidth="max-w-2xl">
            <div className="space-y-4">
              <div className="aspect-video bg-bg-tertiary rounded-lg flex items-center justify-center border border-border-subtle">
                {previewScene.preview_url ? (
                  <video src={previewScene.preview_url} controls className="w-full h-full rounded-lg" />
                ) : (
                  <div className="text-center">
                    <Play className="w-12 h-12 text-gray-700 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Preview not yet rendered</p>
                    <p className="text-xs text-gray-600 mt-1">Render a preview to see this scene</p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 justify-center">
                <button onClick={() => approveScene(previewScene)} className="btn-primary flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Approve Scene
                </button>
                <button onClick={() => setPreviewScene(null)} className="btn-secondary">Close</button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="p-6 max-w-6xl mx-auto">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white">Scene Studio</h2>
          <p className="text-sm text-gray-500 mt-0.5">Production scenes with shots, approval, and preview</p>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search scenes..."
            className="input-field pl-10 max-w-md"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-gray-600 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Film}
            title="No scenes yet"
            description="Scenes are generated during the movie creation pipeline. Each scene contains multiple shots."
          />
        ) : (
          <div className="space-y-2">
            {filtered.map((scene) => (
              <button
                key={scene.id}
                onClick={() => selectScene(scene)}
                className="w-full glass-panel p-4 text-left hover:border-blue-500/30 transition-all group flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-md bg-blue-600/15 flex items-center justify-center text-sm font-bold text-blue-400 shrink-0">
                  {scene.number}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{scene.title}</div>
                  <div className="text-xs text-gray-500">
                    {scene.scene_id} {scene.location_id ? `· ${scene.location_id}` : ''}
                    {scene.duration_seconds ? `· ${scene.duration_seconds}s` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={scene.approval_status} />
                  <StatusBadge status={scene.render_status} />
                  <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
