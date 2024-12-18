import type {
  CorsOptions as NestCorsOptions,
} from "@nestjs/common/interfaces/external/cors-options.interface.ts";
import type { cors } from "./deno.deps.ts";

type HonoCorsOptions = NonNullable<Parameters<typeof cors>[0]>;

/**
 * Hono uses `'*'` by default
 * @see {@link https://github.com/honojs/hono/blob/v4.6.4/src/middleware/cors/index.ts#L59}
 */
const defaultOrigin = "*";
/**
 * @internal
 * @see {@link https://github.com/expressjs/cors/tree/v2.8.5#configuration-options}
 */
export function toHonoCorsOptions(options: NestCorsOptions): HonoCorsOptions {
  const honoOptions: HonoCorsOptions = {
    origin: toHonoOriginOption(options.origin),
  };
  if (options.allowedHeaders != null) {
    honoOptions.allowHeaders = typeof options.allowedHeaders === "string"
      ? options.allowedHeaders.split(",")
      : options.allowedHeaders;
  }
  if (options.methods != null) {
    honoOptions.allowMethods = typeof options.methods === "string"
      ? options.methods.split(",")
      : options.methods;
  }
  if (options.exposedHeaders != null) {
    honoOptions.exposeHeaders = typeof options.exposedHeaders === "string"
      ? options.exposedHeaders.split(",")
      : options.exposedHeaders;
  }
  if (options.credentials != null) {
    honoOptions.credentials = options.credentials;
  }
  if (options.maxAge != null) {
    honoOptions.maxAge = options.maxAge;
  }
  return honoOptions;
}

/** @internal */
export function toHonoOriginOption(
  origin: NestCorsOptions["origin"],
): HonoCorsOptions["origin"] {
  if (origin == null) {
    return defaultOrigin;
  } else if (typeof origin === "string") {
    return origin;
  } else if (Array.isArray(origin)) {
    if (origin.every((x) => typeof x === "string")) {
      return origin;
    } else {
      return (fromOrigin) => {
        return isOriginAllowed(fromOrigin, origin) ? fromOrigin : null;
      };
    }
  } else if (typeof origin === "boolean") {
    if (origin) {
      return defaultOrigin;
    } else {
      return function dontSetAllowControlAccessOrigin(): null {
        return null;
      };
    }
  } else {
    return defaultOrigin;
  }
}

function isOriginAllowed(
  origin: string,
  allowedOrigins: string | RegExp | Array<string | RegExp>,
): boolean {
  if (Array.isArray(allowedOrigins)) {
    return allowedOrigins.some((allowedOrigin) =>
      isOriginAllowed(origin, allowedOrigin)
    );
  } else if (typeof allowedOrigins === "string") {
    return origin === allowedOrigins;
  } else {
    return allowedOrigins.test(origin);
  }
}
