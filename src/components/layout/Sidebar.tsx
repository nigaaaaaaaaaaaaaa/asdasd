import { useState } from 'react';
import { useRouter } from '@/context/RouteContext';
import { navItems, navGroups } from '@/config/navigation';
import { Boxes, ChevronLeft, ChevronRight } from 'lucide-react';

export function Sidebar() {
  const { route, navigate } = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className="flex flex-col bg-bg-secondary border-r border-border-subtle transition-all duration-300"
      style={{ width: collapsed ? '64px' : '240px' }}
    >
      <div className="flex items-center gap-3 px-4 h-16 border-b border-border-subtle">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 shrink-0">
          <Boxes className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <div className="text-sm font-bold text-white tracking-tight">BLOCKMOTION</div>
            <div className="text-[10px] text-gray-500 tracking-widest uppercase">AI Studio</div>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-4 scrollbar-thin">
        {navGroups.map((group) => (
          <div key={group} className="mb-4">
            {!collapsed && (
              <div className="px-4 mb-2 text-[10px] font-semibold text-gray-600 tracking-widest">
                {group}
              </div>
            )}
            <div className="space-y-0.5 px-2">
              {navItems
                .filter((item) => item.group === group)
                .map((item) => {
                  const Icon = item.icon;
                  const isActive = route === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => navigate(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all duration-200 ${
                        isActive
                          ? 'bg-blue-600/15 text-blue-400 border border-blue-600/20'
                          : 'text-gray-400 hover:text-gray-200 hover:bg-bg-tertiary border border-transparent'
                      }`}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </button>
                  );
                })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-border-subtle p-2">
        <div className="flex items-center gap-2 justify-center">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-md text-gray-500 hover:text-gray-300 hover:bg-bg-tertiary transition-colors"
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </aside>
  );
}
