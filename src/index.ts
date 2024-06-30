import type {
  HttpServer,
  NestApplicationOptions,
  RequestMethod,
} from "@nestjs/common";
import { Logger } from "@nestjs/common";
import type { RequestHandler } from "@nestjs/common/interfaces";
import { AbstractHttpAdapter } from "@nestjs/core";
import { RouterMethodFactory } from "@nestjs/core/helpers/router-method-factory";
import type { Application, RouterContext, RouterMiddleware } from "@oak/oak";
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

type OakContext = RouterContext<string>;
type OakRequestHandler = RequestHandler<OakContext, OakContext>;
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

  get(handler: OakRequestHandler): void;
  get(path: string, handler: OakRequestHandler): void;
  get(
    pathOrHandler: string | OakRequestHandler,
    maybeHandler?: OakRequestHandler,
  ): void {
    const [path, handler] = this.#getPathAndHandler(
      pathOrHandler,
      maybeHandler,
    );
    this.router.get(path, handler);
  }

  #getPathAndHandler(
    pathOrHandler: string | OakRequestHandler,
    maybeHandler?: OakRequestHandler,
  ): [string, RouterMiddleware<string>] {
    if (typeof pathOrHandler === "function") {
      throw new Error("Not supported");
    }
    if (maybeHandler == null) {
      throw new Error("Not supported");
    }
    return [pathOrHandler, (ctx, next) => maybeHandler(ctx, ctx, next)];
  }
}

export class OakAdapter extends AbstractHttpAdapter {
  private readonly logger: Logger;
  private readonly routerMethodFactory = new RouterMethodFactory();
  constructor(instance: Application, {
    logger = new Logger("platform-oak"),
  }: OakAdapterOptions = {}) {
    super(new NestOakInstance(instance, new Router(), logger));
    this.logger = logger;
  }

  override close(): void {
    return this.instance?.close();
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
    _prefix?: string | undefined,
    _rawBody?: boolean | undefined,
  ): void {
  }

  override createMiddlewareFactory(
    requestMethod: RequestMethod,
  ): MiddlewareFactory | Promise<MiddlewareFactory> {
    this.logger.warn(
      "OakAdapter.createMiddlewareFactory is not fully tested yet",
    );
    return this.routerMethodFactory.get(this.instance, requestMethod).bind(
      this.instance,
    );
  }

  override isHeadersSent(ctx: OakContext): boolean {
    return !ctx.response.writable;
  }

  override reply(
    ctx: OakContext,
    body: unknown,
    statusCode?: number | undefined,
  ): void {
    if (statusCode != null) {
      ctx.response.status = statusCode;
    }
    if (body != null) {
      ctx.response.body = body;
    }
  }

  override status(ctx: OakContext, statusCode: number): void {
    ctx.response.status = statusCode;
  }

  #getInstance(): NestOakInstance | undefined {
    return this.instance;
  }
}

type MiddlewareFactory = (
  path: string,
  // deno-lint-ignore ban-types
  callback: Function,
  // deno-lint-ignore no-explicit-any
) => any;
