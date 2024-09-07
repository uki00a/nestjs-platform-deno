# nestjs-platform-oak

## Usage

```typescript
import { NestFactory } from "@nestjs/core";
import { Application } from "@oak/oak";
import { OakAdapter } from "@uki00a/nestjs-platform-oak";
import AppModule from "@/app.module.ts";

const app = await NestFactory.create(
  AppModule,
  OakAdapter.create(new Application()),
);
await app.listen(3000);
```

## Limitations

### `@Body()` decorator with `key` parameter does not work

If you specify `key` parameter to the `@Body()` decorator as shown below, it
will not work as intended:

```typescript
import { Body, Post } from "@nestjs/common";
import type { Request } from "@oak/oak";

@Controller("/tags")
export class TagsController {
  @Post()
  createTag(@Body("name") tagName: string) {
    return { name: tagName };
  }
}
```

This is because Oak's `Request.body` is not a plain object. In this case you
should use `@JsonBody()` decorator instead:

```typescript
import { Post } from "@nestjs/common";
import { JsonBody } from "@uki00a/nestjs-platform-oak";
import type { Request } from "@oak/oak";

@Controller("/tags")
export class TagsController {
  @Post()
  createTag(@JsonBody("name") tagName: string) {
    return { name: tagName };
  }
}
```
