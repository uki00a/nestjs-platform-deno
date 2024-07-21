import type {
  HttpServer,
  NestApplicationOptions,
  RequestMethod,
} from "@nestjs/common";
import { Logger } from "@nestjs/common";
import type {
  ErrorHandler as _ErrorHandler,
  RequestHandler as _RequestHandler,
} from "@nestjs/common/interfaces";
import { AbstractHttpAdapter } from "@nestjs/core";
import type {
  Middleware as OakMiddleware,
  Request as OakRequest,
  Response as OakResponse,
  RouterMiddleware as _OakRouterMiddleware,
} from "@oak/oak";
import { Application } from "@oak/oak";
import { Router } from "@oak/oak";
import { EventEmitter } from "node:events";

interface OakAdapterOptions {
  logger?: Logger;
}

/**
 * @see {@link https://github.com/nestjs/nest/blob/v10.3.9/packages/core/nest-application.ts#L304-L324}
 */
interface NestHttpServerBridge extends EventEmitter {
  address(): Record<string, unknown>;
}

type OakRequestHandler = _RequestHandler<OakRequest, OakResponse>;
type OakErrorHandler = _ErrorHandler<OakRequest, OakResponse>;
type OakRouterMiddleware = _OakRouterMiddleware<string>;
function isOakErrorHandler(
  handler: OakRequestHandler | OakErrorHandler,
): handler is OakErrorHandler {
  return handler.length === 4;
}

