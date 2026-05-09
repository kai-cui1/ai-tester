import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/app.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
});
