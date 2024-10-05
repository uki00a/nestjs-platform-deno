import type { NestApplicationOptions } from "@nestjs/common";
import { RequestMethod } from "@nestjs/common";
import type {
  RequestHandler as NestRequestHandler,
} from "@nestjs/common/interfaces";
import type {
  Context as HonoContext,
  ErrorHandler,
  Hono,
  MiddlewareHandler,
  Next as HonoNext,
} from "@hono/hono";
import { EventEmitter } from "node:events";

import { NotImplementedError } from "./errors.ts";

/** NestJS requires that `Request` has `params` property */
const kRequestParams = "params";

/** @internal */
export type HonoRequestHandler = NestRequestHandler<HonoContext, HonoContext>;

/** @internal */
export type MiddlewareFactory = (
  path: string,
  // deno-lint-ignore ban-types
  callback: Function,
  // deno-lint-ignore no-explicit-any
) => any;

/**
 * @see {@link https://github.com/nestjs/nest/blob/v10.3.9/packages/core/nest-application.ts#L304-L324}
 * @internal
 */
export class NestHonoInstance extends EventEmitter {
  readonly #hono: Hono;
  #abortController?: AbortController;
  #httpOptions?: NestApplicationOptions["httpsOptions"];
  #port?: number;
  #hostname?: string;
  constructor(hono: Hono) {
    super();
    this.#hono = hono;
  }

  /** @internal */
  address(): Record<string, unknown> {
    return {
      port: this.#port,
      hostname: this.#hostname,
    };
  }