class NestOakInstance extends EventEmitter
  implements NestHttpServerBridge, Omit<HttpServer, "listen"> {
  private abortController?: AbortController;
  private secure?: boolean;
  private port?: number;
  private hostname?: string;

  constructor(
    private readonly application: Application,
    private readonly router: Router,
    private readonly logger: Logger,
  ) {
    super();
  }

  address(): Record<string, unknown> {
    return {
      port: this.port,
      hostname: this.hostname,
    };
  }

  listen(
    port: number,
    hostname: string | undefined,
    callback?: () => void,
  ): void {
    const abortController = new AbortController();
    this.abortController = abortController;
    this.port = port;
    this.hostname = hostname;
    if (callback) {
      this.application.addEventListener("listen", callback);
    }
    this.application.use(this.router.routes());
    this.application.use(this.router.allowedMethods());
    this.application.listen({
      port,
      hostname,
      secure: this.secure,
      signal: abortController.signal,
    });
  }

  close(): void {
    this.abortController?.abort();
  }

  initHttpServer(options: NestApplicationOptions): void {
    this.secure = options.httpsOptions ? true : false;
  }

  use(handler: OakRequestHandler | OakErrorHandler): void;
  use(path: string, handler: OakRequestHandler | OakErrorHandler): void;
  use(
    pathOrHandler: string | OakRequestHandler | OakErrorHandler,
    maybeHandler?: OakRequestHandler | OakErrorHandler,
  ): void {
    if (typeof pathOrHandler === "string") {
      const path = pathOrHandler;
      const handler = maybeHandler;
      if (handler == null) throw new Error(`handler is required`);
      if (isOakErrorHandler(handler)) {
        throw new Error("An error handler is not supported");
      }
      this.router.use(
        path,
        (ctx, next) => handler(ctx.request, ctx.response, next),
      );
    } else if (isOakErrorHandler(pathOrHandler)) {
      this.#useErrorHandler(pathOrHandler);
    } else {
      this.application.use((ctx, next) =>
        pathOrHandler(ctx.request, ctx.response, next)
      );
    }
  }

  useOakMiddleware(middleware: OakMiddleware): void;
  useOakMiddleware(path: string, middleware: OakRouterMiddleware): void;
  useOakMiddleware(
    pathOrMiddleware: string | OakMiddleware,
    maybeMiddleware?: OakRouterMiddleware,
  ): void {
    if (typeof pathOrMiddleware === "string") {
      if (maybeMiddleware == null) {
        throw new Error("a router middleware is required");
      }
      this.router.use(pathOrMiddleware, maybeMiddleware);
    } else {
      this.application.use(pathOrMiddleware);
    }
  }

  get(handler: OakRequestHandler): void;
  get(path: string, handler: OakRequestHandler): void;
  get(
    pathOrHandler: string | OakRequestHandler,
    maybeHandler?: OakRequestHandler,
  ): void {
    this.#addRoute("get", pathOrHandler, maybeHandler);
  }

  post(handler: OakRequestHandler): void;
  post(path: string, handler: OakRequestHandler): void;
  post(
    pathOrHandler: string | OakRequestHandler,
    maybeHandler?: OakRequestHandler,
  ): void {
    this.#addRoute("post", pathOrHandler, maybeHandler);
  }

  patch(handler: OakRequestHandler): void;
  patch(path: string, handler: OakRequestHandler): void;
  patch(
    pathOrHandler: string | OakRequestHandler,
    maybeHandler?: OakRequestHandler,
  ): void {
    this.#addRoute("patch", pathOrHandler, maybeHandler);
  }

  put(handler: OakRequestHandler): void;
  put(path: string, handler: OakRequestHandler): void;
  put(
    pathOrHandler: string | OakRequestHandler,
    maybeHandler?: OakRequestHandler,
  ): void {
    this.#addRoute("put", pathOrHandler, maybeHandler);
  }

  delete(handler: OakRequestHandler): void;
  delete(path: string, handler: OakRequestHandler): void;
  delete(
    pathOrHandler: string | OakRequestHandler,
    maybeHandler?: OakRequestHandler,
  ): void {
    this.#addRoute("delete", pathOrHandler, maybeHandler);
  }

  head(handler: OakRequestHandler): void;
  head(path: string, handler: OakRequestHandler): void;
  head(
    pathOrHandler: string | OakRequestHandler,
    maybeHandler?: OakRequestHandler,
  ): void {
    this.#addRoute("head", pathOrHandler, maybeHandler);
  }

  options(handler: OakRequestHandler): void;
  options(path: string, handler: OakRequestHandler): void;
  options(
    pathOrHandler: string | OakRequestHandler,
    maybeHandler?: OakRequestHandler,
  ): void {
    this.#addRoute("options", pathOrHandler, maybeHandler);
  }

  all(path: string, handler: OakRequestHandler): void;
  all(handler: OakRequestHandler): void;
  all(
    pathOrHandler: string | OakRequestHandler,
    maybeHandler?: OakRequestHandler,
  ): void {
    this.#addRoute("all", pathOrHandler, maybeHandler);
  }

  #addRoute(
    method:
      | "get"
      | "delete"
      | "patch"
      | "post"
      | "put"
      | "options"
      | "head"
      | "all",
    pathOrHandler: string | OakRequestHandler,
    maybeHandler: OakRequestHandler | undefined,
  ): void {
    const [path, handler] = this.#getPathAndHandler(
      pathOrHandler,
      maybeHandler,
    );
    this.router[method](path, handler);
  }

  #useErrorHandler(handler: OakErrorHandler): void {
    this.application.addEventListener("error", (e) => {
      handler(e.error, e.context?.request, e.context?.response, () => {});
    });
  }

  #getPathAndHandler(
    pathOrHandler: string | OakRequestHandler,
    maybeHandler?: OakRequestHandler,
  ): [string, OakRouterMiddleware] {
    if (typeof pathOrHandler === "function") {
      throw new Error("Not supported");
    }
    if (maybeHandler == null) {
      throw new Error("Not supported");
    }
    return [
      pathOrHandler,
      (ctx, next) => maybeHandler(ctx.request, ctx.response, next),
    ];
  }
}

const kParams = "params";
export class OakAdapter extends AbstractHttpAdapter {
  readonly #logger: Logger;

  private constructor(instance: Application, {
    logger = new Logger("platform-oak"),
  }: OakAdapterOptions = {}) {
    super(new NestOakInstance(instance, new Router(), logger));
    this.#logger = logger;
  }

  static create(application?: Application): OakAdapter {
    return new OakAdapter(application ?? new Application());
  }

  override close(): void {
    return this.getInstance()?.close();
  }

  override listen(
    port: string | number,
    callback?: (() => void) | undefined,
  ): void;
  override listen(
    port: string | number,
    hostname: string,
    callback?: (() => void) | undefined,
  ): void;
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

  override initHttpServer(options: NestApplicationOptions): void {
    const instance = this.#getInstance();
    instance?.initHttpServer(options);
    this.httpServer = instance;
  }

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

  override getRequestMethod(request: OakRequest): Lowercase<Request["method"]> {
    return toLowerCase(request.method);
  }

  override getRequestUrl(request: OakRequest): string {
    return request.url.pathname;
  }

  override getRequestHostname(request: OakRequest): string {
    return request.url.hostname;
  }

  override isHeadersSent(response: OakResponse): boolean {
    return !response.writable;
  }

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

  override status(response: OakResponse, statusCode: number): void {
    response.status = statusCode;
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
