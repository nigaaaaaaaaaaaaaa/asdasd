import { useState, useCallback } from 'react';
import {
  Scissors, Copy, Trash2, Undo2, Redo2, ZoomIn, ZoomOut,
  Camera, Users, Film, Globe, MessageSquare, Music, Volume2, Subtitles,
} from 'lucide-react';

const TRACKS = [
  { id: 'camera', label: 'CAMERA', icon: Camera, color: 'bg-amber-500' },
  { id: 'characters', label: 'CHARACTERS', icon: Users, color: 'bg-blue-500' },
  { id: 'animation', label: 'ANIMATION', icon: Film, color: 'bg-purple-500' },
  { id: 'environment', label: 'ENVIRONMENT', icon: Globe, color: 'bg-emerald-500' },
  { id: 'dialogue', label: 'DIALOGUE', icon: MessageSquare, color: 'bg-cyan-500' },
  { id: 'music', label: 'MUSIC', icon: Music, color: 'bg-pink-500' },
  { id: 'sfx', label: 'SFX', icon: Volume2, color: 'bg-orange-500' },
  { id: 'ambience', label: 'AMBIENCE', icon: Volume2, color: 'bg-teal-500' },
  { id: 'subtitles', label: 'SUBTITLES', icon: Subtitles, color: 'bg-gray-500' },
];

const CLIPS: Record<string, Array<{ id: string; start: number; duration: number; label: string }>> = {
  camera: [
    { id: 'c1', start: 0, duration: 30, label: 'Establishing' },
    { id: 'c2', start: 30, duration: 45, label: 'Tracking' },
    { id: 'c3', start: 75, duration: 60, label: 'Close-up' },
  ],
  characters: [
    { id: 'ch1', start: 5, duration: 120, label: 'PLAYER_001' },
    { id: 'ch2', start: 30, duration: 90, label: 'PLAYER_002' },
  ],
  animation: [
    { id: 'a1', start: 0, duration: 135, label: 'Walk → Run → Attack' },
  ],
  environment: [
    { id: 'e1', start: 0, duration: 135, label: 'Village' },
  ],
  dialogue: [
    { id: 'd1', start: 10, duration: 8, label: 'Hero: We must defend...' },
    { id: 'd2', start: 35, duration: 5, label: 'Villain: You cannot win' },
    { id: 'd3', start: 80, duration: 10, label: 'Hero: For the village!' },
  ],
  music: [
    { id: 'm1', start: 0, duration: 135, label: 'Epic Battle Theme' },
  ],
  sfx: [
    { id: 's1', start: 45, duration: 2, label: 'Sword Clash' },
    { id: 's2', start: 85, duration: 3, label: 'Explosion' },
  ],
  ambience: [
    { id: 'am1', start: 0, duration: 135, label: 'Village Ambience' },
  ],
  subtitles: [
    { id: 'st1', start: 10, duration: 8, label: 'We must defend the village' },
    { id: 'st2', start: 35, duration: 5, label: 'You cannot win' },
  ],
};

