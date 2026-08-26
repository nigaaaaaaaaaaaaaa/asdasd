import { useState } from 'react';
import { EmptyState } from '@/components/ui';
import {
  Box, Mouse, Hand, RotateCcw, ZoomIn, Sun, Users, Film,
  Layers, Eye, Settings2, Play, Pause, ChevronRight,
} from 'lucide-react';

export function Editor3D() {
  const [selectedTool, setSelectedTool] = useState('select');
  const [selectedTab, setSelectedTab] = useState('hierarchy');

  const tools = [
    { id: 'select', icon: Mouse, label: 'Select' },
    { id: 'move', icon: Hand, label: 'Move' },
    { id: 'rotate', icon: RotateCcw, label: 'Rotate' },
    { id: 'zoom', icon: ZoomIn, label: 'Zoom' },
  ];

  const tabs = [
    { id: 'hierarchy', label: 'Hierarchy', icon: Layers },
    { id: 'properties', label: 'Properties', icon: Settings2 },
    { id: 'camera', label: 'Camera', icon: Film },
    { id: 'lighting', label: 'Lighting', icon: Sun },
    { id: 'characters', label: 'Characters', icon: Users },
  ];

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left Panel - Scene Hierarchy */}
      <div className="w-64 bg-bg-secondary border-r border-border-subtle flex flex-col shrink-0">
        <div className="p-3 border-b border-border-subtle">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">3D Editor</div>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin p-2">
          <div className="text-xs text-gray-600 mb-2 px-2">Scene Hierarchy</div>
          <div className="space-y-0.5">
            {['Scene Root', 'Camera_001', 'Light_Sun', 'Light_Fill', 'PLAYER_001', 'PLAYER_002', 'Environment', 'Buildings', 'Terrain'].map((item, i) => (
              <div
                key={item}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-bg-tertiary cursor-pointer text-xs text-gray-400"
              >
                <ChevronRight className="w-3 h-3 text-gray-600" />
                {item.startsWith('PLAYER') ? <Users className="w-3 h-3 text-blue-400" /> :
                 item.startsWith('Camera') ? <Film className="w-3 h-3 text-amber-400" /> :
                 item.startsWith('Light') ? <Sun className="w-3 h-3 text-yellow-400" /> :
                 <Box className="w-3 h-3 text-gray-500" />}
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Center - 3D Viewport */}
      <div className="flex-1 flex flex-col bg-bg-primary">
        {/* Toolbar */}
        <div className="flex items-center gap-1 p-2 border-b border-border-subtle bg-bg-secondary">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.id}
                onClick={() => setSelectedTool(tool.id)}
                className={`p-2 rounded-md transition-colors ${
                  selectedTool === tool.id ? 'bg-blue-600/15 text-blue-400' : 'text-gray-500 hover:text-white hover:bg-bg-tertiary'
                }`}
                title={tool.label}
              >
                <Icon className="w-4 h-4" />
              </button>
            );
          })}
          <div className="w-px h-6 bg-border-subtle mx-1" />
          <button className="p-2 rounded-md text-gray-500 hover:text-white hover:bg-bg-tertiary" title="Play">
            <Play className="w-4 h-4" />
          </button>
          <button className="p-2 rounded-md text-gray-500 hover:text-white hover:bg-bg-tertiary" title="Pause">
            <Pause className="w-4 h-4" />
          </button>
        </div>

        {/* Viewport */}
        <div className="flex-1 relative overflow-hidden" style={{ background: 'radial-gradient(circle at 50% 50%, #111319 0%, #0a0b0f 100%)' }}>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 rounded-2xl bg-bg-elevated flex items-center justify-center mx-auto mb-4 border border-border-subtle">
                <Box className="w-10 h-10 text-gray-700" />
              </div>
              <p className="text-sm text-gray-500">3D Viewport</p>
              <p className="text-xs text-gray-600 mt-1">Select a scene to load it in the 3D editor</p>
            </div>
          </div>
          {/* Grid overlay */}
          <div className="absolute bottom-0 left-0 right-0 h-32 opacity-20 pointer-events-none"
            style={{
              backgroundImage: 'linear-gradient(to right, #2d3142 1px, transparent 1px), linear-gradient(to bottom, #2d3142 1px, transparent 1px)',
              backgroundSize: '40px 40px',
              transform: 'perspective(300px) rotateX(60deg)',
              transformOrigin: 'bottom',
            }}
          />
          {/* Axis gizmo */}
          <div className="absolute top-4 right-4 flex items-center gap-1 text-xs font-mono">
            <span className="text-red-500">X</span>
            <span className="text-green-500">Y</span>
            <span className="text-blue-500">Z</span>
          </div>
        </div>

        {/* Timeline strip */}
        <div className="h-8 bg-bg-secondary border-t border-border-subtle flex items-center px-3 gap-2">
          <span className="text-xs text-gray-500 font-mono">00:00:00</span>
          <div className="flex-1 h-1 bg-bg-tertiary rounded-full relative">
            <div className="h-full w-1/3 bg-blue-500/50 rounded-full" />
            <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-blue-500 rounded-full" style={{ left: '33%' }} />
          </div>
          <span className="text-xs text-gray-500 font-mono">00:15:00</span>
        </div>
      </div>

      {/* Right Panel - Properties */}
      <div className="w-72 bg-bg-secondary border-l border-border-subtle flex flex-col shrink-0">
        <div className="flex border-b border-border-subtle">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={`flex-1 flex flex-col items-center gap-1 py-2 text-xs transition-colors ${
                  selectedTab === tab.id ? 'text-blue-400 border-b-2 border-blue-500' : 'text-gray-500 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="text-[10px]">{tab.label}</span>
              </button>
            );
          })}
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin p-3">
          {selectedTab === 'properties' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Name</label>
                <input type="text" defaultValue="Scene Root" className="input-field text-xs" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Position X</label>
                <input type="number" defaultValue={0} className="input-field text-xs" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Position Y</label>
                <input type="number" defaultValue={0} className="input-field text-xs" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Position Z</label>
                <input type="number" defaultValue={0} className="input-field text-xs" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Rotation</label>
                <input type="number" defaultValue={0} className="input-field text-xs" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Scale</label>
                <input type="number" defaultValue={1} step={0.1} className="input-field text-xs" />
              </div>
            </div>
          )}
          {selectedTab === 'camera' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">FOV</label>
                <input type="number" defaultValue={50} className="input-field text-xs" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Camera Type</label>
                <select className="input-field text-xs">
                  <option>Perspective</option>
                  <option>Orthographic</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Movement</label>
                <select className="input-field text-xs">
                  <option>Static</option>
                  <option>Tracking</option>
                  <option>Orbit</option>
                  <option>Dolly</option>
                </select>
              </div>
            </div>
          )}
          {selectedTab === 'lighting' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Light Type</label>
                <select className="input-field text-xs">
                  <option>Sun</option>
                  <option>Point</option>
                  <option>Spot</option>
                  <option>Area</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Intensity</label>
                <input type="number" defaultValue={1.0} step={0.1} className="input-field text-xs" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Color</label>
                <input type="color" defaultValue="#ffffff" className="w-full h-8 rounded-md bg-bg-tertiary border border-border-default" />
              </div>
            </div>
          )}
          {selectedTab === 'hierarchy' && (
            <EmptyState icon={Layers} title="No selection" description="Select an object in the viewport to see its properties." />
          )}
          {selectedTab === 'characters' && (
            <EmptyState icon={Users} title="No characters" description="Characters from the current scene will appear here." />
          )}
        </div>
      </div>
    </div>
  );
}
