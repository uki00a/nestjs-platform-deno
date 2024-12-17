import { build, emptyDir } from "@deno/dnt";
import nestjsPlatformHono from "../packages/nestjs-platform-hono/deno.json" with {
  type: "json",
};
import { dirname, join } from "node:path";

async function main() {
  const outDir = join(
    dirname(dirname(new URL(import.meta.url).pathname)),
    "dist",
  );
  await emptyDir(outDir);
  await build({
    entryPoints: [
      "./packages/nestjs-platform-hono/src/index.ts",
    ],
    shims: {},
    outDir,
    package: {
      name: nestjsPlatformHono.name,
      version: nestjsPlatformHono.version,
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
