import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from '@/context/RouteContext';
import { StatusBadge, EmptyState, Modal } from '@/components/ui';
import type { Character, CharacterVersion } from '@/types/database';
import {
  Users, Plus, Search, Loader2, Save, ChevronRight, History,
  RotateCcw, Shield, Eye, Shirt, Palette, Sparkles,
} from 'lucide-react';

export function CharacterStudio() {
  const { params, navigate } = useRouter();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Character | null>(null);
  const [versions, setVersions] = useState<CharacterVersion[]>([]);
  const [showVersions, setShowVersions] = useState(false);

  const fetchCharacters = async () => {
    const { data } = await supabase.from('characters').select('*').order('updated_at', { ascending: false });
    setCharacters((data ?? []) as Character[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchCharacters();
  }, []);

  useEffect(() => {
    if (params.id) {
      const char = characters.find((c) => c.id === params.id);
      if (char) selectCharacter(char);
    }
  }, [params.id, characters]);

  const selectCharacter = async (char: Character) => {
    setSelected(char);
    const { data } = await supabase
      .from('character_versions')
      .select('*')
      .eq('character_id', char.id)
      .order('version_number', { ascending: false });
    setVersions((data ?? []) as CharacterVersion[]);
  };

  const rollbackToVersion = async (version: CharacterVersion) => {
    if (!selected) return;
    const snapshot = version.snapshot as Record<string, unknown>;
    await supabase.from('characters').update({
      ...snapshot,
      updated_at: new Date().toISOString(),
    }).eq('id', selected.id);
    setSelected({ ...selected, ...snapshot } as Character);
    setShowVersions(false);
    fetchCharacters();
  };

  const saveVersion = async (char: Character, changeDescription: string) => {
    const nextVersion = versions.length > 0 ? Math.max(...versions.map((v) => v.version_number)) + 1 : 1;
    const snapshot: Record<string, unknown> = {
      name: char.name,
      role: char.role,
      description: char.description,
      appearance: char.appearance,
      face: char.face,
      eyes: char.eyes,
      hair: char.hair,
      clothing: char.clothing,
      armor: char.armor,
      accessories: char.accessories,
      colors: char.colors,
      personality: char.personality,
      abilities: char.abilities,
      equipment: char.equipment,
      voice_config: char.voice_config,
      animation_style: char.animation_style,
    };
    await supabase.from('character_versions').insert({
      character_id: char.id,
      version_number: nextVersion,
      snapshot,
      change_description: changeDescription,
    });
    const { data } = await supabase.from('character_versions').select('*').eq('character_id', char.id).order('version_number', { ascending: false });
    setVersions((data ?? []) as CharacterVersion[]);
  };

  const filtered = characters.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.role ?? '').toLowerCase().includes(search.toLowerCase())
  );

  if (selected) {
    return (
      <CharacterDetail
        character={selected}
        versions={versions}
        showVersions={showVersions}
        onToggleVersions={() => setShowVersions(!showVersions)}
        onRollback={rollbackToVersion}
        onBack={() => { setSelected(null); navigate('character-studio'); }}
        onSave={async (updates) => {
          await supabase.from('characters').update(updates).eq('id', selected.id);
          await saveVersion({ ...selected, ...updates } as Character, 'Manual edit');
          setSelected({ ...selected, ...updates } as Character);
          fetchCharacters();
        }}
      />
    );
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="p-6 max-w-6xl mx-auto">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white">Character Studio</h2>
          <p className="text-sm text-gray-500 mt-0.5">Character bible with persistent IDs and version history</p>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search characters..."
            className="input-field pl-10 max-w-md"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-gray-600 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No characters yet"
            description="Characters are generated when you create a movie. They'll appear here with full design details."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((char) => (
              <button
                key={char.id}
                onClick={() => selectCharacter(char)}
                className="glass-panel p-4 text-left hover:border-blue-500/30 transition-all group"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-600/20 to-blue-800/5 flex items-center justify-center shrink-0">
                    <Users className="w-6 h-6 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-white truncate">{char.name}</h3>
                    <div className="text-xs text-gray-500">{char.character_id} · {char.role ?? 'Unknown role'}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
                </div>
                {char.description && <p className="text-xs text-gray-400 line-clamp-2">{char.description}</p>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CharacterDetail({
  character,
  versions,
  showVersions,
  onToggleVersions,
  onRollback,
  onBack,
  onSave,
}: {
  character: Character;
  versions: CharacterVersion[];
  showVersions: boolean;
  onToggleVersions: () => void;
  onRollback: (v: CharacterVersion) => void;
  onBack: () => void;
  onSave: (updates: Partial<Character>) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(character.name);
  const [role, setRole] = useState(character.role ?? '');
  const [description, setDescription] = useState(character.description ?? '');

  const handleSave = async () => {
    setSaving(true);
    await onSave({ name, role, description });
    setSaving(false);
    setEditing(false);
  };

  const sections = [
    { label: 'Appearance', icon: Eye, data: character.appearance },
    { label: 'Face', icon: Eye, data: character.face },
    { label: 'Eyes', icon: Eye, data: character.eyes },
    { label: 'Hair', icon: Sparkles, data: character.hair },
    { label: 'Clothing', icon: Shirt, data: character.clothing },
    { label: 'Armor', icon: Shield, data: character.armor },
    { label: 'Accessories', icon: Shirt, data: character.accessories },
    { label: 'Colors', icon: Palette, data: character.colors },
    { label: 'Personality', icon: Sparkles, data: character.personality },
    { label: 'Abilities', icon: Sparkles, data: character.abilities },
    { label: 'Equipment', icon: Shield, data: character.equipment },
  ];

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onBack} className="btn-ghost flex items-center gap-1">
            <ChevronRight className="w-4 h-4 rotate-180" /> Back to characters
          </button>
          <div className="flex items-center gap-2">
            <button onClick={onToggleVersions} className="btn-secondary flex items-center gap-2 text-xs">
              <History className="w-3.5 h-3.5" /> Versions ({versions.length})
            </button>
            <button onClick={() => setEditing(!editing)} className="btn-primary flex items-center gap-2 text-xs">
              <Save className="w-3.5 h-3.5" /> {editing ? 'Cancel' : 'Edit'}
            </button>
          </div>
        </div>

        <div className="glass-panel p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-600/20 to-blue-800/5 flex items-center justify-center shrink-0">
              <Users className="w-8 h-8 text-blue-400" />
            </div>
            <div className="flex-1">
              {editing ? (
                <div className="space-y-3">
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-field text-lg font-semibold" />
                  <input type="text" value={role} onChange={(e) => setRole(e.target.value)} className="input-field" placeholder="Role" />
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input-field min-h-[80px] resize-y" placeholder="Description" />
                  <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Changes
                  </button>
                </div>
              ) : (
                <>
                  <h2 className="text-xl font-bold text-white">{character.name}</h2>
                  <div className="text-sm text-gray-500 mt-0.5">{character.character_id} · {character.role}</div>
                  {character.description && <p className="text-sm text-gray-400 mt-2">{character.description}</p>}
                </>
              )}
            </div>
          </div>
        </div>

        {showVersions && (
          <div className="glass-panel p-4 mb-6">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <History className="w-4 h-4 text-gray-500" /> Version History
            </h3>
            {versions.length === 0 ? (
              <p className="text-sm text-gray-500">No version history yet.</p>
            ) : (
              <div className="space-y-2">
                {versions.map((v) => (
                  <div key={v.id} className="flex items-center justify-between p-3 rounded-md bg-bg-tertiary">
                    <div>
                      <div className="text-sm text-white">Version {v.version_number}</div>
                      <div className="text-xs text-gray-500">{v.change_description ?? 'No description'}</div>
                      <div className="text-xs text-gray-600">{new Date(v.created_at).toLocaleString()}</div>
                    </div>
                    <button onClick={() => onRollback(v)} className="btn-ghost flex items-center gap-1 text-xs">
                      <RotateCcw className="w-3.5 h-3.5" /> Rollback
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sections.map((section) => {
            const data = section.data as Record<string, unknown>;
            const entries = Object.entries(data || {});
            if (entries.length === 0) return null;
            const Icon = section.icon;
            return (
              <div key={section.label} className="glass-panel p-4">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5" /> {section.label}
                </h4>
                <div className="space-y-1">
                  {entries.map(([key, value]) => (
                    <div key={key} className="text-xs">
                      <span className="text-gray-600 capitalize">{key.replace(/_/g, ' ')}:</span>{' '}
                      <span className="text-gray-300">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
