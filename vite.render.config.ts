import { defineConfig } from 'vite';
export default defineConfig({ publicDir: false, build: { emptyOutDir: false, lib: { entry: 'src/content/render.ts', name: 'MapRender', formats: ['iife'], fileName: () => 'render.js' } } });
