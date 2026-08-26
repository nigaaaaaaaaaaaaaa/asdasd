import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from '@/context/RouteContext';
import { StatusBadge, Modal, EmptyState } from '@/components/ui';
import type { AIProvider, ProviderType } from '@/types/database';
import {
  Cpu, Plus, Loader2, Trash2, CheckCircle2, XCircle, Zap,
  Brain, Volume2, Music, Video, Image, Save, Search,
} from 'lucide-react';

const PROVIDER_TYPES: { type: ProviderType; label: string; icon: typeof Brain; providers: string[] }[] = [
  { type: 'llm', label: 'LLM', icon: Brain, providers: ['openai', 'anthropic', 'gemini', 'ollama', 'custom'] },
  { type: 'voice', label: 'Voice', icon: Volume2, providers: ['elevenlabs', 'azure', 'google', 'custom'] },
  { type: 'music', label: 'Music', icon: Music, providers: ['suno', 'udio', 'custom'] },
  { type: 'video', label: 'Video', icon: Video, providers: ['runway', 'pika', 'custom'] },
  { type: 'image', label: 'Image', icon: Image, providers: ['dalle', 'midjourney', 'stable-diffusion', 'custom'] },
];

const MODELS: Record<string, string[]> = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  anthropic: ['claude-3-5-sonnet', 'claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
  gemini: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
  ollama: ['llama3', 'llama2', 'mistral', 'codellama'],
  custom: [],
};

