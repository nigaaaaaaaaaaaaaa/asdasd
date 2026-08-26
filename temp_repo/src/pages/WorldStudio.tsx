import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from '@/context/RouteContext';
import { EmptyState } from '@/components/ui';
import type { World, Location } from '@/types/database';
import { Globe, ChevronRight, MapPin, Loader2, Search } from 'lucide-react';

export function WorldStudio() {
  const { params, navigate } = useRouter();
  const [worlds, setWorlds] = useState<World[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<World | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);

  const fetchWorlds = async () => {
    const { data } = await supabase.from('worlds').select('*').order('updated_at', { ascending: false });
    setWorlds((data ?? []) as World[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchWorlds();
  }, []);

  useEffect(() => {
    if (params.id) {
      const world = worlds.find((w) => w.id === params.id);
      if (world) selectWorld(world);
    }
  }, [params.id, worlds]);

  const selectWorld = async (world: World) => {
    setSelected(world);
    const { data } = await supabase
      .from('locations')
      .select('*')
      .eq('world_id', world.id)
      .order('created_at', { ascending: true });
    setLocations((data ?? []) as Location[]);
  };

  const filtered = worlds.filter((w) =>
    w.name.toLowerCase().includes(search.toLowerCase()) ||
    (w.description ?? '').toLowerCase().includes(search.toLowerCase())
  );

  if (selected) {
    return (
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="p-6 max-w-4xl mx-auto">
          <button onClick={() => { setSelected(null); navigate('world-studio'); }} className="btn-ghost mb-4 flex items-center gap-1">
            <ChevronRight className="w-4 h-4 rotate-180" /> Back to worlds
          </button>

          <div className="glass-panel p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-600/20 to-emerald-800/5 flex items-center justify-center shrink-0">
                <Globe className="w-8 h-8 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{selected.name}</h2>
                {selected.description && <p className="text-sm text-gray-400 mt-1">{selected.description}</p>}
              </div>
            </div>
          </div>

          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-500" /> Locations ({locations.length})
          </h3>

          {locations.length === 0 ? (
            <EmptyState icon={MapPin} title="No locations" description="Locations are generated as part of the world bible." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {locations.map((loc) => (
                <div key={loc.id} className="glass-panel p-4">
                  <div className="flex items-start gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-bg-elevated flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">{loc.name}</div>
                      <div className="text-xs text-gray-500">{loc.location_id} {loc.type ? `· ${loc.type}` : ''}</div>
                    </div>
                  </div>
                  {loc.description && <p className="text-xs text-gray-400">{loc.description}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="p-6 max-w-6xl mx-auto">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white">World Studio</h2>
          <p className="text-sm text-gray-500 mt-0.5">Persistent world bibles with locations and environments</p>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search worlds..."
            className="input-field pl-10 max-w-md"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-gray-600 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Globe}
            title="No worlds yet"
            description="Worlds are generated when you create a movie. Each world has persistent locations with unique IDs."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((world) => (
              <button
                key={world.id}
                onClick={() => selectWorld(world)}
                className="glass-panel p-5 text-left hover:border-emerald-500/30 transition-all group"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-600/20 to-emerald-800/5 flex items-center justify-center shrink-0">
                    <Globe className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-white truncate">{world.name}</h3>
                    {world.description && <p className="text-xs text-gray-500 line-clamp-2">{world.description}</p>}
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
