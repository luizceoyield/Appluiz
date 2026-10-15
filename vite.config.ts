import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `--mode claude` gera um único HTML (JS, CSS e logo embutidos) para publicar no claude.ai.
export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === 'claude' ? [viteSingleFile()] : [])],
  build: mode === 'claude' ? { outDir: 'dist-claude', assetsInlineLimit: 100_000_000 } : {},
  server: { host: true, port: 8080 },
}));
