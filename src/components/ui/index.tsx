import { type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export function LoadingSpinner({ size = 24, className = '' }: { size?: number; className?: string }) {
  return <Loader2 className={`animate-spin text-blue-500 ${className}`} style={{ width: size, height: size }} />;
}

export function FullPageLoader({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <LoadingSpinner size={40} />
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: typeof Loader2;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-bg-tertiary flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-gray-600" />
      </div>
      <h3 className="text-base font-semibold text-white mb-1">{title}</h3>
      {description && <p className="text-sm text-gray-500 max-w-sm mb-4">{description}</p>}
      {action}
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  secondaryAction,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  secondaryAction?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-14 h-14 rounded-xl bg-red-500/10 flex items-center justify-center mb-4">
        <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-white mb-1">{title}</h3>
      {message && <p className="text-sm text-gray-400 max-w-md mb-4">{message}</p>}
      <div className="flex items-center gap-3">
        {onRetry && (
          <button onClick={onRetry} className="btn-primary">Retry</button>
        )}
        {secondaryAction}
      </div>
    </div>
  );
}

export function ProgressBar({ value, className = '' }: { value: number; className?: string }) {
  return (
    <div className={`w-full bg-bg-tertiary rounded-full overflow-hidden ${className}`}>
      <div
        className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-300"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const statusMap: Record<string, { label: string; className: string }> = {
    queued: { label: 'Queued', className: 'badge-neutral' },
    pending: { label: 'Pending', className: 'badge-neutral' },
    draft: { label: 'Draft', className: 'badge-neutral' },
    processing: { label: 'Processing', className: 'badge-info' },
    analyzing: { label: 'Analyzing', className: 'badge-info' },
    building_scene: { label: 'Building Scene', className: 'badge-info' },
    animating: { label: 'Animating', className: 'badge-info' },
    rendering: { label: 'Rendering', className: 'badge-info' },
    encoding: { label: 'Encoding', className: 'badge-info' },
    uploading: { label: 'Uploading', className: 'badge-info' },
    planning: { label: 'Planning', className: 'badge-info' },
    generating: { label: 'Generating', className: 'badge-info' },
    assembling: { label: 'Assembling', className: 'badge-warning' },
    complete: { label: 'Complete', className: 'badge-success' },
    completed: { label: 'Completed', className: 'badge-success' },
    approved: { label: 'Approved', className: 'badge-success' },
    active: { label: 'Active', className: 'badge-success' },
    failed: { label: 'Failed', className: 'badge-error' },
    cancelled: { label: 'Cancelled', className: 'badge-neutral' },
    rejected: { label: 'Rejected', className: 'badge-error' },
    error: { label: 'Error', className: 'badge-error' },
    not_configured: { label: 'Not Configured', className: 'badge-neutral' },
    inactive: { label: 'Inactive', className: 'badge-neutral' },
    editing: { label: 'Editing', className: 'badge-warning' },
    valid: { label: 'Valid', className: 'badge-success' },
    invalid: { label: 'Invalid', className: 'badge-error' },
    mixed: { label: 'Mixed', className: 'badge-warning' },
  };

  const config = statusMap[status] ?? { label: status, className: 'badge-neutral' };

  return <span className={`badge ${config.className}`}>{config.label}</span>;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = 'max-w-lg',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${maxWidth} glass-panel-elevated animate-slide-up`}>
        <div className="flex items-center justify-between p-4 border-b border-border-subtle">
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 max-h-[70vh] overflow-y-auto scrollbar-thin">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  danger = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth="max-w-md">
      <p className="text-sm text-gray-400 mb-6">{message}</p>
      <div className="flex justify-end gap-3">
        <button onClick={onClose} className="btn-secondary">Cancel</button>
        <button
          onClick={() => { onConfirm(); onClose(); }}
          className={danger ? 'btn-primary !bg-red-600 hover:!bg-red-700' : 'btn-primary'}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
