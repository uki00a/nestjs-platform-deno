import type { DynamicModule, OnModuleDestroy } from "@nestjs/common";
import { Module } from "@nestjs/common";
// TODO: add support for Deno Queue using `DiscoveryModule`
// import { DiscoveryModule, DiscoveryService } from "@nestjs/core";
import { kDenoKv } from "./denokv.constants.ts";
import { InjectKv } from "./denokv.decorator.ts";

/**
 * Options for {@linkcode DenoKvModule}.
 */
export interface DenoKvModuleOptions {
  /**
   * If `true`, a returned module is globally scoped.
   * @default {false}
   */
  global?: boolean;
  /**
   * A path or URL passed to {@linkcode Deno.openKv}.
   *
   * @defalt {undefined}
   */
  path?: string;
}

// TODO: implement `DenoKvModule.registerAsync()`
@Module({
  exports: [kDenoKv],
})
export class DenoKvModule implements OnModuleDestroy {
  readonly #kv: Deno.Kv;
  constructor(@InjectKv() kv: Deno.Kv) {
    this.#kv = kv;
  }

  static register(pathOrOptions?: string | DenoKvModuleOptions): DynamicModule {
    const {
      path,
      global = false,
    } = typeof pathOrOptions === "string"
      ? { path: pathOrOptions } satisfies DenoKvModuleOptions
      : pathOrOptions ?? {};
    return {
      global,
      module: DenoKvModule,
      providers: [
        {
          provide: kDenoKv,
          useFactory: () => {
            return Deno.openKv(path);
          },
        },
      ],
    };
  }

  onModuleDestroy(): void {
    return this.#kv.close();
  }
}
