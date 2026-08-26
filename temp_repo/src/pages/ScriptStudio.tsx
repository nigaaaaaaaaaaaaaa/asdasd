import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from '@/context/RouteContext';
import { StatusBadge, EmptyState, LoadingSpinner, Modal } from '@/components/ui';
import type { Script, ScriptScene } from '@/types/database';
import { FileText, Plus, Search, Loader2, Save, ChevronRight, Film } from 'lucide-react';

export function ScriptStudio() {
  const { params, navigate } = useRouter();
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedScript, setSelectedScript] = useState<Script | null>(null);
  const [scenes, setScenes] = useState<ScriptScene[]>([]);
  const [loadingScenes, setLoadingScenes] = useState(false);

  const fetchScripts = async () => {
    const { data } = await supabase.from('scripts').select('*').order('updated_at', { ascending: false });
    setScripts((data ?? []) as Script[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchScripts();
  }, []);

  useEffect(() => {
    if (params.id) {
      const script = scripts.find((s) => s.id === params.id);
      if (script) selectScript(script);
    }
  }, [params.id, scripts]);

  const selectScript = async (script: Script) => {
    setSelectedScript(script);
    setLoadingScenes(true);
    const { data } = await supabase
      .from('script_scenes')
      .select('*')
      .eq('script_id', script.id)
      .order('scene_number', { ascending: true });
    setScenes((data ?? []) as ScriptScene[]);
    setLoadingScenes(false);
  };

  const filtered = scripts.filter((s) =>
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    (s.logline ?? '').toLowerCase().includes(search.toLowerCase())
  );

  if (selectedScript) {
    return (
      <ScriptDetail
        script={selectedScript}
        scenes={scenes}
        loadingScenes={loadingScenes}
        onBack={() => { setSelectedScript(null); setScenes([]); navigate('script-studio'); }}
        onScenesUpdated={async () => {
          const { data } = await supabase.from('script_scenes').select('*').eq('script_id', selectedScript.id).order('scene_number', { ascending: true });
          setScenes((data ?? []) as ScriptScene[]);
        }}
      />
    );
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">Script Studio</h2>
            <p className="text-sm text-gray-500 mt-0.5">Screenplays generated and stored in your projects</p>
          </div>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search screenplays..."
            className="input-field pl-10 max-w-md"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-gray-600 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No screenplays yet"
            description="Generate a movie from the Movie Generator to create a screenplay, or it will appear here automatically."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((script) => (
              <button
                key={script.id}
                onClick={() => selectScript(script)}
                className="glass-panel p-5 text-left hover:border-blue-500/30 transition-all group"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600/20 to-blue-800/5 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-white truncate">{script.title}</h3>
                    {script.genre && <span className="text-xs text-gray-500">{script.genre}</span>}
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
                </div>
                {script.logline && <p className="text-sm text-gray-400 italic line-clamp-2 mb-3">{script.logline}</p>}
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  {script.estimated_duration && <span>{Math.round(script.estimated_duration / 60)}min</span>}
                  <span>{new Date(script.updated_at).toLocaleDateString()}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ScriptDetail({
  script,
  scenes,
  loadingScenes,
  onBack,
  onScenesUpdated,
}: {
  script: Script;
  scenes: ScriptScene[];
  loadingScenes: boolean;
  onBack: () => void;
  onScenesUpdated: () => void;
}) {
  const [editingScene, setEditingScene] = useState<ScriptScene | null>(null);
  const [saving, setSaving] = useState(false);

  const saveScene = async (scene: ScriptScene, updates: Partial<ScriptScene>) => {
    setSaving(true);
    await supabase.from('script_scenes').update(updates).eq('id', scene.id);
    setSaving(false);
    setEditingScene(null);
    onScenesUpdated();
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="p-6 max-w-4xl mx-auto">
        <button onClick={onBack} className="btn-ghost mb-4 flex items-center gap-1">
          <ChevronRight className="w-4 h-4 rotate-180" /> Back to scripts
        </button>

        <div className="glass-panel p-6 mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">{script.title}</h2>
          {script.logline && <p className="text-sm text-gray-400 italic mb-3">{script.logline}</p>}
          {script.synopsis && (
            <div className="mt-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Synopsis</h4>
              <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{script.synopsis}</p>
            </div>
          )}
          <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
            {script.genre && <span>Genre: {script.genre}</span>}
            {script.tone && <span>Tone: {script.tone}</span>}
            {script.estimated_duration && <span>Duration: {Math.round(script.estimated_duration / 60)}min</span>}
          </div>
        </div>

        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Film className="w-4 h-4 text-gray-500" /> Scenes ({scenes.length})
        </h3>

        {loadingScenes ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : scenes.length === 0 ? (
          <EmptyState icon={Film} title="No scenes" description="Scenes will appear here after scene generation." />
        ) : (
          <div className="space-y-3">
            {scenes.map((scene) => (
              <div key={scene.id} className="glass-panel p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-blue-600/15 flex items-center justify-center text-xs font-bold text-blue-400">
                      {scene.scene_number}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">{scene.title}</div>
                      <div className="text-xs text-gray-500">
                        {scene.location ?? ''} {scene.time_of_day ? `· ${scene.time_of_day}` : ''}
                        {scene.duration_seconds ? ` · ${scene.duration_seconds}s` : ''}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setEditingScene(scene)} className="btn-ghost text-xs">
                    <Save className="w-3.5 h-3.5" /> Edit
                  </button>
                </div>
                {scene.action && <p className="text-sm text-gray-400 mb-2">{scene.action}</p>}
                {scene.dialogue && scene.dialogue.length > 0 && (
                  <div className="space-y-1.5 mt-2">
                    {(scene.dialogue as Array<{ character: string; text: string }>).map((line, i) => (
                      <div key={i} className="text-xs pl-3 border-l-2 border-border-subtle">
                        <span className="text-blue-400 font-medium">{line.character}:</span>{' '}
                        <span className="text-gray-400">{line.text}</span>
                      </div>
                    ))}
                  </div>
                )}
                {scene.camera_directions && (
                  <div className="text-xs text-gray-600 mt-2 italic">Camera: {scene.camera_directions}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {editingScene && (
        <Modal open={true} onClose={() => setEditingScene(null)} title={`Edit Scene ${editingScene.scene_number}`} maxWidth="max-w-2xl">
          <SceneEditor scene={editingScene} saving={saving} onSave={(updates) => saveScene(editingScene, updates)} />
        </Modal>
      )}
    </div>
  );
}

function SceneEditor({
  scene,
  saving,
  onSave,
}: {
  scene: ScriptScene;
  saving: boolean;
  onSave: (updates: Partial<ScriptScene>) => void;
}) {
  const [title, setTitle] = useState(scene.title);
  const [action, setAction] = useState(scene.action ?? '');
  const [location, setLocation] = useState(scene.location ?? '');
  const [cameraDirections, setCameraDirections] = useState(scene.camera_directions ?? '');
  const [lighting, setLighting] = useState(scene.lighting ?? '');
  const [dialogueText, setDialogueText] = useState(
    JSON.stringify(scene.dialogue, null, 2)
  );

  const handleSave = () => {
    let dialogue: unknown;
    try {
      dialogue = JSON.parse(dialogueText);
    } catch {
      dialogue = scene.dialogue;
    }
    onSave({ title, action, location, camera_directions: cameraDirections, lighting, dialogue: dialogue as unknown[] });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">Scene Title</label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="input-field" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">Location</label>
        <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className="input-field" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">Action</label>
        <textarea value={action} onChange={(e) => setAction(e.target.value)} className="input-field min-h-[80px] resize-y" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">Camera Directions</label>
        <input type="text" value={cameraDirections} onChange={(e) => setCameraDirections(e.target.value)} className="input-field" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">Lighting</label>
        <input type="text" value={lighting} onChange={(e) => setLighting(e.target.value)} className="input-field" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">Dialogue (JSON array)</label>
        <textarea value={dialogueText} onChange={(e) => setDialogueText(e.target.value)} className="input-field min-h-[120px] resize-y font-mono text-xs" />
      </div>
      <div className="flex justify-end gap-3">
        <button onClick={() => setDialogueText('[]')} className="btn-secondary">Reset Dialogue</button>
        <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Scene
        </button>
      </div>
    </div>
  );
}
