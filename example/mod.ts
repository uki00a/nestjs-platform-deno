import { JsonBody, OakAdapter } from "@uki00a/nestjs-platform-oak";
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
  Body,
  Catch,
  Controller,
  Delete,
  Get,
  Head,
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
import { Application } from "@oak/oak";
import type { Request, Response } from "@oak/oak";
import assert from "node:assert/strict";

const kTagService = "TagService";

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
class InMemoryTagService implements TagService {
  readonly #tagByID: Record<TagID, Tag> = {};
  add(name: string): Promise<Tag> {
    const id = crypto.randomUUID();
    const tag: Tag = { id, name };
    this.#tagByID[id] = tag;
    return Promise.resolve({ ...tag });
  }

  find(id: string): Promise<Tag> {
    return Promise.resolve(this.#tagByID[id]);
  }

  delete(id: string): Promise<void> {
    delete this.#tagByID[id];
    return Promise.resolve();
  }

  update(command: UpdateTagComment): Promise<Tag> {
    const { id, ...rest } = command;
    const tag = this.#tagByID[id];
    const newTag = { ...tag, ...rest };
    this.#tagByID[id] = newTag;
    return Promise.resolve({ ...newTag });
  }
}

@Catch(HttpException)
class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    response.status = exception.getStatus();
    response.body = exception.getResponse();
  }
}

@Controller("/api")
class ApiController {
  readonly #tagService: TagService;
  constructor(@Inject(kTagService) tagService: TagService) {
    this.#tagService = tagService;
  }

  @Get("/greet")
  @Header("Cache-Control", "no-cache")
  greet(
    @Req() request: Request,
    @Res() response: Response,
  ): void {
    assert.equal(request.url.pathname, "/api/greet");
    assert.ok(response.writable);
    response.body = "Hello Deno!";
  }

  @Post("/tags")
  async createTag(@Body() body: Request["body"]): Promise<Tag> {
    assert.ok(body);
    assert.ok(body.has);
    assert.equal(body.type(), "json");
    assert(!body.used);
    const parsed = await body.json();
    assert.ok(parsed);
    const name = parsed.name;
    assert.ok(name);
    return this.#tagService.add(name);
  }

  @Put("/tags/:id")
  async putTag(
    @Param("id") id: string,
    @Body() body: Request["body"],
  ): Promise<Tag> {
    assert.ok(body);
    assert.ok(body.has);
    assert.equal(body.type(), "json");
    assert(!body.used);
    const parsed = await body.json();
    assert.ok(parsed);
    return this.#tagService.update({ id, ...parsed });
  }

  @Patch("/tags/:id")
  async patchTag(
    @Param("id") id: string,
    @Body() body: Request["body"],
  ) {
    assert.ok(body);
    assert.ok(body.has);
    assert.equal(body.type(), "json");
    assert(!body.used);
    const parsed = await body.json();
    assert.ok(parsed);
    return this.#tagService.update({ id, ...parsed });
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

  @Post("/json_body")
  @HttpCode(200)
  jsonBody(@JsonBody() body: unknown): unknown {
    return body;
  }

  @Post("/json_body_with_key")
  @HttpCode(200)
  jsonBodyWithKey(@JsonBody("nested") nested: unknown): unknown {
    return nested;
  }

  @All("/healthcheck")
  healthcheck(): boolean {
    return true;
  }

  @Head("/head")
  head(): void {}

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
  use(req: Request, res: Response, next: (error?: unknown) => void): void {
    assert(
      req.headers instanceof Headers,
      "`req` should be instance of `Request`",
    );
    this.#logger.log(`${req.method} ${req.url.pathname}`);
    res.headers.set("x-foo", "bar");
    next();
  }
}

@Module({
  providers: [
    {
      provide: kTagService,
      useValue: new InMemoryTagService(),
    },
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
  const app = await NestFactory.create(
    AppModule,
    OakAdapter.create(new Application()),
  );
  return app;
}
