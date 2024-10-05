import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { parseArgs } from "node:util";

async function main() {
  const rootDir = dirname(dirname(new URL(import.meta.url).pathname));
  const tmpDir = join(rootDir, "tmp");
  const cliffConfigsDir = join(tmpDir, "cliff");
  const allowedPackages = [
    "nestjs-denokv",
    "nestjs-platform-hono",
    "nestjs-platform-oak",
  ];
  const args = parseArgs({
    options: {
      package: {
        type: "string",
      },
      "current-version": {
        type: "string",
      },
      "new-version": {
        type: "string",
      },
    },
  });

  // Validate args
  if (
    args.values.package == null ||
    !allowedPackages.includes(args.values.package)
  ) {
    throw new Error(
      `\`--package\` should be one of ${allowedPackages.join(", ")}`,
    );
  }
  if (args.values["current-version"] == null) {
    throw new Error(`\`--current-version\` is required`);
  }
  if (args.values["new-version"] == null) {
    throw new Error(`\`--new-version\` is required`);
  }
  if (args.values["current-version"].startsWith("v")) {
    throw new Error(`\`--current-version\` should not start with \`v\``);
  }
  if (args.values["new-version"].startsWith("v")) {
    throw new Error(`\`--new-version\` should not start with \`v\``);
  }

  const pathToCliffConfig = join(
    cliffConfigsDir,
    `${args.values.package}.toml`,
  );
  const packageDir = join(rootDir, "packages", args.values.package);
  const pathToChangeLog = join(packageDir, "CHANGELOG.md");
  const pathToDenoJson = join(packageDir, "deno.json");

  // Ensure various files
  await mkdir(cliffConfigsDir, { recursive: true });
  const cliffConfigTemplate = await Deno.readTextFile(
    join(rootDir, "cliff.template.toml"),
  );
  await Deno.writeTextFile(
    pathToCliffConfig,
    cliffConfigTemplate.replaceAll("$PACKAGE", args.values.package),
  );
  try {
    // Ensure `packages/<package>/CHANGELOG.md`
    await Deno.utime(pathToChangeLog, new Date(), new Date());
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) {
      throw error;
    }
    using _ = await Deno.create(pathToChangeLog);
  }

  const decoder = new TextDecoder();
  {
    // Update `packages/<package>/CHANGELOG.md`
    const commitRange = `${args.values.package}@${
      args.values["current-version"]
    }..HEAD`;
    const newTag = `${args.values.package}@${args.values["new-version"]}`;
    const cliffOutput = await new Deno.Command("git-cliff", {
      args: [
        "--prepend",
        pathToChangeLog,
        "--config",
        pathToCliffConfig,
        `--tag`,
        newTag,
        commitRange,
      ],
    }).output();
    if (!cliffOutput.success) {
      throw new Error(decoder.decode(cliffOutput.stderr));
    }
    await fmt(pathToChangeLog);
  }

  {
    // Update `packages/<package>/deno.json`
    const denoJson = JSON.parse(await Deno.readTextFile(pathToDenoJson));
    denoJson.version = args.values["new-version"];
    await Deno.writeTextFile(pathToDenoJson, JSON.stringify(denoJson));
    await fmt(pathToDenoJson);
  }
}

async function fmt(path: string): Promise<void> {
  const fmtResult = await new Deno.Command("deno", {
    args: ["fmt", path],
  }).output();
  if (!fmtResult.success) {
    throw new Error(new TextDecoder().decode(fmtResult.stderr));
  }
}

if (import.meta.main) {
  main().catch((error) => {
    // deno-lint-ignore no-console
    console.error(error);
    Deno.exit(1);
  });
}