  /** @internal */
  listen(
    port: number,
    hostname: string | undefined,
    callback?: () => void,
  ): void {
    this.#abortController = new AbortController();
    this.#port = port;
    this.#hostname = hostname;

    const tlsOptions: Deno.TlsCertifiedKeyOptions | undefined =
      this.#httpOptions
        ? {
          key: this.#httpOptions.key,
          cert: this.#httpOptions.cert,
        }
        : undefined;
    Deno.serve({
      port,
      hostname,
      signal: this.#abortController.signal,
      onListen: callback ? () => callback() : undefined,
      ...tlsOptions,
    }, this.#hono.fetch);
  }

  /** @internal */
  close(): void {
    return this.#abortController?.abort();
  }

  /** @internal */
  initHttpServer(options: NestApplicationOptions): void {
    this.#httpOptions = options.httpsOptions;
  }

  /** @internal */
  use(middleware: MiddlewareHandler): void;
  /** @internal */
  use(prefix: string, middleware: MiddlewareHandler): void;
  /** @internal */
  use(
    prefixOrMiddleware: string | MiddlewareHandler,
    maybeMiddleware?: MiddlewareHandler,
  ): void {
    if (typeof prefixOrMiddleware === "string") {
      if (maybeMiddleware == null) {
        throw new Error("middleware is required");
      }
      if (prefixOrMiddleware === "") {
        this.#hono.use(maybeMiddleware);
      } else {
        this.#hono.use(prefixOrMiddleware, maybeMiddleware);
      }
    } else {
      this.#hono.use(prefixOrMiddleware);
    }
  }

  /** @internal */
  useErrorHandler(handler: ErrorHandler): void {
    this.#hono.onError(handler);
  }

  /** @internal */
  get(handler: HonoRequestHandler): void;
  /** @internal */
  get(path: string, handler: HonoRequestHandler): void;
  /** @internal */
  get(
    pathOrHandler: string | HonoRequestHandler,
    maybeHandler?: HonoRequestHandler,
  ): void {
    this.#addHandler("get", pathOrHandler, maybeHandler);
  }

  /** @internal */
  post(handler: HonoRequestHandler): void;
  /** @internal */
  post(path: string, handler: HonoRequestHandler): void;
  /** @internal */
  post(
    pathOrHandler: string | HonoRequestHandler,
    maybeHandler?: HonoRequestHandler,
  ): void {
    this.#addHandler("post", pathOrHandler, maybeHandler);
  }

  /** @internal */
  patch(handler: HonoRequestHandler): void;
  /** @internal */
  patch(path: string, handler: HonoRequestHandler): void;
  /** @internal */
  patch(
    pathOrHandler: string | HonoRequestHandler,
    maybeHandler?: HonoRequestHandler,
  ): void {
    this.#addHandler("patch", pathOrHandler, maybeHandler);
  }

  /** @internal */
  put(handler: HonoRequestHandler): void;
  /** @internal */
  put(path: string, handler: HonoRequestHandler): void;
  /** @internal */
  put(
    pathOrHandler: string | HonoRequestHandler,
    maybeHandler?: HonoRequestHandler,
  ): void {
    this.#addHandler("put", pathOrHandler, maybeHandler);
  }

  /** @internal */
  delete(handler: HonoRequestHandler): void;
  /** @internal */
  delete(path: string, handler: HonoRequestHandler): void;
  /** @internal */
  delete(
    pathOrHandler: string | HonoRequestHandler,
    maybeHandler?: HonoRequestHandler,
  ): void {
    this.#addHandler("delete", pathOrHandler, maybeHandler);
  }

  /** @internal */
  head(handler: HonoRequestHandler): void;
  /** @internal */
  head(path: string, handler: HonoRequestHandler): void;
  /** @internal */
  head(
    pathOrHandler: string | HonoRequestHandler,
    maybeHandler?: HonoRequestHandler,
  ): void {
    this.#addHandler("head", pathOrHandler, maybeHandler);
  }

  /** @internal */
  options(handler: HonoRequestHandler): void;
  /** @internal */
  options(path: string, handler: HonoRequestHandler): void;
  /** @internal */
  options(
    pathOrHandler: string | HonoRequestHandler,
    maybeHandler?: HonoRequestHandler,
  ): void {
    this.#addHandler("options", pathOrHandler, maybeHandler);
  }

  /** @internal */
  all(path: string, handler: HonoRequestHandler): void;
  /** @internal */
  all(handler: HonoRequestHandler): void;
  /** @internal */
  all(
    pathOrHandler: string | HonoRequestHandler,
    maybeHandler?: HonoRequestHandler,
  ): void {
    this.#addHandler("all", pathOrHandler, maybeHandler);
  }

  /** @internal */
  search(path: string, handler: HonoRequestHandler): void;
  /** @internal */
  search(handler: HonoRequestHandler): void;
  /** @internal */
  search(
    pathOrHandler: string | HonoRequestHandler,
    maybeHandler?: HonoRequestHandler,
  ): void {
    this.#addHandler("search", pathOrHandler, maybeHandler);
  }

  /** @internal */
  createMiddlewareFactory(requestMethod: RequestMethod): MiddlewareFactory {
    const routerMethod = mapRequestMethodToRouterMethod(requestMethod);
    const middlewareFactory = (
      path: string,
      callback: HonoRequestHandler,
    ): void => {
      this.#addMiddleware(routerMethod, path, callback);
    };
    return middlewareFactory as MiddlewareFactory;
  }

  #addMiddleware(
    method: RouterMethod,
    pathOrMiddleware: string | HonoRequestHandler,
    maybeMiddleware: HonoRequestHandler | undefined,
  ): void {
    if (!isAcceptableRouterMethod(method)) {
      throw new NotImplementedError(`\`${method}\` is not acceptable`);
    }
    const [path, middleware] = this.#getPathAndMiddleware(
      pathOrMiddleware,
      maybeMiddleware,
    );
    this.#hono[method](path, middleware);
  }

  #addHandler(
    method: RouterMethod,
    pathOrHandler: string | HonoRequestHandler,
    maybeHandler?: HonoRequestHandler,
  ): void {
    if (!isAcceptableRouterMethod(method)) {
      throw new NotImplementedError(`\`${method}\` is not acceptable`);
    }
    if (typeof pathOrHandler !== "string") {
      throw new NotImplementedError();
    }
    if (maybeHandler == null) {
      throw new NotImplementedError();
    }
    const path = pathOrHandler;
    const handler = maybeHandler;
    async function handlerWrapper(
      c: HonoContext,
      next: HonoNext,
    ): Promise<void | Response> {
      setPropertyToHonoContext(c, kRequestParams, c.req.param());
      await handler(c, c, next);
    }
    this.#hono[method](path, handlerWrapper);
  }

  #getPathAndMiddleware(
    pathOrMiddleware: string | HonoRequestHandler,
    maybeMiddleware?: HonoRequestHandler,
  ): [string, MiddlewareHandler] {
    if (typeof pathOrMiddleware === "function") {
      throw new NotImplementedError("Not supported");
    }
    if (maybeMiddleware == null) {
      throw new NotImplementedError("Not supported");
    }
    return [
      pathOrMiddleware,
      async function middlewareWrapper(c, next) {
        return await maybeMiddleware(c, c, next);
      },
    ];
  }
}

function isAcceptableRouterMethod(
  method: RouterMethod,
): method is Exclude<RouterMethod, "head" | "search"> {
  if (method === "head") {
    return false;
  }
  if (method === "search") {
    return false;
  }
  return true;
}

type RouterMethod =
  | "get"
  | "post"
  | "put"
  | "patch"
  | "delete"
  | "all"
  | "head"
  | "options"
  | "search";
function mapRequestMethodToRouterMethod(method: RequestMethod): RouterMethod {
  switch (method) {
    case RequestMethod.GET:
      return "get";
    case RequestMethod.POST:
      return "post";
    case RequestMethod.PUT:
      return "put";
    case RequestMethod.DELETE:
      return "delete";
    case RequestMethod.PATCH:
      return "patch";
    case RequestMethod.ALL:
      return "all";
    case RequestMethod.OPTIONS:
      return "options";
    case RequestMethod.HEAD:
      return "head";
    case RequestMethod.SEARCH:
      return "search";
  }
}

function setPropertyToHonoContext<TKey extends string>(
  c: HonoContext,
  key: TKey extends keyof HonoContext ? never : TKey,
  value: unknown,
): void {
  // @ts-expect-error This is intended - `key` should not conflict with existing properties
  c[key] = value;
}
