import { AuthProvider } from '@/context/AuthContext';
import { RouteProvider, useRouter, type Route } from '@/context/RouteContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { Dashboard } from '@/pages/Dashboard';
import { Projects } from '@/pages/Projects';
import { VideoTo3D } from '@/pages/VideoTo3D';
import { MovieGenerator } from '@/pages/MovieGenerator';
import { ScriptStudio } from '@/pages/ScriptStudio';
import { CharacterStudio } from '@/pages/CharacterStudio';
import { WorldStudio } from '@/pages/WorldStudio';
import { SceneStudio } from '@/pages/SceneStudio';
import { Editor3D } from '@/pages/Editor3D';
import { TimelineEditor } from '@/pages/TimelineEditor';
import { RenderQueue } from '@/pages/RenderQueue';
import { AssetLibrary } from '@/pages/AssetLibrary';
import { AIDirector } from '@/pages/AIDirector';
import { CompletedMovies } from '@/pages/CompletedMovies';
import { SettingsPage } from '@/pages/SettingsPage';
import { AIProviders } from '@/pages/AIProviders';

const routeTitles: Record<Route, string> = {
  dashboard: 'Dashboard',
  projects: 'Projects',
  'video-to-3d': 'Video to 3D',
  'movie-generator': 'Movie Generator',
  'script-studio': 'Script Studio',
  'character-studio': 'Character Studio',
  'world-studio': 'World Studio',
  'scene-studio': 'Scene Studio',
  'editor-3d': '3D Editor',
  timeline: 'Timeline Editor',
  'render-queue': 'Render Queue',
  'asset-library': 'Asset Library',
  'ai-director': 'AI Director',
  settings: 'Settings',
  'ai-providers': 'AI Providers',
  'completed-movies': 'Completed Movies',
};

const fullScreenRoutes: Route[] = ['editor-3d', 'timeline', 'ai-director'];

function AppContent() {
  const { route } = useRouter();

  const isFullScreen = fullScreenRoutes.includes(route);

  const renderPage = () => {
    switch (route) {
      case 'dashboard': return <Dashboard />;
      case 'projects': return <Projects />;
      case 'video-to-3d': return <VideoTo3D />;
      case 'movie-generator': return <MovieGenerator />;
      case 'script-studio': return <ScriptStudio />;
      case 'character-studio': return <CharacterStudio />;
      case 'world-studio': return <WorldStudio />;
      case 'scene-studio': return <SceneStudio />;
      case 'editor-3d': return <Editor3D />;
      case 'timeline': return <TimelineEditor />;
      case 'render-queue': return <RenderQueue />;
      case 'asset-library': return <AssetLibrary />;
      case 'ai-director': return <AIDirector />;
      case 'completed-movies': return <CompletedMovies />;
      case 'settings': return <SettingsPage />;
      case 'ai-providers': return <AIProviders />;
      default: return <Dashboard />;
    }
  };

  if (isFullScreen) {
    return (
      <div className="flex h-screen bg-bg-primary">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar title={routeTitles[route]} />
          {renderPage()}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-bg-primary">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar title={routeTitles[route]} />
        {renderPage()}
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <RouteProvider>
        <AppContent />
      </RouteProvider>
    </AuthProvider>
  );
}

export default App;
