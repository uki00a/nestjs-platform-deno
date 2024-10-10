import { mkdtemp, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import assert from "node:assert/strict";
import rootDenoJson from "../../deno.json" with { type: "json" };

async function withTempDir(
  prefix: string,
  thunk: (tmpdir: string) => Promise<void>,
): Promise<void> {
  const tempDir = await mkdtemp(prefix);
  try {
    await thunk(tempDir);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

const rootDir = dirname(dirname(dirname(new URL(import.meta.url).pathname)));
const tmpDir = join(rootDir, "tmp");

Deno.test({
  name: "create-nestjs",
  fn: async (t) => {
    async function createNestJS(
      targetDir: string,
      framework: "hono" | "oak",
    ) {
      const result = await new Deno.Command(Deno.execPath(), {
        args: [
          "run",
          "--no-lock",
          `--allow-read=${targetDir}`,
          "--allow-write",
          "--allow-run=deno",
          join(rootDir, "packages/create-nestjs/cli.ts"),
          "--framework",
          framework,
          targetDir,
        ],
      }).output();
      if (!result.success) {
        throw new Error(new TextDecoder().decode(result.stderr));
      }
    }
    const tempDirPrefix = join(tmpDir, "/create-nestjs-");
    await t.step("hono", () =>
      withTempDir(tempDirPrefix, async (tempDir) => {
        await createNestJS(tempDir, "hono");
        const denoJson = JSON.parse(
          await Deno.readTextFile(join(tempDir, "deno.json")),
        );
        assert.ok(denoJson.imports);
        assert.equal(
          denoJson.imports["@hono/hono"],
          rootDenoJson.imports["@hono/hono"],
        );
        assert.equal(
          denoJson.imports["@uki00a/nestjs-platform-hono"],
          "jsr:@uki00a/nestjs-platform-hono",
        );
        assert.equal(
          denoJson.imports["@nestjs/common"],
          rootDenoJson.imports["@nestjs/common"],
        );
        assert.equal(
          denoJson.imports["@nestjs/core"],
          rootDenoJson.imports["@nestjs/core"],
        );
      }));
  },
  permissions: {
    read: true,
    write: [tmpDir],
    run: [Deno.execPath()],
  },
});
