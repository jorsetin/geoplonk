import { defineConfig } from 'vite';
export default defineConfig({ publicDir: false, build: { emptyOutDir: false, lib: { entry: 'src/background/index.ts', formats: ['es'], fileName: () => 'background.js' } } });
