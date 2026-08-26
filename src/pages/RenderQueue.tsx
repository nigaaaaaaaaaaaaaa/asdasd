import { useState } from 'react';
import { useRenderJobs } from '@/hooks/useData';
import { supabase } from '@/lib/supabase';
import { StatusBadge, EmptyState, ConfirmDialog } from '@/components/ui';
import type { RenderJob } from '@/types/database';
import {
  ListChecks, Loader2, RotateCcw, X, Clock, AlertCircle,
  Film, Video, Layers,
} from 'lucide-react';

export function RenderQueue() {
  const { jobs, loading, refetch } = useRenderJobs();
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [retryId, setRetryId] = useState<string | null>(null);

  const handleRetry = async (job: RenderJob) => {
    await supabase.from('render_jobs').update({
      status: 'queued',
      progress: 0,
      error: null,
      retry_count: job.retry_count + 1,
      started_at: null,
      completed_at: null,
    }).eq('id', job.id);
    refetch();
  };

  const handleCancel = async () => {
    if (!cancelId) return;
    await supabase.from('render_jobs').update({
      status: 'cancelled',
    }).eq('id', cancelId);
    setCancelId(null);
    refetch();
  };

  const activeJobs = jobs.filter((j) => !['complete', 'failed', 'cancelled'].includes(j.status));
  const completedJobs = jobs.filter((j) => j.status === 'complete');
  const failedJobs = jobs.filter((j) => j.status === 'failed');
  const queuedJobs = jobs.filter((j) => j.status === 'queued');

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="p-6 max-w-5xl mx-auto">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white">Render Queue</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {queuedJobs.length} queued · {activeJobs.length} active · {completedJobs.length} completed · {failedJobs.length} failed
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-gray-600 animate-spin" />
          </div>
        ) : jobs.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title="No render jobs"
            description="Render jobs are created when you start rendering a movie or processing a video to 3D."
          />
        ) : (
          <div className="space-y-6">
            {/* Active Jobs */}
            {activeJobs.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Active</h3>
                <div className="space-y-2">
                  {activeJobs.map((job) => (
                    <JobCard key={job.id} job={job} onCancel={() => setCancelId(job.id)} />
                  ))}
                </div>
              </div>
            )}

            {/* Queued Jobs */}
            {queuedJobs.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Queued</h3>
                <div className="space-y-2">
                  {queuedJobs.map((job) => (
                    <JobCard key={job.id} job={job} onCancel={() => setCancelId(job.id)} />
                  ))}
                </div>
              </div>
            )}

            {/* Failed Jobs */}
            {failedJobs.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Failed</h3>
                <div className="space-y-2">
                  {failedJobs.map((job) => (
                    <JobCard key={job.id} job={job} onRetry={() => handleRetry(job)} />
                  ))}
                </div>
              </div>
            )}

            {/* Completed Jobs */}
            {completedJobs.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Completed</h3>
                <div className="space-y-2">
                  {completedJobs.map((job) => (
                    <JobCard key={job.id} job={job} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!cancelId}
        onClose={() => setCancelId(null)}
        onConfirm={handleCancel}
        title="Cancel Render Job"
        message="Are you sure you want to cancel this render job? Progress will be lost."
        confirmLabel="Cancel Job"
        danger
      />
    </div>
  );
}

function JobCard({ job, onRetry, onCancel }: { job: RenderJob; onRetry?: () => void; onCancel?: () => void }) {
  const isActive = !['complete', 'failed', 'cancelled'].includes(job.status);
  const icon = job.job_type === 'full_movie' ? Film : job.job_type === 'assembly' ? Layers : Video;

  return (
    <div className="glass-panel p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-bg-elevated flex items-center justify-center shrink-0">
          {isActive && job.status !== 'queued' ? (
            <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
          ) : job.status === 'failed' ? (
            <AlertCircle className="w-5 h-5 text-red-400" />
          ) : job.status === 'complete' ? (
            <Film className="w-5 h-5 text-emerald-400" />
          ) : (
            (() => { const Icon = icon; return <Icon className="w-5 h-5 text-gray-400" /> })()
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-white capitalize">{job.job_type.replace(/_/g, ' ')}</span>
            <StatusBadge status={job.status} />
          </div>
          {job.current_operation && (
            <div className="text-xs text-gray-500 mb-2">{job.current_operation}</div>
          )}
          {job.error && (
            <div className="text-xs text-red-400 mb-2 p-2 rounded-md bg-red-500/10">{job.error}</div>
          )}
          {isActive && (
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${job.progress}%` }} />
              </div>
              <span className="text-xs text-gray-500 tabular-nums">{Math.round(job.progress)}%</span>
            </div>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
            {job.started_at && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Started {new Date(job.started_at).toLocaleTimeString()}</span>}
            {job.completed_at && <span>Completed {new Date(job.completed_at).toLocaleTimeString()}</span>}
            {job.retry_count > 0 && <span>Retries: {job.retry_count}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {job.status === 'failed' && onRetry && (
            <button onClick={onRetry} className="btn-ghost flex items-center gap-1 text-xs" title="Retry">
              <RotateCcw className="w-3.5 h-3.5" /> Retry
            </button>
          )}
          {isActive && onCancel && (
            <button onClick={onCancel} className="btn-ghost text-red-400" title="Cancel">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
