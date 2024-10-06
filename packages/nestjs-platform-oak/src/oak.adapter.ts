import type { NestApplicationOptions, RequestMethod } from "@nestjs/common";
import { HttpException, Logger } from "@nestjs/common";
import type {
  ErrorHandler as _ErrorHandler,
  RequestHandler as _RequestHandler,
  VersioningOptions,
  VersionValue,
} from "@nestjs/common/interfaces";
import type {
  CorsOptions,
  CorsOptionsDelegate,
} from "@nestjs/common/interfaces/external/cors-options.interface.ts";
import { AbstractHttpAdapter } from "@nestjs/core";
import type {
  Middleware as OakMiddleware,
  Request as OakRequest,
  Response as OakResponse,
  RouterMiddleware as _OakRouterMiddleware,
} from "@oak/oak";
import { Application } from "@oak/oak";
import { Router } from "@oak/oak";

import { NotImplementedError } from "./errors.ts";
import type { OakErrorHandler, OakRequestHandler } from "./oak.instance.ts";
import { NestOakInstance } from "./oak.instance.ts";

interface OakAdapterOptions {
  logger?: Logger;
}

interface VersionedRoute {
  // deno-lint-ignore no-explicit-any, ban-types
  (req: any, res: any, next: () => void): Function;
}

const kParams = "params";
/**
 * NestJS HTTP adapter for [Oak](https://github.com/oakserver/oak).
 */
export class OakAdapter extends AbstractHttpAdapter {
  private constructor(instance: Application, {
    logger = new Logger("platform-oak"),
  }: OakAdapterOptions = {}) {
    super(new NestOakInstance(instance, new Router(), logger));
  }

  /**
   * Creates an instance of {@linkcode OakAdapter}.
   */
  static create(application?: Application): AbstractHttpAdapter {
    return new OakAdapter(application ?? new Application());
  }

