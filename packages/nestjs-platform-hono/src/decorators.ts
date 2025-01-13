import type {
  CallHandler,
  ExecutionContext,
  NestInterceptor,
  PipeTransform,
  Type,
} from "@nestjs/common";
import { createParamDecorator, UseInterceptors } from "@nestjs/common";

import type { Context } from "@hono/hono";

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

const kIsHtmlResponse = Symbol("nestjs-platform-hono.isHtmlResponse");
/** @internal */
export function shouldReturnHtml(c: Context): boolean {
  // @ts-expect-error This is an internal property.
  return c[kIsHtmlResponse];
}
class HtmlInterceptor implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler) {
    const c = ctx.switchToHttp().getRequest<Context>();
    // @ts-expect-error This is an internal property.
    c[kIsHtmlResponse] = true;
    return next.handle();
  }
}
/**
 * This method decorator is equivalent to {@linkcode Context.html}.
 */
export function Html(): MethodDecorator {
  return UseInterceptors(HtmlInterceptor);
}
