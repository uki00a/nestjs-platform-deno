import { OakAdapter } from "@uki00a/nestjs-platform-oak";
import { NestFactory } from "@nestjs/core";
import type { INestApplication } from "@nestjs/common";
import { Controller, Get, Module } from "@nestjs/common";
import { Application } from "@oak/oak";

@Controller("/api")
class ApiController {
  @Get("/greet")
  greet(): string {
    return "Hello Deno!";
  }
}

@Module({
  providers: [],
  controllers: [
    ApiController,
  ],
})
class AppModule {}

export async function createNestApp(): Promise<INestApplication> {
  const app = await NestFactory.create(
    AppModule,
    new OakAdapter(new Application()),
  );
  return app;
}
