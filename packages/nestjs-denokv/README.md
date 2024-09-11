# nestjs-denokv

A NestJS module for [Deno KV](https://github.com/denoland/denokv).

## Installation

```shell
$ deno add @uki00a/nestjs-denokv
```

## Usage

Setup `DenoKvModule`:

```typescript
import { DenoKvModule } from "@uki00a/nestjs-denokv";
import { Module } from "@nestjs/common";

@Module({
  imports: [
    DenoKvModule.register(),
  ],
})
export class AppModule {
}
```

You can inject `Deno.Kv` as follows:

```typescript
import { DenoKvModule } from "@uki00a/nestjs-denokv";
import { Injectable } from "@nestjs/common";

@Injectable()
export class UserService {
  readonly #kv: Deno.Kv;
  constructor(@InjectKv() kv: Deno.Kv) {
    this.#kv = kv;
  }
}
```