export function AIProviders() {
  const { navigate } = useRouter();
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingProvider, setEditingProvider] = useState<AIProvider | null>(null);
  const [testing, setTesting] = useState<string | null>(null);

  const fetchProviders = async () => {
    const { data } = await supabase.from('ai_providers')
      .select('id, user_id, name, type, provider, model, api_url, status, config, is_enabled, last_tested_at, last_test_result, created_at, updated_at')
      .order('created_at', { ascending: false });
    setProviders((data ?? []) as AIProvider[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const handleToggle = async (provider: AIProvider) => {
    await supabase.from('ai_providers').update({ is_enabled: !provider.is_enabled }).eq('id', provider.id);
    fetchProviders();
  };

  const handleDelete = async (provider: AIProvider) => {
    await supabase.from('ai_providers').delete().eq('id', provider.id);
    fetchProviders();
  };

  const handleTest = async (provider: AIProvider) => {
    setTesting(provider.id);
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
          jobId: 'test',
          jobType: 'test',
          input: { test: true },
        }),
      });
      const ok = response.ok;
      await supabase.from('ai_providers').update({
        last_tested_at: new Date().toISOString(),
        last_test_result: ok ? 'Connection successful' : `Failed (${response.status})`,
        status: ok ? 'active' : 'error',
      }).eq('id', provider.id);
      fetchProviders();
    } catch {
      await supabase.from('ai_providers').update({
        last_tested_at: new Date().toISOString(),
        last_test_result: 'Connection failed',
        status: 'error',
      }).eq('id', provider.id);
      fetchProviders();
    }
    setTesting(null);
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">AI Providers</h2>
            <p className="text-sm text-gray-500 mt-0.5">Configure LLM, voice, music, video, and image providers</p>
          </div>
          <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Provider
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-gray-600 animate-spin" />
          </div>
        ) : providers.length === 0 ? (
          <EmptyState
            icon={Cpu}
            title="No AI providers configured"
            description="Add an LLM provider to enable AI screenplay generation, character creation, and the AI Director."
            action={
              <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add Provider
              </button>
            }
          />
        ) : (
          <div className="space-y-6">
            {PROVIDER_TYPES.map((pt) => {
              const typeProviders = providers.filter((p) => p.type === pt.type);
              if (typeProviders.length === 0) return null;
              const Icon = pt.icon;
              return (
                <div key={pt.type}>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5" /> {pt.label}
                  </h3>
                  <div className="space-y-2">
                    {typeProviders.map((provider) => (
                      <div key={provider.id} className="glass-panel p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-bg-elevated flex items-center justify-center shrink-0">
                            <Icon className="w-5 h-5 text-gray-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-semibold text-white">{provider.name}</span>
                              <StatusBadge status={provider.status} />
                              {provider.is_enabled && <span className="badge badge-success">Enabled</span>}
                            </div>
                            <div className="text-xs text-gray-500">
                              {provider.provider} {provider.model ? `· ${provider.model}` : ''}
                            </div>
                            {provider.last_test_result && (
                              <div className="text-xs text-gray-600 mt-1">
                                Last test: {provider.last_test_result}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleTest(provider)}
                              disabled={testing === provider.id}
                              className="btn-ghost text-xs flex items-center gap-1"
                            >
                              {testing === provider.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                              Test
                            </button>
                            <button onClick={() => setEditingProvider(provider)} className="btn-ghost text-xs">
                              Edit
                            </button>
                            <button
                              onClick={() => handleToggle(provider)}
                              className={`btn-ghost text-xs ${provider.is_enabled ? 'text-amber-400' : 'text-emerald-400'}`}
                            >
                              {provider.is_enabled ? 'Disable' : 'Enable'}
                            </button>
                            <button onClick={() => handleDelete(provider)} className="btn-ghost text-xs text-red-400">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {(showAdd || editingProvider) && (
        <ProviderModal
          provider={editingProvider}
          onClose={() => { setShowAdd(false); setEditingProvider(null); }}
          onSaved={() => { fetchProviders(); setShowAdd(false); setEditingProvider(null); }}
        />
      )}
    </div>
  );
}

function ProviderModal({
  provider,
  onClose,
  onSaved,
}: {
  provider: AIProvider | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(provider?.name ?? '');
  const [type, setType] = useState<ProviderType>(provider?.type ?? 'llm');
  const [providerName, setProviderName] = useState(provider?.provider ?? 'openai');
  const [model, setModel] = useState(provider?.model ?? '');
  const [apiUrl, setApiUrl] = useState(provider?.api_url ?? '');
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableModels = MODELS[providerName] || [];
  const availableProviders = PROVIDER_TYPES.find((p) => p.type === type)?.providers || [];

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    const data: Record<string, unknown> = {
      name,
      type,
      provider: providerName,
      model: model || null,
      api_url: apiUrl || null,
    };

    if (apiKey) {
      data.api_key_encrypted = apiKey;
    }

    if (provider) {
      const { error } = await supabase.from('ai_providers').update(data).eq('id', provider.id);
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.from('ai_providers').insert(data);
      if (error) setError(error.message);
    }

    setSaving(false);
    if (!error) onSaved();
  };

  return (
    <Modal open={true} onClose={onClose} title={provider ? 'Edit Provider' : 'Add AI Provider'} maxWidth="max-w-lg">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-field" placeholder="My LLM Provider" />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Type</label>
          <select
            value={type}
            onChange={(e) => { setType(e.target.value as ProviderType); setProviderName(PROVIDER_TYPES.find((p) => p.type === e.target.value)?.providers[0] ?? 'custom'); }}
            className="input-field"
            disabled={!!provider}
          >
            {PROVIDER_TYPES.map((pt) => <option key={pt.type} value={pt.type}>{pt.label}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Provider</label>
          <select value={providerName} onChange={(e) => { setProviderName(e.target.value); setModel(''); }} className="input-field">
            {availableProviders.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
          </select>
        </div>

        {availableModels.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Model</label>
            <select value={model} onChange={(e) => setModel(e.target.value)} className="input-field">
              <option value="">Select model...</option>
              {availableModels.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        )}

        {availableModels.length === 0 && (
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Model (custom)</label>
            <input type="text" value={model} onChange={(e) => setModel(e.target.value)} className="input-field" placeholder="model-name" />
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">API URL (optional)</label>
          <input type="text" value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} className="input-field" placeholder="https://api.openai.com/v1/chat/completions" />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">API Key {provider && '(leave blank to keep current)'}</label>
          <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="input-field" placeholder="sk-..." />
        </div>

        {error && (
          <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-sm text-red-400">{error}</div>
        )}

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving || !name} className="btn-primary flex items-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {provider ? 'Update' : 'Add'} Provider
          </button>
        </div>
      </div>
    </Modal>
  );
}
