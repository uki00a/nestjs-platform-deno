import type { INestApplication } from "@nestjs/common";
import type { OakStaticAssetsOptions } from "./static-assets.middleware.ts";

/**
 * This type is returned by `NestFactory#create`.
 *
 * @example Usage:
 *
 * ```typescript
 * import { NestFactory } from "@nestjs/core";
 * import type { NestOakApplication } from "@uki00a/nestjs-platform-oak";
 * import { OakAdapter } from "@uki00a/nestjs-platform-oak";
 * import { AppModule } from "@/app.module.ts";
 *
 * const app = await NestFactory.create<NestOakApplication>(
 *   AppModule,
 *   OakAdapter.create(),
 * );
 * ```
 *
 * @see {@link https://github.com/nestjs/nest/blob/v10.4.4/packages/core/nest-application.ts}
 */
export interface NestOakApplication<
  TServer = unknown,
> extends INestApplication<TServer> {
  /**
   * Configures static assets to be served.
   */
  useStaticAssets(options: OakStaticAssetsOptions): this;
}
