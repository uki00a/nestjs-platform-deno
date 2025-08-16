import type { Logger, NestApplicationOptions } from "@nestjs/common";
import type {
  ErrorHandler as _ErrorHandler,
  RequestHandler as _RequestHandler,
} from "@nestjs/common/interfaces";
import type { HttpsOptions } from "@nestjs/common/interfaces/external/https-options.interface.ts";
import type {
  Application,
  Middleware as OakMiddleware,
  Request as OakRequest,
  Response as OakResponse,
  Router,
  RouterMiddleware as _OakRouterMiddleware,
} from "@oak/oak";
import { EventEmitter } from "node:events";
import { ImplementationError, NotImplementedError } from "./errors.ts";

type OakRouterMiddleware = _OakRouterMiddleware<string>;
/** @internal */
export type OakRequestHandler = _RequestHandler<OakRequest, OakResponse>;
/** @internal */
export type OakErrorHandler = _ErrorHandler<OakRequest, OakResponse>;

/**
 * @internal
 * @see {@link https://github.com/nestjs/nest/blob/v10.3.9/packages/core/nest-application.ts#L304-L324}
 */
export class NestOakInstance extends EventEmitter {
  private abortController?: AbortController;
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

  #listenPromise?: Promise<void>;
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
    const securityOptions = this.#httpOptions
      ? {
        secure: true as const,
        cert: this.#httpOptions.cert,
        key: this.#httpOptions.key,
      }
      : { secure: false as const };
    this.#listenPromise = this.application.listen({
      port,
      hostname,
      signal: abortController.signal,
      ...securityOptions,
    });
  }

  async close(): Promise<void> {
    const { promise, resolve } = Promise.withResolvers<void>();
    this.application.addEventListener("close", () => {
      resolve(undefined);
    }, { once: true });
    this.abortController?.abort();
    await this.#listenPromise;
    await promise;
  }

  #httpOptions?: HttpsOptions;
  initHttpServer(options: NestApplicationOptions): void {
    this.#httpOptions = options.httpsOptions;
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
        throw new NotImplementedError("An error handler is not supported yet");
      }
      this.router.use(
        path,
        (ctx, next) => handler(ctx.request, ctx.response, next),
      );
    } else if (isOakErrorHandler(pathOrHandler)) {
      this.useErrorHandler(pathOrHandler);
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
        throw new NotImplementedError("A router middleware is required");
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

  useErrorHandler(handler: OakErrorHandler): void {
    this.application.addEventListener("error", (e) => {
      if (e.context?.request == null) {
        throw new ImplementationError(
          "ApplicationErrorEvent.context.request is not defined",
        );
      }
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

function isOakErrorHandler(
  handler: OakRequestHandler | OakErrorHandler,
): handler is OakErrorHandler {
  return handler.length === 4;
}