  /** @internal */
  override close(): void {
    return this.getInstance()?.close();
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
    return this.#getInstance()?.listen(
      typeof port === "number" ? port : Number.parseInt(port),
      hostname,
      callback,
    );
  }

  /** @internal */
  override initHttpServer(options: NestApplicationOptions): void {
    const instance = this.#getInstance();
    instance?.initHttpServer(options);
    this.httpServer = instance;
  }

  /** @internal */
  override registerParserMiddleware(
    prefix?: string | undefined,
    _rawBody?: boolean | undefined,
  ): void {
    const instance = this.#getInstance();
    if (instance == null) return;
    if (prefix == null) {
      throw new Error("prefix is required");
    }
    instance.useOakMiddleware(prefix, async (ctx, next) => {
      const params = ctx.params;
      this.#setPropertyToOakRequest(ctx.request, kParams, params);
      await next();
    });
  }

  /** @internal */
  override createMiddlewareFactory(
    _requestMethod: RequestMethod,
  ): MiddlewareFactory | Promise<MiddlewareFactory> {
    const instance = this.#getInstance();
    if (instance == null) {
      throw new Error("An instance is not initialized yet");
    }
    const middlewareFactory: MiddlewareFactory = (_path, callback) => {
      instance.useOakMiddleware((ctx, next) => {
        return new Promise<unknown>((resolve, reject) => {
          callback(ctx.request, ctx.response, () => {
            const r = next();
            r.then(resolve, reject);
          });
        });
      });
    };
    return middlewareFactory;
  }

  /** @internal */
  override setErrorHandler(
    handler: OakErrorHandler,
    prefix?: string,
  ): void {
    if (prefix) {
      throw new NotImplementedError(
        "OakAdapter#setErrorHandler: prefix is not supported yet",
      );
    }
    if (handler.length !== 4) {
      throw new Error(
        "OakAdapter#setErrorHandler: an error handler should receive 4 arguments",
      );
    }
    this.#getInstance()?.useErrorHandler(handler);
  }

  /** @internal */
  override setNotFoundHandler(
    handler: OakRequestHandler,
    prefix?: string,
  ): void {
    if (handler.length !== 3) {
      throw new Error("OakAdapter#setNotFoundHandler: a handler is invalid");
    }

    const middleware: OakMiddleware = async (ctx, next) => {
      try {
        await next();
      } catch (error) {
        if (!(error instanceof HttpException) || error.getStatus() !== 404) {
          throw error;
        }

        /**
         * NOTE: NestJS does not call `next()`.
         * {@link https://github.com/nestjs/nest/blob/v10.3.9/packages/core/router/router-proxy.ts#L21}
         * {@link https://github.com/nestjs/nest/blob/v10.3.9/packages/core/router/routes-resolver.ts#L144-L149}
         */
        const mustNotBeCalled = () => {
          throw new Error("[BUG] next() was unexpectedly called");
        };
        handler(ctx.request, ctx.response, mustNotBeCalled);
      }
    };
    if (prefix) {
      this.#getInstance()?.useOakMiddleware(prefix, middleware);
    } else {
      this.#getInstance()?.useOakMiddleware(middleware);
    }
  }

  /** @internal */
  override setViewEngine(_engine: string): void {
    throw new NotImplementedError(
      "OakAdapter#setViewEngine is not supported yet",
    );
  }

  /** @internal */
  override useStaticAssets(..._args: unknown[]): void {
    throw new NotImplementedError(
      "OakAdapter#useStaticAssets is not supported yet",
    );
  }

  /** @internal */
  override enableCors(
    _options: CorsOptions | CorsOptionsDelegate<OakRequest>,
    _prefix?: string,
  ) {
    throw new NotImplementedError(
      "OakAdapter#enableCors is not supported yet",
    );
  }

  /** @internal */
  override applyVersionFilter(
    // deno-lint-ignore ban-types
    _handler: Function,
    _version: VersionValue,
    _versioningOptions: VersioningOptions,
  ): VersionedRoute {
    throw new NotImplementedError(
      "OakAdapter#applyVersionFilter is not supported yet",
    );
  }

  /** @internal */
  override getType(): string {
    return "@oak/oak";
  }

  /** @internal */
  override getRequestMethod(request: OakRequest): Lowercase<Request["method"]> {
    return toLowerCase(request.method);
  }

  /** @internal */
  override getRequestUrl(request: OakRequest): string {
    return request.url.pathname;
  }

  /** @internal */
  override getRequestHostname(request: OakRequest): string {
    return request.url.hostname;
  }

  /** @internal */
  override isHeadersSent(response: OakResponse): boolean {
    return !response.writable;
  }

  /** @internal */
  override setHeader(response: OakResponse, name: string, value: string): void {
    return response.headers.set(name, value);
  }

  /** @internal */
  override appendHeader(
    response: OakResponse,
    name: string,
    value: string,
  ): void {
    return response.headers.append(name, value);
  }

  /** @internal */
  override getHeader(response: OakResponse, name: string): string | null {
    return response.headers.get(name);
  }

  /** @internal */
  override reply(
    response: OakResponse,
    body: unknown,
    statusCode?: number | undefined,
  ): void {
    if (statusCode != null) {
      response.status = statusCode;
    }
    if (body != null) {
      response.body = body;
    }
  }

  /** @internal */
  override end(response: OakResponse, message?: string): void {
    response.body = message;
  }

  /** @internal */
  override status(response: OakResponse, statusCode: number): void {
    response.status = statusCode;
  }

  /** @internal */
  override redirect(response: OakResponse, statusCode: number, url: string) {
    response.status = statusCode;
    response.redirect(url);
  }

  /** @internal */
  override render(
    _response: OakResponse,
    _view: string,
    _options: unknown,
  ): void {
    throw new NotImplementedError(
      "OakAdapter#render is not supported yet",
    );
  }

  #getInstance(): NestOakInstance | undefined {
    return this.instance;
  }

  #setPropertyToOakRequest<TKey extends string>(
    request: OakRequest,
    key: TKey extends keyof OakRequest ? never : TKey,
    value: unknown,
  ): void {
    // @ts-expect-error This is intended
    request[key] = value;
  }
}

type MiddlewareFactory = (
  path: string,
  // deno-lint-ignore ban-types
  callback: Function,
  // deno-lint-ignore no-explicit-any
) => any;

function toLowerCase<T extends string>(s: T): Lowercase<T> {
  // @ts-expect-error `.toLowerCase()` returns a string converted to lower case
  return s.toLowerCase();
}

export { JsonBody } from "./decorators.ts";
