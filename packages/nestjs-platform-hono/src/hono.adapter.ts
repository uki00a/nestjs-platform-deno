import type { NestApplicationOptions, RequestMethod } from "@nestjs/common";
import type {
  ErrorHandler as NestErrorHandler,
  VersioningOptions,
  VersionValue,
} from "@nestjs/common/interfaces";
import type {
  CorsOptions,
  CorsOptionsDelegate,
} from "@nestjs/common/interfaces/external/cors-options.interface.ts";
import { AbstractHttpAdapter } from "@nestjs/core";
import type { Context as HonoContext } from "@hono/hono";
import { Hono } from "@hono/hono";
import { cors } from "@hono/hono/cors";
import { serveStatic } from "@hono/hono/deno";
import type { ServeStaticOptions } from "@hono/hono/serve-static";
import type { HonoRequestHandler, MiddlewareFactory } from "./hono.instance.ts";
import { NestHonoInstance } from "./hono.instance.ts";
import { toHonoCorsOptions } from "./cors.ts";
import { ImplementationError, NotImplementedError } from "./errors.ts";

type HonoStatusCode = Parameters<HonoContext["status"]>[0];

/**
 * NestJS HTTP adapter for {@link https://github.com/honojs/hono | Hono}🔥
 */
export class HonoAdapter extends AbstractHttpAdapter {
  private constructor(hono: Hono) {
    super(new NestHonoInstance(hono));
  }

  /**
   * Creates an instance of {@linkcode HonoAdapter}.
   */
  static create(hono?: Hono): AbstractHttpAdapter {
    return new HonoAdapter(hono ?? new Hono());
  }

  /** @internal */
  override getInstance<T = NestHonoInstance>(): T {
    return super.getInstance();
  }

  /** @internal */
  override getType(): string {
    return "@hono/hono";
  }

  /** @internal */
  override listen(
    port: string | number,
    callback?: (() => void) | undefined,
  ): void;
  /** @internal */
  override listen(
    port: string | number,
    hostname: string,
    callback?: (() => void) | undefined,
  ): void;
  /** @internal */
  override listen(
    port: string | number,
    hostnameOrCallback?: string | (() => void),
    maybeCallback?: () => void,
  ): void {
    const hostname = typeof hostnameOrCallback === "function"
      ? undefined
      : hostnameOrCallback;
    const callback = typeof hostnameOrCallback === "function"
      ? hostnameOrCallback
      : maybeCallback;
    this.getInstance().listen(
      typeof port === "number" ? port : Number.parseInt(port),
      hostname,
      callback,
    );
  }

  /** @internal */
  override close(): void {
    return this.getInstance().close();
  }

  /** @internal */
  override initHttpServer(options: NestApplicationOptions): void {
    const instance = this.getInstance();
    instance.initHttpServer(options);
    this.httpServer = instance;
  }

  /** @internal */
  override registerParserMiddleware(
    _prefix?: string,
    _rawBody?: boolean,
  ): void {
    /* DO NOTHING */
  }

  /** @internal */
  override createMiddlewareFactory(
    requestMethod: RequestMethod,
  ): MiddlewareFactory | Promise<MiddlewareFactory> {
    const instance = this.getInstance();
    return instance.createMiddlewareFactory(requestMethod);
  }

  /** @internal */
  override setErrorHandler(handler: NestErrorHandler, prefix?: string) {
    if (prefix) {
      throw new NotImplementedError(
        "HonoAdapter#setErrorHandler: prefix is not supported yet",
      );
    }
    if (handler.length !== 4) {
      throw new Error(
        "HonoAdapter#setErrorHandler: an error handler should receive 4 arguments",
      );
    }
    this.getInstance().useErrorHandler((error: Error, c: HonoContext) => {
      const next = noop;
      return handler(error, c, c, next);
    });
  }

