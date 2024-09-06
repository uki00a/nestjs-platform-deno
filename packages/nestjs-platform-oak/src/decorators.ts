import type { ExecutionContext, PipeTransform, Type } from "@nestjs/common";
import { createParamDecorator } from "@nestjs/common";

import type { Request } from "@oak/oak";

/**
 * NOTE: The `@Body()` decorator provided by `@nestjs/common` injects Oak's {@linkcode Request.body}. Use this decorator if you want to inject the request body as JSON.
 */
export const JsonBody: (
  ...dataOrPipes: (Type<PipeTransform> | PipeTransform | string)[]
) => ParameterDecorator = createParamDecorator(
  async (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const body = await request.body.json();
    if (typeof data === "string") {
      return body[data];
    }
    return body;
  },
);
