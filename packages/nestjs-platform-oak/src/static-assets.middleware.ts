import type { ContextSendOptions, Middleware } from "@oak/oak";

// deno-lint-ignore no-unused-vars -- Referenced from JSDoc
import type { NestOakApplication } from "./nest-oak-application.interface.ts";

/**
 * Options for {@linkcode NestOakApplication.useStaticAssets}.
 */
export interface OakStaticAssetsOptions extends ContextSendOptions {
  /**
   * A path prefix under which static assets are served.
   */
  prefix?: string;
}

/** @internal */
export function staticAssets(options: OakStaticAssetsOptions): Middleware {
  const { prefix, ...contextSendOptions } = options;
  return async function staticAssets(ctx, next) {
    if (prefix != null && !ctx.request.url.pathname.startsWith(prefix)) {
      return next();
    }
    await ctx.send(
      prefix == null ? contextSendOptions : {
        ...contextSendOptions,
        path: ctx.request.url.pathname.slice(prefix.length),
      },
    );
  };
}