export function TimelineEditor() {
  const [selectedClip, setSelectedClip] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [playhead, setPlayhead] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const totalDuration = 135;
  const pixelsPerSecond = 3 * zoom;

  const handleSplit = useCallback(() => {
    if (selectedClip) {
      // Split logic would go here
    }
  }, [selectedClip]);

  const handleUndo = () => {
    if (historyIndex > 0) setHistoryIndex(historyIndex - 1);
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) setHistoryIndex(historyIndex + 1);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Timeline Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-border-subtle bg-bg-secondary">
        <button onClick={handleSplit} className="btn-ghost flex items-center gap-1 text-xs" title="Split">
          <Scissors className="w-4 h-4" /> Split
        </button>
        <button className="btn-ghost flex items-center gap-1 text-xs" title="Duplicate">
          <Copy className="w-4 h-4" /> Duplicate
        </button>
        <button className="btn-ghost flex items-center gap-1 text-xs text-red-400" title="Delete">
          <Trash2 className="w-4 h-4" /> Delete
        </button>
        <div className="w-px h-6 bg-border-subtle mx-1" />
        <button onClick={handleUndo} disabled={historyIndex <= 0} className="btn-ghost text-xs disabled:opacity-30" title="Undo">
          <Undo2 className="w-4 h-4" />
        </button>
        <button onClick={handleRedo} disabled={historyIndex >= history.length - 1} className="btn-ghost text-xs disabled:opacity-30" title="Redo">
          <Redo2 className="w-4 h-4" />
        </button>
        <div className="w-px h-6 bg-border-subtle mx-1" />
        <button onClick={() => setZoom(Math.max(0.5, zoom - 0.25))} className="btn-ghost text-xs" title="Zoom out">
          <ZoomOut className="w-4 h-4" />
        </button>
        <button onClick={() => setZoom(Math.min(4, zoom + 0.25))} className="btn-ghost text-xs" title="Zoom in">
          <ZoomIn className="w-4 h-4" />
        </button>
        <div className="flex-1" />
        <div className="text-xs text-gray-500 font-mono">
          {String(Math.floor(playhead / 60)).padStart(2, '0')}:{String(Math.floor(playhead % 60)).padStart(2, '0')}:{String(Math.floor((playhead % 1) * 100)).padStart(2, '0')}
        </div>
      </div>

      {/* Timeline Area */}
      <div className="flex-1 overflow-auto scrollbar-thin bg-bg-primary">
        {/* Time Ruler */}
        <div className="sticky top-0 z-10 bg-bg-secondary border-b border-border-subtle">
          <div className="flex">
            <div className="w-32 shrink-0 border-r border-border-subtle" />
            <div className="relative" style={{ width: totalDuration * pixelsPerSecond }}>
              {Array.from({ length: Math.ceil(totalDuration / 10) + 1 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 flex items-center"
                  style={{ left: i * 10 * pixelsPerSecond }}
                >
                  <div className="w-px h-3 bg-border-default" />
                  <span className="text-[10px] text-gray-600 ml-1 font-mono">{i * 10}s</span>
                </div>
              ))}
              {/* Playhead */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-blue-500 cursor-pointer z-20"
                style={{ left: playhead * pixelsPerSecond }}
                onClick={(e) => {
                  const rect = e.currentTarget.parentElement!.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  setPlayhead(x / pixelsPerSecond);
                }}
              >
                <div className="w-3 h-3 bg-blue-500 rounded-full -translate-x-1/2 -translate-y-1" />
              </div>
            </div>
          </div>
        </div>

        {/* Tracks */}
        {TRACKS.map((track) => {
          const Icon = track.icon;
          const clips = CLIPS[track.id] || [];
          return (
            <div key={track.id} className="flex border-b border-border-subtle hover:bg-bg-secondary/50">
              <div className="w-32 shrink-0 flex items-center gap-2 px-3 py-2 border-r border-border-subtle bg-bg-secondary">
                <Icon className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-[10px] font-medium text-gray-400">{track.label}</span>
              </div>
              <div className="relative" style={{ width: totalDuration * pixelsPerSecond, minHeight: '40px' }}>
                {clips.map((clip) => (
                  <div
                    key={clip.id}
                    onClick={() => setSelectedClip(clip.id)}
                    className={`absolute top-1 bottom-1 rounded-md cursor-pointer transition-all border ${
                      selectedClip === clip.id ? 'border-white/40 ring-1 ring-white/20' : 'border-transparent'
                    } ${track.color}/30 hover:${track.color}/50`}
                    style={{
                      left: clip.start * pixelsPerSecond,
                      width: clip.duration * pixelsPerSecond,
                      background: `linear-gradient(135deg, var(--tw-gradient-from), var(--tw-gradient-to))`,
                    }}
                  >
                    <div className={`px-2 py-1 text-[10px] text-white truncate ${track.color} rounded-t-md`}>
                      {clip.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
