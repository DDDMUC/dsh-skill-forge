import { defineConfig } from 'tsdown'

export default defineConfig([
  {
    entry: { index: 'src/index.ts' },
    outDir: 'lib',
    format: 'esm',
    fixedExtension: false,
    dts: false,
    clean: true,
    sourcemap: false,
  },
  {
    entry: { cli: 'src/cli.ts' },
    outDir: 'lib',
    format: 'esm',
    fixedExtension: false,
    dts: false,
    clean: false,
    sourcemap: false,
    banner: { js: '#!/usr/bin/env node' },
  },
  {
    entry: { client: 'src/client/index.ts' },
    outDir: 'lib',
    format: 'cjs',
    dts: false,
    clean: false,
    sourcemap: false,
    platform: 'browser',
  },
])
