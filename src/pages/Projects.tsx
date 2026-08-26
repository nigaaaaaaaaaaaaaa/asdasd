import { useState } from 'react';
import { useProjects } from '@/hooks/useData';
import { useRouter } from '@/context/RouteContext';
import { supabase } from '@/lib/supabase';
import { Modal, StatusBadge, EmptyState, ConfirmDialog } from '@/components/ui';
import type { ProjectType } from '@/types/database';
import {
  Plus, Video, Clapperboard, Film, FolderOpen, Trash2, Loader2,
  Search, Calendar,
} from 'lucide-react';

export function Projects() {
  const { projects, loading, refetch } = useProjects();
  const { navigate } = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.description ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('projects').delete().eq('id', deleteId);
    setDeleteId(null);
    refetch();
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">Projects</h2>
            <p className="text-sm text-gray-500 mt-0.5">Manage your BlockMotion productions</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Project
          </button>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="input-field pl-10 max-w-md"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-gray-600 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title={search ? 'No matching projects' : 'No projects yet'}
            description={search ? 'Try a different search term.' : 'Create your first project to get started.'}
            action={
              !search && (
                <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Create Project
                </button>
              )
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((project) => (
              <div
                key={project.id}
                className="glass-panel p-4 hover:border-blue-500/30 transition-all duration-200 group cursor-pointer"
                onClick={() => navigate('projects', { id: project.id })}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl bg-bg-elevated flex items-center justify-center">
                    {project.type === 'VIDEO_TO_3D' ? (
                      <Video className="w-6 h-6 text-emerald-400" />
                    ) : project.type === 'TEXT_TO_MOVIE' ? (
                      <Clapperboard className="w-6 h-6 text-amber-400" />
                    ) : (
                      <Film className="w-6 h-6 text-blue-400" />
                    )}
                  </div>
                  <StatusBadge status={project.status} />
                </div>
                <h3 className="text-base font-semibold text-white mb-1 truncate">{project.name}</h3>
                <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                  {project.description || 'No description'}
                </p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(project.created_at).toLocaleDateString()}
                  </span>
                  <span>{project.duration_minutes}min · {project.resolution}</span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleteId(project.id); }}
                  className="absolute top-3 right-3 p-1.5 rounded-md text-gray-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                  style={{ position: 'relative', float: 'right', marginTop: '-32px' }}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreate && <CreateProjectModal onClose={() => setShowCreate(false)} onCreated={() => { refetch(); setShowCreate(false); }} />}
      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Project"
        message="This will permanently delete the project and all associated data. This cannot be undone."
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}

function CreateProjectModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { navigate } = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ProjectType>('TEXT_TO_MOVIE');
  const [duration, setDuration] = useState(15);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from('projects')
      .insert({
        name,
        description,
        type,
        duration_minutes: duration,
        status: 'draft',
      })
      .select()
      .single();

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      await supabase.from('project_settings').insert({
        project_id: data.id,
      });
      onCreated();
      navigate('projects', { id: data.id });
    }
  };

  const typeOptions = [
    { value: 'TEXT_TO_MOVIE' as ProjectType, label: 'Text to Movie', icon: Clapperboard, desc: 'Generate a full movie from a text prompt' },
    { value: 'VIDEO_TO_3D' as ProjectType, label: 'Video to 3D', icon: Video, desc: 'Recreate Minecraft gameplay as 3D animation' },
    { value: 'HYBRID' as ProjectType, label: 'Hybrid', icon: Film, desc: 'Combine video analysis and text generation' },
  ];

  const durations = [15, 20, 30, 45, 60, 90, 120];

  return (
    <Modal open={true} onClose={onClose} title="Create New Project" maxWidth="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Project Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="input-field"
            placeholder="My Minecraft Movie"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Description (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input-field min-h-[80px] resize-y"
            placeholder="A brief description of your project..."
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-2">Project Type</label>
          <div className="grid grid-cols-1 gap-2">
            {typeOptions.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setType(opt.value)}
                  className={`flex items-start gap-3 p-3 rounded-md border text-left transition-all ${
                    type === opt.value
                      ? 'border-blue-500 bg-blue-600/10'
                      : 'border-border-default hover:border-border-subtle'
                  }`}
                >
                  <Icon className={`w-5 h-5 mt-0.5 ${type === opt.value ? 'text-blue-400' : 'text-gray-500'}`} />
                  <div>
                    <div className={`text-sm font-medium ${type === opt.value ? 'text-white' : 'text-gray-300'}`}>{opt.label}</div>
                    <div className="text-xs text-gray-500">{opt.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-2">Duration (minutes)</label>
          <div className="flex flex-wrap gap-2">
            {durations.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDuration(d)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  duration === d ? 'bg-blue-600 text-white' : 'bg-bg-tertiary text-gray-400 hover:text-white'
                }`}
              >
                {d}min
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Create Project
          </button>
        </div>
      </form>
    </Modal>
  );
}
