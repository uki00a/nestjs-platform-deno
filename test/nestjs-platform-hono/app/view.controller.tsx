import { Html } from "@uki00a/nestjs-platform-hono";
import { Controller, Get } from "@nestjs/common";

@Controller("/")
export class ViewController {
  @Html()
  @Get("/")
  home() {
    return (
      <html>
        <body>
          <div>{"Hello hono/jsx!"}</div>
        </body>
      </html>
    );
  }
}
