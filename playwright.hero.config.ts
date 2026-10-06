import {defineConfig,devices} from '@playwright/test';

// Read-only browser checks; the specification blocks all API requests.
export default defineConfig({
  testDir:'./tests/e2e',
  testMatch:['hero-assembly.spec.ts','hero3d.spec.ts'],
  workers:1,
  retries:0,
  reporter:[['list'],['junit',{outputFile:'test-results/hero.xml'}]],
  timeout:90000,
  use:{baseURL:process.env.HERO_QA_URL??'http://127.0.0.1:4174',trace:'retain-on-failure',video:'retain-on-failure'},
  webServer:process.env.HERO_QA_URL?undefined:{command:'node scripts/local.mjs vite preview --host 127.0.0.1 --port 4174',url:'http://127.0.0.1:4174',reuseExistingServer:false,timeout:60000},
  projects:[{name:'chromium-hero',use:{...devices['Desktop Chrome'],channel:'chromium'}}],
});
