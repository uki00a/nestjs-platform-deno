import type { INestApplication } from "@nestjs/common";
import type { ServeStaticOptions } from "@hono/hono/serve-static";

/**
 * {@link https://github.com/nestjs/nest/blob/v10.4.4/packages/core/nest-application.ts}
 */
export interface NestHonoApplication<
  TServer = unknown,
> extends INestApplication<TServer> {
  /**
   * Registers static assets under a {@linkcode path}.
   */
  useStaticAssets(path: string, options?: ServeStaticOptions): this;
}
