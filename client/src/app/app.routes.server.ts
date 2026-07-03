import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
    // Admin Area
  {
    path: 'admin/**',
    renderMode: RenderMode.Client
  },

  // Auth Area
  {
    path: 'auth/**',
    renderMode: RenderMode.Client
  },
  {
    path: '**',
    renderMode: RenderMode.Client
    // renderMode: RenderMode.Server
    // renderMode: RenderMode.Prerender
  }
];
