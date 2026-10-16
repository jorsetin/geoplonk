import { defineConfig } from 'vite';
export default defineConfig({ publicDir: false, build: { emptyOutDir: false, lib: { entry: 'src/content/index.ts', name: 'MapCompanion', formats: ['iife'], fileName: () => 'content.js' } } });
