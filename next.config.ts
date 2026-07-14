import type { NextConfig } from "next";
import { execSync } from "node:child_process";

function resolveGitVersion(): string {
  const vercelSha = process.env.VERCEL_GIT_COMMIT_SHA;
  if (vercelSha) {
    return vercelSha.slice(0, 7);
  }

  try {
    return execSync("git rev-parse --short HEAD", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "dev";
  }
}

const gitVersion = resolveGitVersion();

const nextConfig: NextConfig = {
  serverExternalPackages: ["playwright"],
  env: {
    NEXT_PUBLIC_APP_VERSION: gitVersion,
  },
};

export default nextConfig;
