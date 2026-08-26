import { useState } from 'react';
import { useRouter } from '@/context/RouteContext';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { LoadingSpinner, ErrorState } from '@/components/ui';
import {
  Clapperboard, ChevronLeft, ChevronRight, Loader2, Sparkles,
  Search, FileText, Users, Globe, Film, Camera, Music,
  Video, Download, CheckCircle2, AlertCircle, Settings2,
} from 'lucide-react';

const STEPS = [
  { id: 0, label: 'Idea', icon: Sparkles },
  { id: 1, label: 'Settings', icon: Settings2 },
  { id: 2, label: 'Research', icon: Search },
  { id: 3, label: 'Story', icon: FileText },
  { id: 4, label: 'Characters', icon: Users },
  { id: 5, label: 'World', icon: Globe },
  { id: 6, label: 'Screenplay', icon: FileText },
  { id: 7, label: 'Scenes', icon: Film },
  { id: 8, label: 'Shots', icon: Camera },
  { id: 9, label: 'Animation', icon: Film },
  { id: 10, label: 'Audio', icon: Music },
  { id: 11, label: 'Render', icon: Video },
  { id: 12, label: 'Final Movie', icon: Download },
];

const DURATIONS = [15, 20, 30, 45, 60, 90, 120];
const GENRES = ['Fantasy', 'Adventure', 'Action', 'Drama', 'Comedy', 'Horror', 'Sci-Fi', 'Mystery', 'Epic'];
const TONES = ['Cinematic', 'Dramatic', 'Lighthearted', 'Dark', 'Epic', 'Whimsical', 'Tense', 'Emotional'];
const RESOLUTIONS = ['720p', '1080p', '1440p', '4K'];
const FPS_OPTIONS = [24, 30, 60];

