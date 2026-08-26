import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from '@/context/RouteContext';
import {
  Settings, Cpu, Database, HardDrive, Film, Music, Volume2,
  Loader2, CheckCircle2, XCircle, AlertCircle, RefreshCw, Boxes,
  Activity, Terminal, Zap,
} from 'lucide-react';

type DiagStatus = 'connected' | 'not_configured' | 'error' | 'checking';

interface DiagItem {
  name: string;
  status: DiagStatus;
  message?: string;
  icon: typeof Database;
}

export function SettingsPage() {
  const { user, updateProfile } = useAuth();
  const { navigate } = useRouter();
  const [activeTab, setActiveTab] = useState('diagnostics');
  const [diagnostics, setDiagnostics] = useState<DiagItem[]>([]);
  const [checking, setChecking] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);

  const runDiagnostics = async () => {
    setChecking(true);
    const items: DiagItem[] = [
      { name: 'Database', status: 'checking', icon: Database },
      { name: 'Storage', status: 'checking', icon: HardDrive },
      { name: 'Queue', status: 'checking', icon: Activity },
      { name: 'FFmpeg', status: 'checking', icon: Film },
      { name: 'Blender', status: 'checking', icon: Boxes },
      { name: 'LLM', status: 'checking', icon: Cpu },
      { name: 'Voice', status: 'checking', icon: Volume2 },
      { name: 'Music', status: 'checking', icon: Music },
      { name: 'Video Provider', status: 'checking', icon: Film },
      { name: 'Worker', status: 'checking', icon: Terminal },
    ];

    // Check database
    const { error: dbError } = await supabase.from('projects').select('id').limit(1);
    items[0].status = dbError ? 'error' : 'connected';
    items[0].message = dbError?.message;

    // Check storage
    const { error: storageError } = await supabase.storage.from('videos').list('', { limit: 1 });
    items[1].status = storageError ? 'error' : 'connected';
    items[1].message = storageError?.message;

    // Check queue (render_jobs table)
    const { error: queueError } = await supabase.from('render_jobs').select('id').limit(1);
    items[2].status = queueError ? 'error' : 'connected';

    // FFmpeg & Blender - not available in browser environment
    items[3].status = 'not_configured';
    items[3].message = 'FFmpeg is not available in this environment';
    items[4].status = 'not_configured';
    items[4].message = 'Blender worker is not connected';

    // Check LLM provider
    const { data: llmProvider } = await supabase.from('ai_providers').select('*').eq('type', 'llm').eq('is_enabled', true).maybeSingle();
    items[5].status = llmProvider ? 'connected' : 'not_configured';
    items[5].message = llmProvider ? `${llmProvider.provider} / ${llmProvider.model}` : 'LLM provider required for AI screenplay generation';

    // Check voice provider
    const { data: voiceProvider } = await supabase.from('ai_providers').select('*').eq('type', 'voice').eq('is_enabled', true).maybeSingle();
    items[6].status = voiceProvider ? 'connected' : 'not_configured';
    items[6].message = voiceProvider ? `${voiceProvider.provider}` : 'Voice provider required for generated dialogue';

    // Check music provider
    const { data: musicProvider } = await supabase.from('ai_providers').select('*').eq('type', 'music').eq('is_enabled', true).maybeSingle();
    items[7].status = musicProvider ? 'connected' : 'not_configured';

    // Check video provider
    const { data: videoProvider } = await supabase.from('ai_providers').select('*').eq('type', 'video').eq('is_enabled', true).maybeSingle();
    items[8].status = videoProvider ? 'connected' : 'not_configured';

    // Worker
    items[9].status = 'not_configured';
    items[9].message = 'No background worker detected';

    setDiagnostics(items);
    setChecking(false);
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const handlePasswordChange = async () => {
    if (!newPassword || newPassword.length < 6) {
      setPasswordMsg('Password must be at least 6 characters');
      return;
    }
    const { error } = await updateProfile({ password: newPassword });
    setPasswordMsg(error ? error : 'Password updated successfully');
    if (!error) setNewPassword('');
  };

  const tabs = [
    { id: 'diagnostics', label: 'System Diagnostics', icon: Activity },
    { id: 'profile', label: 'Profile', icon: Settings },
    { id: 'providers', label: 'AI Providers', icon: Cpu },
  ];

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white">Settings</h2>
          <p className="text-sm text-gray-500 mt-0.5">System configuration and diagnostics</p>
        </div>

        <div className="flex gap-1 mb-6 p-1 bg-bg-tertiary rounded-lg w-fit">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => tab.id === 'providers' ? navigate('ai-providers') : setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === tab.id ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" /> {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === 'diagnostics' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">System Check</h3>
              <button onClick={runDiagnostics} disabled={checking} className="btn-secondary flex items-center gap-2 text-xs">
                {checking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                Recheck
              </button>
            </div>

            <div className="space-y-2">
              {diagnostics.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.name} className="glass-panel p-3 flex items-center gap-3">
                    <Icon className="w-4 h-4 text-gray-500 shrink-0" />
                    <div className="flex-1">
                      <div className="text-sm text-white">{item.name}</div>
                      {item.message && <div className="text-xs text-gray-500 mt-0.5">{item.message}</div>}
                    </div>
                    <div className="flex items-center gap-2">
                      {item.status === 'checking' && <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />}
                      {item.status === 'connected' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                      {item.status === 'not_configured' && <AlertCircle className="w-4 h-4 text-amber-400" />}
                      {item.status === 'error' && <XCircle className="w-4 h-4 text-red-400" />}
                      <span className={`text-xs ${
                        item.status === 'connected' ? 'text-emerald-400' :
                        item.status === 'not_configured' ? 'text-amber-400' :
                        item.status === 'error' ? 'text-red-400' : 'text-gray-500'
                      }`}>
                        {item.status === 'connected' ? 'CONNECTED' :
                         item.status === 'not_configured' ? 'NOT CONFIGURED' :
                         item.status === 'error' ? 'ERROR' : 'CHECKING'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 glass-panel p-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Health Check Endpoint</h4>
              <p className="text-xs text-gray-400 mb-2">The system health check is available at:</p>
              <code className="text-xs text-blue-400 font-mono bg-bg-tertiary px-2 py-1 rounded">GET /functions/v1/health</code>
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="glass-panel p-6">
            <h3 className="text-sm font-semibold text-white mb-4">Profile Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Email</label>
                <input type="email" value={user?.email ?? ''} disabled className="input-field opacity-60" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">New Password</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input-field" placeholder="••••••••" />
              </div>
              {passwordMsg && (
                <div className={`text-xs ${passwordMsg.includes('success') ? 'text-emerald-400' : 'text-red-400'}`}>
                  {passwordMsg}
                </div>
              )}
              <button onClick={handlePasswordChange} className="btn-primary">Update Password</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
