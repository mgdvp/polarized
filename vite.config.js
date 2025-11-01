import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Minimal Vite config: no Node polyfills required
export default defineConfig({
  plugins: [react()],
});
