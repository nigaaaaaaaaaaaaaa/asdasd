import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { EmptyState } from '@/components/ui';
import type { Asset } from '@/types/database';
import {
  Library, Users, Globe, MapPin, Film, Box, Image, Volume2,
  Music, Sparkles, Camera, Search, Loader2, Upload,
} from 'lucide-react';

const TYPE_ICONS: Record<string, typeof Users> = {
  character: Users,
  world: Globe,
  location: MapPin,
  animation: Film,
  model: Box,
  texture: Image,
  sound: Volume2,
  music: Music,
  effect: Sparkles,
  camera_preset: Camera,
};

const TYPE_FILTERS = ['all', 'character', 'world', 'location', 'animation', 'model', 'texture', 'sound', 'music', 'effect', 'camera_preset'];

export function AssetLibrary() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const fetchAssets = async () => {
    const { data } = await supabase.from('assets').select('*').order('created_at', { ascending: false });
    setAssets((data ?? []) as Asset[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const filtered = assets.filter((a) => {
    const matchesSearch = a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    const matchesFilter = filter === 'all' || a.type === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">Asset Library</h2>
            <p className="text-sm text-gray-500 mt-0.5">Characters, worlds, locations, animations, models, textures, sounds</p>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search assets..."
              className="input-field pl-10"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 mb-6 overflow-x-auto scrollbar-thin pb-1">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all shrink-0 ${
                filter === f ? 'bg-blue-600 text-white' : 'bg-bg-tertiary text-gray-400 hover:text-white'
              }`}
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1).replace('_', ' ')}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-gray-600 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Library}
            title="No assets yet"
            description="Assets are generated during movie creation. Characters, worlds, animations, and sounds will appear here."
          />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((asset) => {
              const Icon = TYPE_ICONS[asset.type] || Box;
              return (
                <div key={asset.id} className="glass-panel p-4 hover:border-blue-500/30 transition-all cursor-pointer group">
                  <div className="aspect-square rounded-lg bg-bg-elevated flex items-center justify-center mb-3 overflow-hidden">
                    {asset.thumbnail_url ? (
                      <img src={asset.thumbnail_url} alt={asset.name} className="w-full h-full object-cover" />
                    ) : (
                      <Icon className="w-10 h-10 text-gray-700 group-hover:text-gray-500 transition-colors" />
                    )}
                  </div>
                  <div className="text-sm font-medium text-white truncate">{asset.name}</div>
                  <div className="text-xs text-gray-500 capitalize mt-0.5">{asset.type.replace('_', ' ')}</div>
                  {asset.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {asset.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-bg-tertiary text-gray-500">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
