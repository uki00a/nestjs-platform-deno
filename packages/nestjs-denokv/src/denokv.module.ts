import type { DynamicModule, OnModuleDestroy } from "@nestjs/common";
import { Module } from "@nestjs/common";
// TODO: add support for Deno Queue using `DiscoveryModule`
// import { DiscoveryModule, DiscoveryService } from "@nestjs/core";
import { DenoKvRef } from "./denokv.constants.ts";
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
/**
 * This module provides functions related to Deno KV, such as injecting {@linkcode Deno.Kv} instance.
 */
@Module({
  exports: [DenoKvRef],
  providers: [
    {
      provide: DenoKvRef,
      useFactory: () => Deno.openKv(),
    },
  ],
})
export class DenoKvModule implements OnModuleDestroy {
  readonly #kv: Deno.Kv;
  /** @internal */
  constructor(@InjectKv() kv: Deno.Kv) {
    this.#kv = kv;
  }

  /**
   * Customize the URL or path to the Deno KV database.
   * @param path A path or URL passed to {@linkcode Deno.openKv}.
   */
  static register(path: string): DynamicModule;
  /**
   * @see {@linkcode DenoKvModuleOptions}
   */
  static register(options: DenoKvModuleOptions): DynamicModule;
  /**
   * Customize the behavior of {@linkcode DenoKvModule} based on `path` or `options`.
   */
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
          provide: DenoKvRef,
          useFactory: () => {
            return Deno.openKv(path);
          },
        },
      ],
    };
  }

  /** @internal */
  onModuleDestroy(): void {
    return this.#kv.close();
  }
}
