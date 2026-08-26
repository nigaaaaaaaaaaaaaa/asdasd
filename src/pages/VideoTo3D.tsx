import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from '@/context/RouteContext';
import { StatusBadge, EmptyState, ErrorState } from '@/components/ui';
import type { Video, CameraMode } from '@/types/database';
import {
  Video as VideoIcon, Upload, Pause, Play, X, RotateCcw, FileVideo,
  Loader2, AlertCircle, CheckCircle2, Film, Camera, Sparkles,
} from 'lucide-react';

const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024; // 5GB
const ACCEPTED_TYPES = ['.mp4', '.mov', '.mkv', '.webm', '.avi'];
const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB chunks

export function VideoTo3D() {
  const { user } = useAuth();
  const { navigate } = useRouter();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadProgress, setUploadProgress] = useState<{
    filename: string;
    fileSize: number;
    uploadedBytes: number;
    speed: number;
    paused: boolean;
    error: string | null;
  } | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [cameraMode, setCameraMode] = useState<CameraMode>('cinematic');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadCancelledRef = useRef(false);
  const uploadPausedRef = useRef(false);

  const fetchVideos = useCallback(async () => {
    const { data } = await supabase
      .from('videos')
      .select('*')
      .order('created_at', { ascending: false });
    setVideos((data ?? []) as Video[]);
    setLoading(false);
  }, []);

  useState(() => {
    fetchVideos();
  });

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const formatSpeed = (bytesPerSec: number) => {
    if (bytesPerSec < 1024) return `${bytesPerSec.toFixed(0)} B/s`;
    if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
    return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
  };

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) return `File exceeds 5GB limit (${formatBytes(file.size)})`;
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ACCEPTED_TYPES.includes(ext)) return `Unsupported format. Use: ${ACCEPTED_TYPES.join(', ')}`;
    return null;
  };

  const handleFileSelect = async (file: File) => {
    const error = validateFile(file);
    if (error) {
      setUploadProgress({ filename: file.name, fileSize: file.size, uploadedBytes: 0, speed: 0, paused: false, error });
      return;
    }

    // Ensure we have a project
    let projectId = selectedProject;
    if (!projectId) {
      const { data: project } = await supabase
        .from('projects')
        .insert({
          name: file.name.replace(/\.[^/.]+$/, ''),
          type: 'VIDEO_TO_3D',
          status: 'planning',
        })
        .select()
        .single();
      if (project) {
        projectId = project.id;
        setSelectedProject(project.id);
        await supabase.from('project_settings').insert({ project_id: project.id });
      }
    }

    if (!projectId || !user) return;

    const storagePath = `${user.id}/${Date.now()}-${file.name}`;

    // Create video record
    const { data: videoRecord } = await supabase.from('videos').insert({
      project_id: projectId,
      filename: file.name,
      original_filename: file.name,
      file_size: file.size,
      mime_type: file.type,
      storage_path: storagePath,
      upload_status: 'uploading',
    }).select().single();

    if (!videoRecord) return;

    uploadCancelledRef.current = false;
    uploadPausedRef.current = false;
    setUploadProgress({ filename: file.name, fileSize: file.size, uploadedBytes: 0, speed: 0, paused: false, error: null });

    // Resumable chunked upload
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    let uploadedBytes = 0;
    const startTime = Date.now();

    for (let i = 0; i < totalChunks; i++) {
      if (uploadCancelledRef.current) break;
      while (uploadPausedRef.current) {
        await new Promise((r) => setTimeout(r, 200));
        if (uploadCancelledRef.current) break;
      }

      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);

      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(`${storagePath}.part${i}`, chunk, { upsert: true });

      if (uploadError) {
        setUploadProgress((prev) => prev ? { ...prev, error: uploadError.message } : null);
        await supabase.from('videos').update({ upload_status: 'failed' }).eq('id', videoRecord.id);
        return;
      }

      uploadedBytes = end;
      const elapsed = (Date.now() - startTime) / 1000;
      const speed = uploadedBytes / elapsed;
      setUploadProgress({
        filename: file.name,
        fileSize: file.size,
        uploadedBytes,
        speed,
        paused: false,
        error: null,
      });

      await supabase.from('videos').update({
        upload_progress: (uploadedBytes / file.size) * 100,
        uploaded_bytes: uploadedBytes,
        upload_speed: speed,
      }).eq('id', videoRecord.id);
    }

    if (uploadCancelledRef.current) {
      await supabase.from('videos').update({ upload_status: 'cancelled' }).eq('id', videoRecord.id);
      setUploadProgress(null);
      return;
    }

    // Mark as complete
    await supabase.from('videos').update({
      upload_status: 'completed',
      upload_progress: 100,
    }).eq('id', videoRecord.id);

    setUploadProgress(null);
    fetchVideos();
  };

  const handlePause = () => {
    uploadPausedRef.current = !uploadPausedRef.current;
    setUploadProgress((prev) => prev ? { ...prev, paused: uploadPausedRef.current } : null);
  };

  const handleCancel = () => {
    uploadCancelledRef.current = true;
    uploadPausedRef.current = false;
  };

  const startAnalysis = async (videoId: string) => {
    await supabase.from('videos').update({ analysis_status: 'analyzing' }).eq('id', videoId);

    const { data: aiJob } = await supabase.from('ai_jobs').insert({
      project_id: selectedProject,
      job_type: 'video_analysis',
      status: 'processing',
      input_data: { videoId },
    }).select().single();

    // Call edge function for analysis
    try {
      const apiUrl = `/supabase-proxy/functions/v1/video-analyze`;
      await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer dummy-anon-key-single-user-proxy`,
        },
        body: JSON.stringify({ jobId: aiJob.id, videoId }),
      });
    } catch {
      // Analysis runs async
    }

    fetchVideos();
  };

  const progress = uploadProgress;
  const percent = progress ? (progress.uploadedBytes / progress.fileSize) * 100 : 0;
  const remaining = progress ? progress.fileSize - progress.uploadedBytes : 0;
  const eta = progress && progress.speed > 0 ? remaining / progress.speed : 0;

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="p-6 max-w-5xl mx-auto">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white">Video to 3D Animation</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Upload Minecraft gameplay and recreate it as cinematic 3D animation
          </p>
        </div>

        {/* Camera Mode Selection */}
        <div className="glass-panel p-4 mb-6">
          <label className="block text-xs font-medium text-gray-400 mb-2">Camera Mode</label>
          <div className="grid grid-cols-3 gap-2">
            {([
              { value: 'original', label: 'Original Camera', desc: 'Match source', icon: Camera },
              { value: 'cinematic', label: 'Cinematic Camera', desc: 'Improved composition', icon: Film },
              { value: 'ai_director', label: 'AI Director', desc: 'Cinematic interpretation', icon: Sparkles },
            ] as const).map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.value}
                  onClick={() => setCameraMode(opt.value)}
                  className={`p-3 rounded-md border text-left transition-all ${
                    cameraMode === opt.value ? 'border-blue-500 bg-blue-600/10' : 'border-border-default hover:border-border-subtle'
                  }`}
                >
                  <Icon className={`w-4 h-4 mb-1.5 ${cameraMode === opt.value ? 'text-blue-400' : 'text-gray-500'}`} />
                  <div className={`text-xs font-medium ${cameraMode === opt.value ? 'text-white' : 'text-gray-400'}`}>{opt.label}</div>
                  <div className="text-[10px] text-gray-500">{opt.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Upload Zone */}
        {!progress && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files[0];
              if (file) handleFileSelect(file);
            }}
            className={`glass-panel border-2 border-dashed p-12 text-center transition-all ${
              dragOver ? 'border-blue-500 bg-blue-600/5' : 'border-border-default'
            }`}
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-bg-elevated mb-4">
              <Upload className="w-8 h-8 text-gray-500" />
            </div>
            <h3 className="text-base font-semibold text-white mb-1">Drop your video here</h3>
            <p className="text-sm text-gray-500 mb-4">
              MP4, MOV, MKV, WebM, AVI · Up to 5 GB
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn-primary inline-flex items-center gap-2"
            >
              <FileVideo className="w-4 h-4" /> Select Video
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*,.mp4,.mov,.mkv,.webm,.avi"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
            />
          </div>
        )}

        {/* Upload Progress */}
        {progress && (
          <div className="glass-panel p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <FileVideo className="w-5 h-5 text-blue-400" />
                <div>
                  <div className="text-sm font-medium text-white">{progress.filename}</div>
                  <div className="text-xs text-gray-500">{formatBytes(progress.fileSize)}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!progress.error && (
                  <button onClick={handlePause} className="btn-ghost">
                    {progress.paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                  </button>
                )}
                <button onClick={handleCancel} className="btn-ghost text-red-400 hover:text-red-300">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {progress.error ? (
              <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-sm text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> {progress.error}
              </div>
            ) : (
              <>
                <div className="w-full h-2 bg-bg-tertiary rounded-full overflow-hidden mb-3">
                  <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${percent}%` }} />
                </div>
                <div className="grid grid-cols-4 gap-4 text-xs">
                  <div>
                    <div className="text-gray-600">Progress</div>
                    <div className="text-white font-medium">{percent.toFixed(1)}%</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Speed</div>
                    <div className="text-white font-medium">{formatSpeed(progress.speed)}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Remaining</div>
                    <div className="text-white font-medium">{formatBytes(remaining)}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Est. Time</div>
                    <div className="text-white font-medium">{eta > 60 ? `${Math.ceil(eta / 60)}m` : `${Math.ceil(eta)}s`}</div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Uploaded Videos */}
        <div className="mt-8">
          <h3 className="text-sm font-semibold text-white mb-3">Uploaded Videos</h3>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-gray-600 animate-spin" />
            </div>
          ) : videos.length === 0 ? (
            <EmptyState icon={VideoIcon} title="No videos uploaded yet" description="Upload a Minecraft gameplay video to get started." />
          ) : (
            <div className="space-y-2">
              {videos.map((video) => (
                <div key={video.id} className="glass-panel p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <FileVideo className="w-5 h-5 text-gray-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">{video.original_filename}</div>
                      <div className="text-xs text-gray-500">{formatBytes(video.file_size)}</div>
                    </div>
                    <StatusBadge status={video.upload_status} />
                  </div>

                  {video.upload_status === 'completed' && (
                    <div className="flex items-center justify-between pt-3 border-t border-border-subtle">
                      <div className="flex items-center gap-2">
                        {video.analysis_status === 'completed' ? (
                          <span className="text-xs text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Analysis complete
                          </span>
                        ) : video.analysis_status === 'analyzing' ? (
                          <span className="text-xs text-blue-400 flex items-center gap-1">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Analyzing...
                          </span>
                        ) : (
                          <span className="text-xs text-gray-500">Not analyzed yet</span>
                        )}
                      </div>
                      {video.analysis_status === 'pending' && (
                        <button onClick={() => startAnalysis(video.id)} className="btn-secondary text-xs py-1.5">
                          Start Analysis
                        </button>
                      )}
                      {video.analysis_status === 'completed' && (
                        <button
                          onClick={async () => {
                            if (!user) return;
                            await supabase.from('render_jobs').insert({
                              project_id: video.project_id,
                              job_type: 'video_to_3d',
                              status: 'queued',
                              settings: { video_id: video.id, camera_mode: cameraMode },
                            });
                            navigate('render-queue', { projectId: video.project_id });
                          }}
                          className="btn-primary text-xs py-1.5"
                        >
                          Process to 3D
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
