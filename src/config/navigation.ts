import { type Route } from '@/context/RouteContext';
import {
  LayoutDashboard, FolderOpen, Video, Clapperboard, FileText,
  Users, Globe, Film, Box, Clock, ListChecks, Library,
  Sparkles, Settings, Cpu, Trophy, Boxes,
} from 'lucide-react';

export interface NavItem {
  id: Route;
  label: string;
  icon: typeof LayoutDashboard;
  group: string;
}

export const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'HOME' },
  { id: 'projects', label: 'Projects', icon: FolderOpen, group: 'HOME' },
  { id: 'video-to-3d', label: 'Video to 3D', icon: Video, group: 'CREATE' },
  { id: 'movie-generator', label: 'Text to Movie', icon: Clapperboard, group: 'CREATE' },
  { id: 'script-studio', label: 'Script Studio', icon: FileText, group: 'STUDIO' },
  { id: 'character-studio', label: 'Characters', icon: Users, group: 'STUDIO' },
  { id: 'world-studio', label: 'Worlds', icon: Globe, group: 'STUDIO' },
  { id: 'scene-studio', label: 'Scenes', icon: Film, group: 'STUDIO' },
  { id: 'editor-3d', label: '3D Editor', icon: Box, group: 'PRODUCTION' },
  { id: 'timeline', label: 'Timeline', icon: Clock, group: 'PRODUCTION' },
  { id: 'render-queue', label: 'Render Queue', icon: ListChecks, group: 'PRODUCTION' },
  { id: 'ai-director', label: 'AI Director', icon: Sparkles, group: 'PRODUCTION' },
  { id: 'asset-library', label: 'Assets', icon: Library, group: 'LIBRARY' },
  { id: 'completed-movies', label: 'Completed Movies', icon: Trophy, group: 'LIBRARY' },
  { id: 'ai-providers', label: 'AI Providers', icon: Cpu, group: 'SYSTEM' },
  { id: 'settings', label: 'Settings', icon: Settings, group: 'SYSTEM' },
];

export const navGroups = ['HOME', 'CREATE', 'STUDIO', 'PRODUCTION', 'LIBRARY', 'SYSTEM'];

export const studioIcon = Boxes;
