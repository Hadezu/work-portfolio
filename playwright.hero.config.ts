import {defineConfig,devices} from '@playwright/test';

// Read-only browser checks; the specification blocks all API requests.
export default defineConfig({
  testDir:'./tests/e2e',
  testMatch:'hero-assembly.spec.ts',
  timeout:90000,
  use:{baseURL:process.env.HERO_QA_URL??'http://127.0.0.1:4174',trace:'retain-on-failure'},
  projects:[{name:'chromium-hero',use:{...devices['Desktop Chrome'],channel:'chromium'}}],
});
