// vitest.config.js
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node', // or 'jsdom' if testing browser code
    globals: true // so you can use `describe`, `test`, `expect` without import
  }
})
