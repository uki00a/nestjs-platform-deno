import { HonoAdapter, JsonBody } from "@uki00a/nestjs-platform-hono";
import { DenoKvModule, InjectKv } from "@uki00a/nestjs-denokv";
import { NestFactory } from "@nestjs/core";
import type {
  ArgumentsHost,
  ExceptionFilter,
  INestApplication,
  MiddlewareConsumer,
  NestMiddleware,
  NestModule,
} from "@nestjs/common";
import {
  All,
  Catch,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpException,
  Inject,
  Injectable,
  Logger,
  Module,
  Options,
  Param,
  Patch,
  Post,
  Put,
  Redirect,
  Req,
  Res,
  UseFilters,
} from "@nestjs/common";
import { Hono } from "@hono/hono";
import type { Context } from "@hono/hono";
import assert from "node:assert/strict";

const kTagService = "TagService";

type HonoStatusCode = Parameters<Context["status"]>[0];

type TagID = string;
interface Tag {
  id: TagID;
  name: string;
}

interface UpdateTagComment {
  id: TagID;
  name: string;
}

interface TagService {
  add(name: string): Promise<Tag>;
  find(id: TagID): Promise<Tag>;
  delete(id: TagID): Promise<void>;
  update(command: UpdateTagComment): Promise<Tag>;
}

@Injectable()
class TagService implements TagService {
  readonly #kv: Deno.Kv;
  constructor(@InjectKv() kv: Deno.Kv) {
    this.#kv = kv;
  }

  async add(name: string): Promise<Tag> {
    const id = crypto.randomUUID();
    const tag: Tag = { id, name };
    await this.#kv.set(["tags", id], tag);
    return Promise.resolve({ ...tag });
  }

  async find(id: string): Promise<Tag> {
    const found = await this.#kv.get<Tag>(["tags", id], {
      consistency: "strong",
    });
    if (found.value == null) {
      throw new HttpException("NotFound", 404);
    }
    return found.value;
  }

  async delete(id: string): Promise<void> {
    await this.#kv.delete(["tags", id]);
  }

  async update(command: UpdateTagComment): Promise<Tag> {
    const { id, ...rest } = command;
    const found = await this.#kv.get<Tag>(["tags", id], {
      consistency: "strong",
    });
    if (found.value == null) {
      throw new HttpException("NotFound", 404);
    }
    const newTag = { ...found.value, ...rest };
    await this.#kv.set(["tags", id], newTag);
    return Promise.resolve({ ...newTag });
  }
}

@Catch(HttpException)
class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const c = ctx.getRequest<Context>();
    const status = exception.getStatus();
    const response = exception.getResponse();
    c.status(status as HonoStatusCode);
    c.res = c.body(
      typeof response === "string" ? response : JSON.stringify(response),
    );
  }
}

@Controller("/api")
class ApiController {
  readonly #tagService: TagService;
  constructor(@Inject(kTagService) tagService: TagService) {
    this.#tagService = tagService;
  }

  /** Tests {@linkcode Req} decorator. */
  @Get("/greet")
  @Header("Cache-Control", "no-cache")
  greet(
    @Req() c: Context,
    @Res() c2: Context,
  ): void {
    assert(
      c === c2,
      "both `@Req()` and `@Res()` should inject the same `Context` object",
    );
    assert.equal(
      typeof c.render,
      "function",
      "`@Req()` should inject Hono's `Context` object",
    );
    assert.equal(new URL(c.req.url).pathname, "/api/greet");
    c.res = c.text("Hello Deno!");
  }

  /** Tests {@linkcode JsonBody} decorator. */
  @Post("/tags")
  createTag(@JsonBody() body: unknown): Promise<Tag> {
    assert(
      typeof body === "object",
      "`@JsonBody()` should inject a body as JSON",
    );
    assert(body != null && "name" in body);
    const name = body.name;
    assert(typeof name === "string");
    return this.#tagService.add(name);
  }

  @Put("/tags/:id")
  putTag(
    @Param("id") id: string,
    @JsonBody() body: unknown,
  ): Promise<Tag> {
    assert(typeof body === "object");
    assert(body != null);
    assert("name" in body);
    const { name } = body;
    assert(typeof name === "string");
    return this.#tagService.update({ id, name });
  }

  @Patch("/tags/:id")
  patchTag(
    @Param("id") id: string,
    @JsonBody() body: unknown,
  ) {
    assert(body != null);
    assert(typeof body === "object");
    assert("name" in body);
    const { name } = body;
    assert(typeof name === "string");
    return this.#tagService.update({ id, name });
  }

  @Get("/tags/:id")
  getTag(@Param("id") id: string): Promise<Tag> {
    return this.#tagService.find(id);
  }

  @Delete("/tags/:id")
  @HttpCode(204)
  deleteTag(@Param("id") id: string): Promise<void> {
    return this.#tagService.delete(id);
  }

  @All("/healthcheck")
  healthcheck(): boolean {
    return true;
  }

  @Options("/options")
  options(): void {}

  @Get("/error")
  @UseFilters(HttpExceptionFilter)
  error(): void {
    throw new HttpException("NG", 500);
  }

  @Get("/redirect")
  @Redirect("/api/greet", 303)
  redirect(): void {}
}

@Injectable()
class SampleMiddleware implements NestMiddleware {
  #logger = new Logger("sample");
  async use(
    c1: Context,
    c2: Context,
    next: (error?: unknown) => void,
  ): Promise<void> {
    assert(
      c1 === c2,
      "a request and response should be instance of Hono's `Context`",
    );
    assert.equal(
      typeof c1.render,
      "function",
      "Hono's `Context` should be injected",
    );
    this.#logger.log(`${c1.req.method} ${c1.req.path}`);
    await next();
    c1.header("x-foo", "bar");
  }
}

@Module({
  providers: [
    {
      provide: kTagService,
      useClass: TagService,
    },
  ],
  imports: [
    DenoKvModule.register(":memory:"),
  ],
  controllers: [
    ApiController,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(SampleMiddleware)
      .forRoutes(ApiController);
  }
}

export async function createNestApp(): Promise<INestApplication> {
  const hono = new Hono();
  const app = await NestFactory.create(
    AppModule,
    HonoAdapter.create(hono),
  );
  return app;
}
