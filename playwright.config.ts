import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
// Some sandboxes ship a Chromium build that differs from the one Playwright pins; use it when present.
const executablePath = process.env.PW_CHROMIUM ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined);

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    ...devices["Pixel 7"],
    launchOptions: executablePath ? { executablePath, args: ["--no-sandbox"] } : {},
  },
  webServer: {
    // Fresh seeded database for every run, separate from the dev database.
    command: `rm -f .e2e.db* && CIRCLO_DB=.e2e.db npm run seed && CIRCLO_DB=.e2e.db npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
