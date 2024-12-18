import type { INestApplication } from "@nestjs/common";
import type { ServeStaticOptions } from "./deno.deps.ts";

/**
 * @internal
 * @see {@linkcode ServeStaticOptions}
 */
export interface HonoServeStaticOptions extends ServeStaticOptions {
  /**
   * A path prefix under which static assets are served.
   */
  prefix?: string;
}

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
   * Registers static assets.
   */
  useStaticAssets(options: HonoServeStaticOptions): this;
}
