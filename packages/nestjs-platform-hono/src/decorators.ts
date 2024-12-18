import type { ExecutionContext, PipeTransform, Type } from "@nestjs/common";
import { createParamDecorator } from "@nestjs/common";

import type { Context } from "./deno.deps.ts";

/**
 * NOTE: The `@Body()` decorator provided by `@nestjs/common` does not work because Hono's {@linkcode Context} has `.body` property but it's not compatible with NestJS. Use this decorator if you want to inject the request body as JSON.
 */
export const JsonBody: (
  ...dataOrPipes: (Type<PipeTransform> | PipeTransform | string)[]
) => ParameterDecorator = createParamDecorator(
  async (data: string | undefined, ctx: ExecutionContext) => {
    const c = ctx.switchToHttp().getRequest<Context>();
    const body = await c.req.json();
    if (typeof data === "string") {
      return body[data];
    }
    return body;
  },
);
