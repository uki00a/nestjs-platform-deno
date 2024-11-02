import { parseArgs } from "node:util";
import { join } from "node:path";
import { allowedPackages, getRootDir } from "./shared.ts";

async function main() {
  const args = parseArgs({
    options: {
      package: {
        type: "string",
      },
    },
  });

  if (
    args.values.package == null ||
    !allowedPackages.includes(args.values.package)
  ) {
    throw new Error(
      `\`--package\` should be one of ${allowedPackages.join(", ")}`,
    );
  }

  const rootDir = getRootDir();
  const pathToDenoJson = join(
    rootDir,
    `packages/${args.values.package}/deno.json`,
  );
  const contents = JSON.parse(await Deno.readTextFile(pathToDenoJson));
  await Deno.stdout.write(new TextEncoder().encode(contents.version));
}

if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    // deno-lint-ignore no-console
    console.error(error);
    Deno.exit(1);
  }
}
