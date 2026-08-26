import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { createServer as createViteServer } from 'vite';
import path from 'path';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // We are running in AI Studio, so we can access process.env securely.
  // We use the service_role key to proxy requests, securely bypassing RLS 
  // for this single-user personal workspace architecture.
  // Use the provided Supabase URL as fallback if environment variables are placeholders
  const fallbackUrl = 'https://tsinlwwgxvvaqkqpakqh.supabase.co';
  const supabaseUrl = process.env.VITE_SUPABASE_URL && !process.env.VITE_SUPABASE_URL.startsWith('your-')
    ? process.env.VITE_SUPABASE_URL
    : fallbackUrl;
    
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const isValidUrl = (url: string | undefined) => {
    if (!url) return false;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const isPlaceholderKey = (key: string | undefined) => !key || key.startsWith('your-');

  if (isValidUrl(supabaseUrl) && !isPlaceholderKey(serviceRoleKey)) {
    // Restrict Supabase Proxy to allowlisted paths only
    const allowedTables = [
      'ai_jobs', 'ai_providers', 'assets', 'characters', 'character_versions',
      'locations', 'movie_exports', 'notifications', 'projects', 'project_settings',
      'render_jobs', 'scenes', 'scripts', 'script_scenes', 'shots', 'videos', 'worlds'
    ];

    const isAllowedPath = (path: string) => {
      // Allow specific PostgREST tables
      const restMatch = path.match(/^\/rest\/v1\/([a-z0-9_]+)/);
      if (restMatch && allowedTables.includes(restMatch[1])) return true;

      // Allow specific storage buckets (only 'videos' for now)
      if (path.startsWith('/storage/v1/object/videos/')) return true;

      // Allow specific edge functions
      if (path === '/functions/v1/ai-generate') return true;
      if (path === '/functions/v1/video-analyze') return true;

      // Allow realtime
      if (path.startsWith('/realtime/v1/')) return true;

      return false;
    };

    const allowedMethods = ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'];

    app.use('/supabase-proxy', (req, res, next) => {
      if (!allowedMethods.includes(req.method)) {
        return res.status(405).send('Method Not Allowed');
      }
      
      if (!isAllowedPath(req.path)) {
        console.warn(`Blocked unauthorized proxy request [${req.method}] to: ${req.path}`);
        return res.status(403).send('Forbidden: Path not allowlisted');
      }
      next();
    }, createProxyMiddleware({
      target: supabaseUrl,
      changeOrigin: true,
      ws: true,
      pathRewrite: { '^/supabase-proxy': '' },
      onProxyReq: (proxyReq) => {
        proxyReq.setHeader('apikey', serviceRoleKey);
        proxyReq.setHeader('Authorization', `Bearer ${serviceRoleKey}`);
      },
      onProxyReqWs: (proxyReq) => {
        proxyReq.setHeader('apikey', serviceRoleKey);
        proxyReq.setHeader('Authorization', `Bearer ${serviceRoleKey}`);
      }
    }));
  } else {
    console.warn('WARNING: Missing SUPABASE_SERVICE_ROLE_KEY. The local proxy will not work.');
  }

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BlockMovie AI server running on port ${PORT}`);
  });
}

startServer();
