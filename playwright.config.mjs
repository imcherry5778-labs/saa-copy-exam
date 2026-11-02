import { defineConfig } from '@playwright/test';

// Reference images are the read-only demo captures; never regenerate them.
export default defineConfig({
  testDir: 'tests',
  snapshotPathTemplate: 'capture/shots/{arg}{ext}',
  updateSnapshots: 'none',
  reporter: [['list']],
  timeout: 30_000,
  expect: {
    toHaveScreenshot: { maxDiffPixels: 300, threshold: 0.1, animations: 'disabled' },
  },
  use: {
    channel: 'chrome',
    headless: true,
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  },
});
