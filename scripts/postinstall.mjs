import { execSync } from "node:child_process";

if (process.env.VERCEL) {
  console.log("Skipping Playwright Chromium install on Vercel");
  process.exit(0);
}

execSync("npx playwright install chromium", { stdio: "inherit" });
