import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

/**
 * Vitest Configuration for PDFLab Frontend Unit Tests
 *
 * Tests: Component, Hook, Context tests
 * Location: tests/unit/frontend/**
 */
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup/vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '*.config.ts',
        '*.config.js',
        'backend/',
        '.next/',
        'dist/',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
    include: ['tests/unit/frontend/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.next', 'backend'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@/components': path.resolve(__dirname, './components'),
      '@/lib': path.resolve(__dirname, './lib'),
      '@/contexts': path.resolve(__dirname, './contexts'),
      '@/app': path.resolve(__dirname, './app'),
    },
  },
})