  /** @internal */
  override setNotFoundHandler(handler: HonoRequestHandler, prefix?: string) {
    /* DO NOTHING */
    if (prefix) {
      throw new NotImplementedError(
        "HonoAdapter#setNotFoundHandler: `prefix` parameter is not supported yet",
      );
    }
    function notFoundHandler(c: HonoContext): Promise<Response> {
      return new Promise((resolve, reject) => {
        /**
         * NOTE: NestJS does not call `next()`.
         * {@link https://github.com/nestjs/nest/blob/v10.3.9/packages/core/router/router-proxy.ts#L21}
         * {@link https://github.com/nestjs/nest/blob/v10.3.9/packages/core/router/routes-resolver.ts#L144-L149}
         */
        function next(): void {
          reject(
            new ImplementationError(
              "HonoAdapter#setNotFoundHandler - `next()` should not be called",
            ),
          );
        }
        handler(c, c, next)
          .then(() => resolve(c.res))
          .catch(reject);
      });
    }
    this.getInstance().notFound(notFoundHandler);
  }

  /** @internal */
  override setViewEngine(_engine: string) {
    throw new NotImplementedError(
      "HonoAdapter#setViewEngine is not supported yet",
    );
  }

  /** @internal */
  override useStaticAssets(path: string, options?: ServeStaticOptions): void {
    this.getInstance().use(path, serveStatic(options ?? {}));
  }

  /** @internal */
  override enableCors(
    options: CorsOptions | CorsOptionsDelegate<HonoContext>,
    prefix?: string,
  ) {
    if (prefix) {
      throw new NotImplementedError(
        "HonoAdapter#enableCors: `prefix` parameter is not supported yet",
      );
    }
    if (typeof options === "function") {
      throw new NotImplementedError(
        "HonoAdapter#enableCors: A callback function is not supported yet",
      );
    } else {
      this.getInstance().use(cors(toHonoCorsOptions(options)));
    }
  }

  /** @internal */
  override applyVersionFilter(
    // deno-lint-ignore ban-types
    _handler: Function,
    _version: VersionValue,
    _versioningOptions: VersioningOptions,
  ): VersionedRoute {
    throw new NotImplementedError(
      "HonoAdapter#applyVersionFilter is not supported yet",
    );
  }

  /** @internal */
  override getRequestMethod(c: HonoContext): string {
    return c.req.method;
  }

  /** @internal */
  override getRequestUrl(c: HonoContext): string {
    return c.req.path;
  }

  /** @internal */
  override getRequestHostname(c: HonoContext): string {
    return new URL(c.req.raw.url).hostname;
  }

  /** @internal */
  override isHeadersSent(c: HonoContext): boolean {
    return c.finalized;
  }

  /** @internal */
  override setHeader(
    c: HonoContext,
    name: string,
    value: string,
  ): void {
    return c.header(name, value);
  }

  /** @internal */
  override appendHeader(
    c: HonoContext,
    name: string,
    value: string,
  ): void {
    return c.header(name, value, { append: true });
  }

  /** @internal */
  override getHeader(c: HonoContext, name: string): string | undefined {
    return c.req.header(name);
  }

  /**
   * @internal
   */
  override reply(
    c: HonoContext,
    body: unknown,
    statusCode?: HonoStatusCode | undefined,
  ): void {
    if (statusCode != null) {
      c.status(statusCode);
    }

    if (
      typeof body === "string" || body instanceof ArrayBuffer ||
      body instanceof ReadableStream
    ) {
      c.res = c.body(body);
    } else if (body === undefined) {
      c.res = c.newResponse(null);
    } else {
      c.res = c.json(body);
    }
  }

  /** @internal */
  override status(c: HonoContext, statusCode: HonoStatusCode): void {
    c.status(statusCode);
  }

  /** @internal */
  override end(c: HonoContext, message?: string): void {
    c.res = c.body(message ?? null);
  }

  /** @internal */
  override redirect(
    c: HonoContext,
    statusCode: 300 | 301 | 302 | 303 | 304 | 307 | 308,
    url: string,
  ): void {
    c.res = c.redirect(url, statusCode);
  }

  /** @internal */
  override render(
    _c: HonoContext,
    _view: string,
    _options: unknown,
  ): void {
    throw new NotImplementedError(
      "HonoAdapter#render is not supported yet",
    );
  }
}

interface VersionedRoute {
  // deno-lint-ignore no-explicit-any, ban-types
  (req: any, res: any, next: () => void): Function;
}

function noop(): void {}