export function MovieGenerator() {
  const { navigate } = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);

  // Form state
  const [idea, setIdea] = useState('');
  const [duration, setDuration] = useState(15);
  const [customDuration, setCustomDuration] = useState('');
  const [genre, setGenre] = useState('Fantasy');
  const [tone, setTone] = useState('Cinematic');
  const [resolution, setResolution] = useState('1080p');
  const [fps, setFps] = useState(30);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [autoApprove, setAutoApprove] = useState(false);

  // Generation results
  const [research, setResearch] = useState<{ sources: string[]; facts: string[]; notes: string } | null>(null);
  const [story, setStory] = useState<{ title: string; logline: string; synopsis: string; characters: string[] } | null>(null);
  const [characters, setCharacters] = useState<unknown[]>([]);
  const [world, setWorld] = useState<unknown>(null);
  const [screenplay, setScreenplay] = useState<unknown>(null);
  const [scenes, setScenes] = useState<unknown[]>([]);
  const [shots, setShots] = useState<unknown[]>([]);
  const [animations, setAnimations] = useState<unknown[]>([]);
  const [audio, setAudio] = useState<unknown[]>([]);
  const [renderProgress, setRenderProgress] = useState(0);
  const [finalMovie, setFinalMovie] = useState<{ videoUrl: string; duration: number } | null>(null);

  const finalDuration = customDuration ? Math.min(120, Math.max(15, parseInt(customDuration) || 15)) : duration;

  const canProceed = () => {
    if (step === 0) return idea.trim().length > 10;
    return true;
  };

  const handleNext = async () => {
    setError(null);
    if (step === 0) {
      // Create project
      setLoading(true);
      const { data, error } = await supabase
        .from('projects')
        .insert({
          name: idea.slice(0, 60) || 'Untitled Movie',
          description: idea,
          type: 'TEXT_TO_MOVIE',
          duration_minutes: finalDuration,
          genre,
          tone,
          resolution,
          fps,
          voice_enabled: voiceEnabled,
          music_enabled: musicEnabled,
          auto_approve: autoApprove,
          status: 'planning',
        })
        .select()
        .single();
      if (error) { setError(error.message); setLoading(false); return; }
      setProjectId(data.id);
      await supabase.from('project_settings').insert({ project_id: data.id });
      setLoading(false);
    }
    if (step < STEPS.length - 1) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const generateStage = async (jobType: string, input: Record<string, unknown>) => {
    setLoading(true);
    setError(null);

    const { data: provider } = await supabase
      .from('ai_providers')
      .select('id, provider, model')
      .eq('type', 'llm')
      .eq('is_enabled', true)
      .maybeSingle();

    if (!provider) {
      setError('LLM provider not configured. Go to AI Providers to set up an LLM provider for screenplay generation.');
      setLoading(false);
      return null;
    }

    const { data: job } = await supabase
      .from('ai_jobs')
      .insert({
        project_id: projectId,
        job_type: jobType,
        status: 'queued',
        input_data: input,
        provider: provider.provider,
        model: provider.model,
      })
      .select()
      .single();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const apiUrl = `/supabase-proxy/functions/v1/ai-generate`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer dummy-anon-key-single-user-proxy`,
        },
        body: JSON.stringify({
          jobId: job.id,
          jobType,
          input,
        }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || `Generation failed (${response.status})`);
      }

      const result = await response.json();

      // The edge function already updates the job status, but we also update here
      // for immediate UI consistency in case of race conditions.
      await supabase.from('ai_jobs').update({
        status: 'completed',
        output_data: result.output ?? result,
        progress: 100,
        completed_at: new Date().toISOString(),
      }).eq('id', job.id);

      setLoading(false);
      return result.output ?? result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      await supabase.from('ai_jobs').update({
        status: 'failed',
        error: msg,
      }).eq('id', job.id);
      setError(msg);
      setLoading(false);
      return null;
    }
  };

  const handleGenerate = async () => {
    const stageMap: Record<number, { type: string; input: Record<string, unknown>; setter: (data: unknown) => void }> = {
      2: { type: 'research', input: { idea }, setter: (d) => setResearch(d as typeof research) },
      3: { type: 'story', input: { idea, genre, tone, duration: finalDuration, research }, setter: (d) => setStory(d as typeof story) },
      4: { type: 'character_bible', input: { idea, story }, setter: (d) => setCharacters(d as unknown[]) },
      5: { type: 'world_bible', input: { idea, story, characters }, setter: (d) => setWorld(d) },
      6: { type: 'screenplay', input: { idea, story, characters, world, duration: finalDuration }, setter: (d) => setScreenplay(d) },
      7: { type: 'scene_breakdown', input: { screenplay, characters, world }, setter: (d) => setScenes(d as unknown[]) },
      8: { type: 'shot_list', input: { scenes, screenplay, characters, world }, setter: (d) => setShots(d as unknown[]) },
      9: { type: 'animation_plan', input: { scenes, shots, characters }, setter: (d) => setAnimations(d as unknown[]) },
      10: { type: 'audio', input: { scenes, characters, voiceEnabled, musicEnabled }, setter: (d) => setAudio(d as unknown[]) },
    };

    const stage = stageMap[step];
    if (!stage) return;

    const result = await generateStage(stage.type, stage.input);
    if (result) {
      stage.setter(result.output ?? result);
      if (step < STEPS.length - 1) setStep(step + 1);
    }
  };

  const handleRender = async () => {
    setLoading(true);
    setError(null);
    setRenderProgress(0);

    if (!projectId) return;

    await supabase.from('projects').update({ status: 'rendering' }).eq('id', projectId);

    const { data: renderJob } = await supabase
      .from('render_jobs')
      .insert({
        project_id: projectId,
        job_type: 'full_movie',
        status: 'queued',
        settings: { resolution, fps, quality: 'final' },
      })
      .select()
      .single();

    // Poll for progress
    const pollInterval = setInterval(async () => {
      const { data } = await supabase
        .from('render_jobs')
        .select('status, progress, current_operation, error, output_file')
        .eq('id', renderJob.id)
        .single();

      if (data) {
        setRenderProgress(data.progress);
        if (data.status === 'complete') {
          clearInterval(pollInterval);
          setLoading(false);
          setFinalMovie({ videoUrl: (data as { output_file?: string | null }).output_file ?? '', duration: finalDuration * 60 });
          setStep(12);
          await supabase.from('projects').update({ status: 'complete' }).eq('id', projectId);
        } else if (data.status === 'failed') {
          clearInterval(pollInterval);
          setLoading(false);
          setError(`Render failed: ${data.error ?? 'Unknown error'}`);
          await supabase.from('projects').update({ status: 'failed' }).eq('id', projectId);
        }
      }
    }, 3000);
  };

  const currentStep = STEPS[step];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Wizard Stepper */}
      <div className="border-b border-border-subtle bg-bg-secondary px-6 py-3">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={s.id} className="flex items-center shrink-0">
                <button
                  onClick={() => i <= step && setStep(i)}
                  disabled={i > step}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    i === step
                      ? 'bg-blue-600/15 text-blue-400 border border-blue-600/20'
                      : i < step
                      ? 'text-gray-400 hover:text-white cursor-pointer'
                      : 'text-gray-600 cursor-not-allowed'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{s.label}</span>
                </button>
                {i < STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-gray-700 mx-0.5" />}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="p-6 max-w-4xl mx-auto">
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm text-red-400">{error}</div>
                {error.includes('not configured') && (
                  <button onClick={() => navigate('ai-providers')} className="text-xs text-blue-400 hover:text-blue-300 mt-2">
                    Configure Provider →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Step 0: Idea */}
          {step === 0 && (
            <div className="animate-fade-in">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-600/20 to-amber-800/5 mb-4">
                  <Clapperboard className="w-8 h-8 text-amber-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Create Your Movie</h2>
                <p className="text-sm text-gray-500 max-w-lg mx-auto">
                  Describe your movie idea and BlockMotion AI will generate the story, characters, world,
                  screenplay, 3D scenes, audio, and final rendered movie.
                </p>
              </div>
              <textarea
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                className="input-field min-h-[160px] text-base resize-y"
                placeholder="Create a cinematic Minecraft fantasy movie about a powerful warrior defending a village from a mysterious enemy. Include multiple characters, dialogue, emotional scenes, action scenes, detailed environments, cinematic camera work and a large final battle."
              />
              <div className="text-xs text-gray-600 mt-2">
                {idea.length} characters · Be as detailed as possible for best results
              </div>
            </div>
          )}

          {/* Step 1: Settings */}
          {step === 1 && (
            <div className="animate-fade-in space-y-6">
              <h2 className="text-xl font-bold text-white mb-4">Movie Settings</h2>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">Duration</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {DURATIONS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => { setDuration(d); setCustomDuration(''); }}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        duration === d && !customDuration ? 'bg-blue-600 text-white' : 'bg-bg-tertiary text-gray-400 hover:text-white'
                      }`}
                    >
                      {d} min
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Custom:</span>
                  <input
                    type="number"
                    value={customDuration}
                    onChange={(e) => setCustomDuration(e.target.value)}
                    min={15}
                    max={120}
                    className="input-field w-24"
                    placeholder="15-120"
                  />
                  <span className="text-xs text-gray-500">minutes (15–120)</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2">Genre</label>
                  <select value={genre} onChange={(e) => setGenre(e.target.value)} className="input-field">
                    {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2">Tone</label>
                  <select value={tone} onChange={(e) => setTone(e.target.value)} className="input-field">
                    {TONES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2">Resolution</label>
                  <select value={resolution} onChange={(e) => setResolution(e.target.value)} className="input-field">
                    {RESOLUTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2">FPS</label>
                  <select value={fps} onChange={(e) => setFps(Number(e.target.value))} className="input-field">
                    {FPS_OPTIONS.map((f) => <option key={f} value={f}>{f} fps</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={voiceEnabled} onChange={(e) => setVoiceEnabled(e.target.checked)} className="w-4 h-4 accent-blue-600" />
                  <span className="text-sm text-gray-300">Voice dialogue (requires voice provider)</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={musicEnabled} onChange={(e) => setMusicEnabled(e.target.checked)} className="w-4 h-4 accent-blue-600" />
                  <span className="text-sm text-gray-300">Music and sound effects</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={autoApprove} onChange={(e) => setAutoApprove(e.target.checked)} className="w-4 h-4 accent-blue-600" />
                  <span className="text-sm text-gray-300">Auto-approve all stages (no manual review)</span>
                </label>
              </div>
            </div>
          )}

          {/* Step 2: Research */}
          {step === 2 && (
            <StageContainer
              title="Research"
              icon={Search}
              description="BlockMotion AI researches public information relevant to your movie idea."
              data={research}
              loading={loading}
              onGenerate={handleGenerate}
              generateLabel="Run Research"
              render={(d) => (
                <div className="space-y-4">
                  {d?.sources && d.sources.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Sources</h4>
                      <ul className="space-y-1">
                        {d.sources.map((s, i) => <li key={i} className="text-sm text-gray-400 flex items-start gap-2"><span className="text-gray-600 mt-0.5">•</span>{s}</li>)}
                      </ul>
                    </div>
                  )}
                  {d?.facts && d.facts.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Key Facts</h4>
                      <ul className="space-y-1">
                        {d.facts.map((f, i) => <li key={i} className="text-sm text-gray-400 flex items-start gap-2"><span className="text-gray-600 mt-0.5">•</span>{f}</li>)}
                      </ul>
                    </div>
                  )}
                  {d?.notes && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Notes</h4>
                      <p className="text-sm text-gray-400">{d.notes}</p>
                    </div>
                  )}
                </div>
              )}
            />
          )}

          {/* Step 3: Story */}
          {step === 3 && (
            <StageContainer
              title="Story"
              icon={FileText}
              description="The AI creates a complete story structure from your idea."
              data={story}
              loading={loading}
              onGenerate={handleGenerate}
              generateLabel="Generate Story"
              render={(d) => (
                <div className="space-y-4">
                  {d?.title && <h3 className="text-lg font-bold text-white">{d.title}</h3>}
                  {d?.logline && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Logline</h4>
                      <p className="text-sm text-gray-300 italic">{d.logline}</p>
                    </div>
                  )}
                  {d?.synopsis && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Synopsis</h4>
                      <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-wrap">{d.synopsis}</p>
                    </div>
                  )}
                  {d?.characters && d.characters.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Main Characters</h4>
                      <ul className="space-y-1">
                        {d.characters.map((c, i) => <li key={i} className="text-sm text-gray-400 flex items-start gap-2"><span className="text-gray-600 mt-0.5">•</span>{c}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            />
          )}

          {/* Step 4: Characters */}
          {step === 4 && (
            <StageContainer
              title="Character Bible"
              icon={Users}
              description="Detailed character designs with appearance, personality, abilities, and equipment."
              data={characters}
              loading={loading}
              onGenerate={handleGenerate}
              generateLabel="Generate Characters"
              render={(d) => (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(d as unknown[]).map((c, i) => {
                    const char = c as Record<string, string>;
                    return (
                      <div key={i} className="glass-panel p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600/20 to-blue-800/5 flex items-center justify-center">
                            <Users className="w-5 h-5 text-blue-400" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-white">{char.name ?? `Character ${i + 1}`}</div>
                            <div className="text-xs text-gray-500">{char.role ?? ''}</div>
                          </div>
                        </div>
                        {char.description && <p className="text-xs text-gray-400 mb-2">{char.description}</p>}
                        <div className="space-y-1">
                          {char.appearance && <div className="text-xs text-gray-500"><span className="text-gray-600">Appearance:</span> {char.appearance}</div>}
                          {char.personality && <div className="text-xs text-gray-500"><span className="text-gray-600">Personality:</span> {char.personality}</div>}
                          {char.equipment && <div className="text-xs text-gray-500"><span className="text-gray-600">Equipment:</span> {char.equipment}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            />
          )}

          {/* Step 5: World */}
          {step === 5 && (
            <StageContainer
              title="World Bible"
              icon={Globe}
              description="The world, locations, terrain, weather, and rules of your movie."
              data={world}
              loading={loading}
              onGenerate={handleGenerate}
              generateLabel="Generate World"
              render={(d) => {
                const w = d as Record<string, unknown> | null;
                return (
                  <div className="space-y-4">
                    {w?.name ? <h3 className="text-lg font-bold text-white">{String(w.name)}</h3> : null}
                    {w?.description ? <p className="text-sm text-gray-400">{String(w.description)}</p> : null}
                    {w?.locations && Array.isArray(w.locations) ? (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Locations</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {(w.locations as unknown[]).map((l, i) => {
                            const loc = l as Record<string, string>;
                            return (
                              <div key={i} className="glass-panel p-3">
                                <div className="text-sm font-medium text-white">{loc.name ?? `Location ${i + 1}`}</div>
                                {loc.type && <div className="text-xs text-blue-400 mt-0.5">{loc.type}</div>}
                                {loc.description && <p className="text-xs text-gray-500 mt-1">{loc.description}</p>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              }}
            />
          )}

          {/* Step 6: Screenplay */}
          {step === 6 && (
            <StageContainer
              title="Screenplay"
              icon={FileText}
              description="A full screenplay with acts, scenes, dialogue, and camera directions."
              data={screenplay}
              loading={loading}
              onGenerate={handleGenerate}
              generateLabel="Generate Screenplay"
              render={(d) => {
                const s = d as Record<string, unknown> | null;
                return (
                  <div className="space-y-4">
                    {s?.title ? <h3 className="text-lg font-bold text-white">{String(s.title)}</h3> : null}
                    {s?.logline ? <p className="text-sm text-gray-400 italic">{String(s.logline)}</p> : null}
                    {s?.scenes && Array.isArray(s.scenes) ? (
                      <div className="space-y-3">
                        {(s.scenes as unknown[]).map((sc, i) => {
                          const scene = sc as Record<string, unknown>;
                          return (
                            <div key={i} className="glass-panel p-4">
                              <div className="flex items-center justify-between mb-2">
                                <div className="text-sm font-semibold text-white">Scene {String(scene.scene_number ?? i + 1)}: {String(scene.title ?? '')}</div>
                                <div className="text-xs text-gray-500">{String(scene.location ?? '')} · {String(scene.time_of_day ?? '')}</div>
                              </div>
                              {scene.action ? <p className="text-sm text-gray-400 mb-2">{String(scene.action)}</p> : null}
                              {scene.dialogue && Array.isArray(scene.dialogue) ? (
                                <div className="space-y-1.5 mt-2">
                                  {(scene.dialogue as unknown[]).map((dl, j) => {
                                    const line = dl as Record<string, string>;
                                    return (
                                      <div key={j} className="text-xs pl-3 border-l-2 border-border-subtle">
                                        <span className="text-blue-400 font-medium">{line.character}:</span>{' '}
                                        <span className="text-gray-400">{line.text}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              }}
            />
          )}

          {/* Step 7: Scenes */}
          {step === 7 && (
            <StageContainer
              title="Scene Breakdown"
              icon={Film}
              description="The screenplay converted into production-ready scene records."
              data={scenes}
              loading={loading}
              onGenerate={handleGenerate}
              generateLabel="Generate Scenes"
              render={(d) => (
                <div className="space-y-2">
                  {(d as unknown[]).map((s, i) => {
                    const scene = s as Record<string, unknown>;
                    return (
                      <div key={i} className="glass-panel p-3 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-md bg-blue-600/15 flex items-center justify-center text-xs font-bold text-blue-400 shrink-0">
                          {String(scene.number ?? i + 1)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-white truncate">{String(scene.title ?? `Scene ${i + 1}`)}</div>
                          <div className="text-xs text-gray-500">{String(scene.location ?? '')} · {String(scene.duration_seconds ?? '')}s</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            />
          )}

          {/* Step 8: Shots */}
          {step === 8 && (
            <StageContainer
              title="Shot List"
              icon={Camera}
              description="Each scene broken into individual camera shots."
              data={shots}
              loading={loading}
              onGenerate={handleGenerate}
              generateLabel="Generate Shots"
              render={(d) => (
                <div className="space-y-2">
                  {(d as unknown[]).map((s, i) => {
                    const shot = s as Record<string, unknown>;
                    return (
                      <div key={i} className="glass-panel p-3 flex items-center gap-3">
                        <Camera className="w-4 h-4 text-gray-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-white truncate">Shot {String(shot.number ?? i + 1)}: {String(shot.title ?? '')}</div>
                          <div className="text-xs text-gray-500">{String(shot.shot_type ?? '')} · {String(shot.duration_seconds ?? '')}s</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            />
          )}

          {/* Step 9: Animation */}
          {step === 9 && (
            <StageContainer
              title="Animation Plans"
              icon={Film}
              description="Character animation, camera movement, and lighting plans for each scene."
              data={animations}
              loading={loading}
              onGenerate={handleGenerate}
              generateLabel="Generate Animation Plans"
              render={(d) => (
                <div className="space-y-2">
                  {(d as unknown[]).map((a, i) => {
                    const anim = a as Record<string, unknown>;
                    return (
                      <div key={i} className="glass-panel p-3">
                        <div className="text-sm text-white">{String(anim.name ?? `Animation ${i + 1}`)}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{String(anim.type ?? '')} · {String(anim.duration_seconds ?? '')}s</div>
                      </div>
                    );
                  })}
                </div>
              )}
            />
          )}

          {/* Step 10: Audio */}
          {step === 10 && (
            <StageContainer
              title="Audio Plan"
              icon={Music}
              description="Dialogue, music, sound effects, and ambience for your movie."
              data={audio}
              loading={loading}
              onGenerate={handleGenerate}
              generateLabel="Generate Audio Plan"
              render={(d) => (
                <div className="space-y-2">
                  {(d as unknown[]).map((a, i) => {
                    const track = a as Record<string, unknown>;
                    return (
                      <div key={i} className="glass-panel p-3 flex items-center gap-3">
                        <Music className="w-4 h-4 text-gray-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-white truncate">{String(track.name ?? `Track ${i + 1}`)}</div>
                          <div className="text-xs text-gray-500 capitalize">{String(track.type ?? '')}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            />
          )}

          {/* Step 11: Render */}
          {step === 11 && (
            <div className="animate-fade-in">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600/20 to-blue-800/5 mb-4">
                  <Video className="w-8 h-8 text-blue-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Render Your Movie</h2>
                <p className="text-sm text-gray-500 max-w-lg mx-auto">
                  BlockMotion AI will render all scenes, mix audio, assemble the final movie, and validate the output.
                  This runs as a background job — you can navigate away and check back later.
                </p>
              </div>

              {loading && (
                <div className="glass-panel p-6 max-w-md mx-auto">
                  <div className="flex items-center gap-3 mb-4">
                    <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                    <span className="text-sm text-white">Rendering movie...</span>
                  </div>
                  <div className="w-full h-2 bg-bg-tertiary rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${renderProgress}%` }} />
                  </div>
                  <div className="text-xs text-gray-500 mt-2 text-right">{Math.round(renderProgress)}%</div>
                </div>
              )}

              {!loading && (
                <div className="text-center">
                  <button onClick={handleRender} className="btn-primary px-8 py-3 text-base">
                    Start Rendering
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 12: Final Movie */}
          {step === 12 && (
            <div className="animate-fade-in">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-600/20 mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Movie Complete</h2>
                <p className="text-sm text-gray-500">Your movie has been rendered and is ready to download.</p>
              </div>

              {finalMovie?.videoUrl && (
                <div className="glass-panel p-4 max-w-3xl mx-auto mb-6">
                  <video
                    src={finalMovie.videoUrl}
                    controls
                    className="w-full rounded-lg"
                  />
                </div>
              )}

              <div className="flex items-center justify-center gap-3">
                {finalMovie?.videoUrl && (
                  <a href={finalMovie.videoUrl} download className="btn-primary flex items-center gap-2">
                    <Download className="w-4 h-4" /> Download Movie
                  </a>
                )}
                <button onClick={() => navigate('completed-movies')} className="btn-secondary">
                  View in Completed Movies
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Buttons */}
      {step < 11 && (
        <div className="flex items-center justify-between p-4 border-t border-border-subtle bg-bg-secondary">
          <button
            onClick={handleBack}
            disabled={step === 0 || loading}
            className="btn-secondary flex items-center gap-2 disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <div className="text-xs text-gray-500">
            Step {step + 1} of {STEPS.length} — {currentStep.label}
          </div>
          {step >= 2 && step <= 10 ? (
            <button
              onClick={handleGenerate}
              disabled={loading || !projectId}
              className="btn-primary flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Generate
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={!canProceed() || loading}
              className="btn-primary flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
              Next
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function StageContainer<T>({
  title,
  icon: Icon,
  description,
  data,
  loading,
  onGenerate,
  generateLabel,
  render,
}: {
  title: string;
  icon: typeof Search;
  description: string;
  data: T | null;
  loading: boolean;
  onGenerate: () => void;
  generateLabel: string;
  render: (data: T) => React.ReactNode;
}) {
  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-bg-elevated flex items-center justify-center">
          <Icon className="w-5 h-5 text-gray-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-16">
          <LoadingSpinner size={32} />
          <p className="text-sm text-gray-500 mt-4">Generating {title.toLowerCase()}...</p>
        </div>
      )}

      {!loading && !data && (
        <div className="py-12 text-center">
          <p className="text-sm text-gray-500 mb-4">No {title.toLowerCase()} generated yet.</p>
          <button onClick={onGenerate} className="btn-primary flex items-center gap-2 mx-auto">
            <Sparkles className="w-4 h-4" /> {generateLabel}
          </button>
        </div>
      )}

      {!loading && data && (
        <div className="mt-6">
          {render(data)}
          <div className="flex items-center gap-3 mt-6 pt-4 border-t border-border-subtle">
            <button onClick={onGenerate} className="btn-secondary flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Regenerate
            </button>
            <span className="text-xs text-gray-500">Click regenerate to create a new version</span>
          </div>
        </div>
      )}
    </div>
  );
}
