import { parseArgs } from "node:util";
import { allowedPackages, validateVersionArgument } from "./shared.ts";

function main() {
  const args = parseArgs({
    options: {
      package: {
        type: "string",
      },
      "new-version": {
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
  validateVersionArgument(args.values, "new-version");
}

if (import.meta.main) {
  try {
    main();
  } catch (error) {
    // deno-lint-ignore no-console
    console.error(error);
    Deno.exit(1);
  }
}
