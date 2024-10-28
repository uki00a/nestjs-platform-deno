export const allowedPackages = [
  "nestjs-denokv",
  "nestjs-platform-hono",
  "nestjs-platform-oak",
];

export function validateVersionArgument<
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
