import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export type Route =
  | 'dashboard'
  | 'projects'
  | 'video-to-3d'
  | 'movie-generator'
  | 'script-studio'
  | 'character-studio'
  | 'world-studio'
  | 'scene-studio'
  | 'editor-3d'
  | 'timeline'
  | 'render-queue'
  | 'asset-library'
  | 'ai-director'
  | 'settings'
  | 'ai-providers'
  | 'completed-movies';

interface RouteContextValue {
  route: Route;
  params: Record<string, string>;
  navigate: (route: Route, params?: Record<string, string>) => void;
}

const RouteContext = createContext<RouteContextValue | undefined>(undefined);

export function RouteProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<Route>('dashboard');
  const [params, setParams] = useState<Record<string, string>>({});

  const navigate = (newRoute: Route, newParams: Record<string, string> = {}) => {
    setRoute(newRoute);
    setParams(newParams);
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    const handlePop = () => {
      const hash = window.location.hash.slice(1);
      const [r] = hash.split('?');
      if (r) setRoute(r as Route);
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  return (
    <RouteContext.Provider value={{ route, params, navigate }}>
      {children}
    </RouteContext.Provider>
  );
}

export function useRouter() {
  const ctx = useContext(RouteContext);
  if (!ctx) throw new Error('useRouter must be used within RouteProvider');
  return ctx;
}
