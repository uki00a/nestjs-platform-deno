import type { DynamicModule, OnModuleDestroy } from "@nestjs/common";
import { Module } from "@nestjs/common";
// TODO: add support for Deno Queue using `DiscoveryModule`
// import { DiscoveryModule, DiscoveryService } from "@nestjs/core";
import { kDenoKv } from "./denokv.constants.ts";
import { InjectKv } from "./denokv.decorator.ts";

// TODO: implement `DenoKvModule.registerAsync()`
@Module({
  exports: [kDenoKv],
})
export class DenoKvModule implements OnModuleDestroy {
  readonly #kv: Deno.Kv;
  constructor(@InjectKv() kv: Deno.Kv) {
    this.#kv = kv;
  }

  static register(path?: string): DynamicModule {
    return {
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

  onModuleDestroy() {
    return this.#kv.close();
  }
}
