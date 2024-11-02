import { dirname } from "node:path";

export const allowedPackages = [
  "nestjs-denokv",
  "nestjs-platform-hono",
  "nestjs-platform-oak",
];

export function getRootDir(): string {
  const rootDir = dirname(dirname(new URL(import.meta.url).pathname));
  return rootDir;
}
