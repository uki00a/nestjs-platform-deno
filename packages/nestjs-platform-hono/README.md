# nestjs-platform-hono

NestJS HTTP adapter for [Hono](https://github.com/honojs/hono)🔥

## Installation

```shell
$ deno add jsr:@uki00a/nestjs-platform-hono jsr:@hono/hono npm:@nestjs/common npm:@nestjs/core
```

## Usage

```typescript
import { NestFactory } from "@nestjs/core";
import { HonoAdapter } from "@uki00a/nestjs-platform-hono";
import { AppModule } from "@/app.module.ts";

const app = await NestFactory.create(
  AppModule,
  HonoAdapter.create(),
);
await app.listen(8000);
```

## Limitations

### `@Body()` decorator does not work

If a request body is needed, you should use `@JsonBody()` decorator instead:

```typescript
import { Controller, Post } from "@nestjs/common";
import { JsonBody } from "@uki00a/nestjs-platform-hono";

@Controller("/tags")
export class TagsController {
  @Post()
  createTag(@JsonBody("name") tagName: string) {
    return { name: tagName };
  }
}
```
