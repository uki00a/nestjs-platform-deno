import { build, emptyDir } from "@deno/dnt";
import denoJson from "../deno.json" with {
  type: "json",
};
import nestjsPlatformHono from "../packages/nestjs-platform-hono/deno.json" with {
  type: "json",
};
import { dirname, join } from "node:path";

async function main() {
  const rootDir = dirname(dirname(new URL(import.meta.url).pathname));
  const outDir = join(
    rootDir,
    "dist/npm",
  );
  await emptyDir(outDir);
  await build({
    entryPoints: [
      "./packages/nestjs-platform-hono/src/index.ts",
    ],
    mappings: {
      "./packages/nestjs-platform-hono/src/deno.deps.ts":
        "./packages/nestjs-platform-hono/src/node.deps.ts",
    },
    shims: {},
    outDir,
    package: {
      name: nestjsPlatformHono.name,
      version: nestjsPlatformHono.version,
      description: "NestJS HTTP adapter for Hono🔥",
      license: "MIT",
      repository: {
        type: "git",
        url: "https://github.com/uki00a/nestjs-platform-deno.git",
      },
      devDependencies: {
        "@types/node": "^22.10.2",
      },
    },
    postBuild() {},
  });
}

if (import.meta.main) {
  main().catch((error) => {
    // deno-lint-ignore no-console
    console.error(error);
    Deno.exit(1);
  });
}
