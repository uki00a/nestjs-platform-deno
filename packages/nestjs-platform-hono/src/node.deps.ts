export type {
  Context,
  ErrorHandler,
  MiddlewareHandler,
  Next,
  NotFoundHandler,
} from "hono";
export { Hono } from "hono";
export { cors } from "hono/cors";
export { serveStatic } from "@hono/node-server/serve-static";
export type { ServeStaticOptions } from "@hono/hono/serve-static";
