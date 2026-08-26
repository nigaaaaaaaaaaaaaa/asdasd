import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from '@/context/RouteContext';
import { EmptyState, StatusBadge } from '@/components/ui';
import type { MovieExport } from '@/types/database';
import {
  Trophy, Film, Download, Play, ChevronRight, Loader2,
  Volume2, FileText, Package, Search, Calendar, Monitor,
} from 'lucide-react';

export function CompletedMovies() {
  const { params, navigate } = useRouter();
  const [movies, setMovies] = useState<MovieExport[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<MovieExport | null>(null);

  const fetchMovies = async () => {
    const { data } = await supabase.from('movie_exports').select('*').order('created_at', { ascending: false });
    setMovies((data ?? []) as MovieExport[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchMovies();
  }, []);

  useEffect(() => {
    if (params.id) {
      const movie = movies.find((m) => m.id === params.id);
      if (movie) setSelected(movie);
    }
  }, [params.id, movies]);

  const filtered = movies.filter((m) =>
    m.title.toLowerCase().includes(search.toLowerCase())
  );

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '—';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`;
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '—';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  if (selected) {
    const canDownload = selected.validation_status === 'valid' && selected.video_url;
    return (
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="p-6 max-w-4xl mx-auto">
          <button onClick={() => { setSelected(null); navigate('completed-movies'); }} className="btn-ghost mb-4 flex items-center gap-1">
            <ChevronRight className="w-4 h-4 rotate-180" /> Back to movies
          </button>

          <div className="glass-panel p-6 mb-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-600/20 to-emerald-800/5 flex items-center justify-center shrink-0">
                <Film className="w-8 h-8 text-emerald-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-white">{selected.title}</h2>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(selected.created_at).toLocaleDateString()}</span>
                  <StatusBadge status={selected.validation_status} />
                  <StatusBadge status={selected.audio_status} />
                </div>
              </div>
            </div>

            {/* Video Player */}
            <div className="aspect-video rounded-lg bg-bg-tertiary border border-border-subtle overflow-hidden mb-4">
              {selected.video_url ? (
                <video src={selected.video_url} controls className="w-full h-full" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Play className="w-12 h-12 text-gray-700" />
                </div>
              )}
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <Stat label="Duration" value={formatDuration(selected.duration_seconds)} />
              <Stat label="Resolution" value={selected.resolution ?? '—'} />
              <Stat label="FPS" value={selected.fps ? `${selected.fps} fps` : '—'} />
              <Stat label="File Size" value={formatSize(selected.file_size)} />
              <Stat label="Codec" value={selected.codec ?? '—'} />
              <Stat label="Audio" value={selected.audio_status === 'completed' ? 'Mixed' : selected.audio_status} />
              <Stat label="Scenes" value={selected.scene_count?.toString() ?? '—'} />
              <Stat label="Validation" value={selected.validation_status} />
            </div>

            {/* Download Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              {canDownload ? (
                <>
                  <a href={selected.video_url ?? undefined} download className="btn-primary flex items-center gap-2">
                    <Download className="w-4 h-4" /> Download Movie
                  </a>
                  {selected.audio_url && (
                    <a href={selected.audio_url} download className="btn-secondary flex items-center gap-2">
                      <Volume2 className="w-4 h-4" /> Download Audio
                    </a>
                  )}
                  {selected.subtitles_srt && (
                    <a
                      href={`data:text/plain;charset=utf-8,${encodeURIComponent(selected.subtitles_srt)}`}
                      download={`${selected.title}.srt`}
                      className="btn-secondary flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4" /> Download Subtitles
                    </a>
                  )}
                </>
              ) : (
                <div className="p-3 rounded-md bg-amber-500/10 border border-amber-500/20 text-sm text-amber-400 flex items-center gap-2">
                  <Monitor className="w-4 h-4" />
                  Download will be available once validation passes and the final MP4 is ready.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="p-6 max-w-6xl mx-auto">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white">Completed Movies</h2>
          <p className="text-sm text-gray-500 mt-0.5">Your finished movies, ready to watch and download</p>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search movies..."
            className="input-field pl-10 max-w-md"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-gray-600 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Trophy}
            title="No completed movies yet"
            description="Movies will appear here after rendering and validation are complete."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((movie) => (
              <button
                key={movie.id}
                onClick={() => setSelected(movie)}
                className="glass-panel overflow-hidden text-left hover:border-emerald-500/30 transition-all group"
              >
                <div className="aspect-video bg-bg-elevated flex items-center justify-center relative">
                  {movie.thumbnail_url ? (
                    <img src={movie.thumbnail_url} alt={movie.title} className="w-full h-full object-cover" />
                  ) : (
                    <Film className="w-10 h-10 text-gray-700" />
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play className="w-10 h-10 text-white" />
                  </div>
                  {movie.validation_status !== 'valid' && (
                    <div className="absolute top-2 right-2">
                      <StatusBadge status={movie.validation_status} />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <div className="text-sm font-semibold text-white truncate">{movie.title}</div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                    <span>{formatDuration(movie.duration_seconds)}</span>
                    {movie.resolution && <span>· {movie.resolution}</span>}
                    {movie.file_size && <span>· {formatSize(movie.file_size)}</span>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-md bg-bg-tertiary">
      <div className="text-xs text-gray-600">{label}</div>
      <div className="text-sm text-white font-medium mt-0.5 capitalize">{value}</div>
    </div>
  );
}
