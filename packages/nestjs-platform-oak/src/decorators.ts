import type { ExecutionContext } from "@nestjs/common";
import { createParamDecorator } from "@nestjs/common";

import { Request } from "@oak/oak";

/**
 * NOTE: The `@Body()` decorator provided by `@nestjs/common` injects Oak's {@linkcode Request.body}. Use this decorator if you want to inject the request body as JSON, .
 */
export const JsonBody = createParamDecorator(
  async (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const body = await request.body.json();
    return body;
  },
);
