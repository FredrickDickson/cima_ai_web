import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ConvexProvider } from 'convex/react';
import { convex } from './lib/convexClient';
import { attemptChunkReload } from './lib/chunkReload';
import App from './App.tsx';
import './index.css';

// Vite's own modulepreload-polyfill failure event — a stale deploy's chunk
// hashes no longer exist on the server. See src/lib/chunkReload.ts.
window.addEventListener('vite:preloadError', () => {
  attemptChunkReload();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConvexProvider client={convex}>
      <App />
    </ConvexProvider>
  </StrictMode>
);
