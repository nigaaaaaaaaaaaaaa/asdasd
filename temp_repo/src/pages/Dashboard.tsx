import { useProjects, useRenderJobs, useAIJobs, useMovieExports } from '@/hooks/useData';
import { useRouter } from '@/context/RouteContext';
import { supabase } from '@/lib/supabase';
import { StatusBadge } from '@/components/ui';
import {
  Plus, Video, Clapperboard, FolderOpen, ListChecks, Trophy,
  Clock, AlertCircle, ChevronRight, Loader2, Film,
} from 'lucide-react';

export function Dashboard() {
  const { projects, loading: loadingProjects } = useProjects();
  const { jobs: renderJobs } = useRenderJobs();
  const { jobs: aiJobs } = useAIJobs();
  const { exports: movies } = useMovieExports();
  const { navigate } = useRouter();

  const activeJobs = [...renderJobs, ...aiJobs].filter((j) =>
    ['queued', 'processing', 'analyzing', 'building_scene', 'animating', 'rendering', 'encoding', 'uploading'].includes(j.status)
  );
  const completedMovies = movies.filter((m) => m.validation_status === 'valid');
  const recentProjects = projects.slice(0, 4);

  const stats = [
    { label: 'Total Projects', value: projects.length, icon: FolderOpen, color: 'text-blue-400' },
    { label: 'Active Jobs', value: activeJobs.length, icon: Loader2, color: 'text-amber-400' },
    { label: 'Completed Movies', value: completedMovies.length, icon: Trophy, color: 'text-emerald-400' },
    { label: 'Render Queue', value: renderJobs.filter((j) => j.status === 'queued').length, icon: ListChecks, color: 'text-gray-400' },
  ];

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="glass-panel p-4">
                <div className="flex items-center justify-between mb-2">
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
              </div>
            );
          })}
        </div>

        {/* Quick Create Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <CreateCard
            icon={Plus}
            title="Create Project"
            description="Start a new production from scratch"
            onClick={() => navigate('projects')}
            gradient="from-blue-600/20 to-blue-800/5"
          />
          <CreateCard
            icon={Video}
            title="Video to 3D"
            description="Upload Minecraft gameplay and recreate it as 3D animation"
            onClick={() => navigate('video-to-3d')}
            gradient="from-emerald-600/20 to-emerald-800/5"
          />
          <CreateCard
            icon={Clapperboard}
            title="Create Movie"
            description="Generate a full Minecraft movie from a text prompt"
            onClick={() => navigate('movie-generator')}
            gradient="from-amber-600/20 to-amber-800/5"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Projects */}
          <div className="glass-panel">
            <div className="flex items-center justify-between p-4 border-b border-border-subtle">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-gray-500" />
                Recent Projects
              </h2>
              <button onClick={() => navigate('projects')} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                View all <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="p-2">
              {loadingProjects ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 text-gray-600 animate-spin" />
                </div>
              ) : recentProjects.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-500">
                  No projects yet. Create one to get started.
                </div>
              ) : (
                recentProjects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => navigate('projects', { id: project.id })}
                    className="w-full flex items-center gap-3 p-3 rounded-md hover:bg-bg-tertiary transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-lg bg-bg-elevated flex items-center justify-center shrink-0">
                      {project.type === 'VIDEO_TO_3D' ? (
                        <Video className="w-5 h-5 text-emerald-400" />
                      ) : project.type === 'TEXT_TO_MOVIE' ? (
                        <Clapperboard className="w-5 h-5 text-amber-400" />
                      ) : (
                        <Film className="w-5 h-5 text-blue-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">{project.name}</div>
                      <div className="text-xs text-gray-500">
                        {project.type.replace('_', ' ')} · {project.duration_minutes}min
                      </div>
                    </div>
                    <StatusBadge status={project.status} />
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Active Jobs */}
          <div className="glass-panel">
            <div className="flex items-center justify-between p-4 border-b border-border-subtle">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                Active Jobs
              </h2>
              <button onClick={() => navigate('render-queue')} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                View queue <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="p-2">
              {activeJobs.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-500">
                  No active jobs. All clear.
                </div>
              ) : (
                activeJobs.slice(0, 6).map((job) => (
                  <div key={job.id} className="p-3 rounded-md hover:bg-bg-tertiary transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-white capitalize">
                        {job.job_type.replace(/_/g, ' ')}
                      </span>
                      <StatusBadge status={job.status} />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all"
                          style={{ width: `${job.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 tabular-nums">{Math.round(job.progress)}%</span>
                    </div>
                    {job.current_operation && (
                      <div className="text-xs text-gray-500 mt-1 truncate">{job.current_operation}</div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Completed Movies */}
        {completedMovies.length > 0 && (
          <div className="glass-panel mt-6">
            <div className="flex items-center justify-between p-4 border-b border-border-subtle">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Trophy className="w-4 h-4 text-emerald-400" />
                Completed Movies
              </h2>
              <button onClick={() => navigate('completed-movies')} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                View all <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              {completedMovies.slice(0, 4).map((movie) => (
                <button
                  key={movie.id}
                  onClick={() => navigate('completed-movies', { id: movie.id })}
                  className="group text-left"
                >
                  <div className="aspect-video rounded-lg bg-bg-elevated border border-border-subtle overflow-hidden mb-2 group-hover:border-blue-500/30 transition-colors">
                    {movie.thumbnail_url ? (
                      <img src={movie.thumbnail_url} alt={movie.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Film className="w-8 h-8 text-gray-700" />
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-white truncate">{movie.title}</div>
                  <div className="text-xs text-gray-500">
                    {movie.duration_seconds ? `${Math.round(movie.duration_seconds / 60)}min` : '—'}
                    {movie.resolution ? ` · ${movie.resolution}` : ''}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CreateCard({
  icon: Icon,
  title,
  description,
  onClick,
  gradient,
}: {
  icon: typeof Plus;
  title: string;
  description: string;
  onClick: () => void;
  gradient: string;
}) {
  return (
    <button
      onClick={onClick}
      className="glass-panel p-5 text-left hover:border-blue-500/30 transition-all duration-200 group"
    >
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-3 group-hover:scale-105 transition-transform`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <h3 className="text-base font-semibold text-white mb-1">{title}</h3>
      <p className="text-sm text-gray-500">{description}</p>
    </button>
  );
}
