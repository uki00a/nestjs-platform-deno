import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { allowedPackages, getRootDir } from "./shared.ts";

async function main() {
  const rootDir = getRootDir();
  const tmpDir = join(rootDir, "tmp");
  const cliffConfigsDir = join(tmpDir, "cliff");
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
  validateVersionArgument(args.values, "current-version");
  validateVersionArgument(args.values, "new-version");

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
    const previousTag = `${args.values.package}@${
      args.values["current-version"]
    }`;
    const commitRange = `${previousTag}..HEAD`;
    const newTag = `${args.values.package}@${args.values["new-version"]}`;
    const cliffArgs = [
      "--verbose",
      "--prepend",
      pathToChangeLog,
      "--config",
      pathToCliffConfig,
      `--tag`,
      newTag,
      "--tag-pattern",
      `^${args.values.package}@`,
      commitRange,
    ];
    const cliffOutput = await new Deno.Command("git-cliff", {
      args: cliffArgs,
      stdout: "inherit",
    }).output();
    if (!cliffOutput.success) {
      throw new Error(decoder.decode(cliffOutput.stderr));
    }
    await fmt(pathToChangeLog);
  }

  {
    // Update `packages/<package>/deno.json`
    const denoJson = JSON.parse(await Deno.readTextFile(pathToDenoJson));
    if (denoJson.version !== args.values["current-version"]) {
      throw new Error(
        `Version mismatch detected (deno.json: "${denoJson.version}", --current-version: "${
          args.values["current-version"]
        }"))`,
      );
    }
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

function validateVersionArgument<
  TArgs extends Record<string, string | null | undefined>,
  TArg extends keyof TArgs,
>(args: TArgs, arg: TArg): void {
  const version = args[arg];
  if (version == null) {
    throw new Error(`\`${String(arg)}\` is required`);
  }
  if (String(version).startsWith("v")) {
    throw new Error(`\`${String(arg)}\` should not start with \`v\``);
  }
}
