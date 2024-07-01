import { OakAdapter } from "@uki00a/nestjs-platform-oak";
import { NestFactory } from "@nestjs/core";
import type { INestApplication } from "@nestjs/common";
import {
  Body,
  Controller,
  Get,
  Inject,
  Injectable,
  Module,
  Post,
} from "@nestjs/common";
import type { Request } from "@oak/oak";
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

@Controller("/api")
class ApiController {
  readonly #tagService: TagService;
  constructor(@Inject(kTagService) tagService: TagService) {
    this.#tagService = tagService;
  }

  @Get("/greet")
  greet(): string {
    return "Hello Deno!";
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
class AppModule {}

export async function createNestApp(): Promise<INestApplication> {
  const app = await NestFactory.create(
    AppModule,
    OakAdapter.create(),
  );
  return app;
}
