import { defineConfig } from 'vite';
export default defineConfig({ publicDir: false, build: { emptyOutDir: false, lib: { entry: 'src/content/render-settings.ts', name: 'MapRenderSettings', formats: ['iife'], fileName: () => 'render-settings.js' } } });
