import type { $Type } from "@david/dax";
import { $ } from "@david/dax";
import { parseArgs } from "node:util";

import denoJson from "./deno.json" with { type: "json" };
import denoJsonTemplate from "./deno.template.json" with { type: "json" };
import { join } from "jsr:@std/path@^1.0/join";

type Framework = "oak" | "hono";
const supportedFrameworks: ReadonlyArray<Framework> = ["oak", "hono"];
const oakAdapterDeps = {
  "@uki00a/nestjs-platform-hono": "jsr:@uki00a/nestjs-platform-hono",
  "@oak/oak": "jsr:@oak/oak@^17",
};
const honoAdapterDeps = {
  "@uki00a/nestjs-platform-hono": "jsr:@uki00a/nestjs-platform-hono",
  "@hono/hono": "jsr:@hono/hono@^4",
};

function isSupportedFramework(
  maybeFramework: string,
): maybeFramework is Framework {
  return supportedFrameworks.includes(maybeFramework as Framework);
}

interface CreateOptions {
  framework: Framework;
  targetDir: string;
}
async function create(
  options: CreateOptions,
) {
  const additionalPackages = determineAdditionalPackages(options.framework);
  const denoJson = {
    ...denoJsonTemplate,
    imports: {
      ...denoJsonTemplate.imports,
      ...additionalPackages,
    },
  };
  await Deno.writeTextFile(
    join(options.targetDir, "deno.json"),
    JSON.stringify(denoJson, null, 2),
  );
}

function determineAdditionalPackages(
  framework: Framework,
): Record<string, string> {
  switch (framework) {
    case "hono":
      return honoAdapterDeps;
    case "oak":
      return oakAdapterDeps;
  }
}

interface MainOptions {
  framework?: string;
  targetDir?: string;
}
async function main(options: MainOptions) {
  const targetDir = options.targetDir ||
    await $.prompt("What directory do you want to create a new project in?", {
      default: "nestjs-project",
    });
  const framework = await selectFramework($, options);
  await $.path(targetDir).mkdir({ recursive: true });
  await create({
    ...options,
    framework,
    targetDir,
  });
}
async function selectFramework(
  $: $Type,
  options: MainOptions,
): Promise<Framework> {
  if (options.framework) {
    if (!isSupportedFramework(options.framework)) {
      throw new Error(
        `--framework should be one of ${
          supportedFrameworks.map((x) => `"${x}"`).join(", ")
        }`,
      );
    }
    return options.framework;
  }
  const indexOfFramework = await $.select({
    message: "Which framework will you use?",
    options: [...supportedFrameworks],
  });
  const framework = supportedFrameworks[indexOfFramework];
  return framework;
}

if (import.meta.main) {
  const parseArgsOptions = {
    allowPositionals: true,
    options: {
      "framework": {
        description: `A framework you want to use [${
          supportedFrameworks.join(", ")
        }]`,
        type: "string",
      },
      "help": {
        description: "Show this help text",
        type: "boolean",
        short: "h",
      },
    },
  } as const;
  const args = parseArgs(parseArgsOptions);
  if (args.values.help) {
    $.log(`${denoJson.name} - Creates a new NestJS project for Deno.

Usage:
  deno run jsr:${denoJson.name} [TARGET_DIRECTORY]
  
Options:
${
      Object.entries(parseArgsOptions.options).map((
        [option, { description }],
      ) => `  ${option} - ${description}`).join("\n")
    }`);
    Deno.exit(0);
  }

  main({
    framework: args.values.framework,
    targetDir: args.positionals[0],
  }).catch((error) => {
    $.logError("Failed", error);
    Deno.exit(1);
  });
}
