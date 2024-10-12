import type { INestApplication } from "@nestjs/common";
import type { ServeStaticOptions } from "@hono/hono/serve-static";

/**
 * @internal
 * @see {@linkcode ServeStaticOptions}
 */
type HonoServeStaticOptions = ServeStaticOptions;

/**
 * This type is returned by `NestFactory#create`.
 *
 * @example Usage:
 *
 * ```typescript
 * import { NestFactory } from "@nestjs/core";
 * import type { NestHonoApplication } from "@uki00a/nestjs-platform-hono";
 * import { HonoAdapter } from "@uki00a/nestjs-platform-hono";
 * import { AppModule } from "@/app.module.ts";
 *
 * const app = await NestFactory.create<NestHonoApplication>(
 *   AppModule,
 *   HonoAdapter.create(),
 * );
 * ```
 *
 * @see {@link https://github.com/nestjs/nest/blob/v10.4.4/packages/core/nest-application.ts}
 */
export interface NestHonoApplication<
  TServer = unknown,
> extends INestApplication<TServer> {
  /**
   * Registers static assets under a {@linkcode path}.
   */
  useStaticAssets(path: string, options: HonoServeStaticOptions): this;
}
