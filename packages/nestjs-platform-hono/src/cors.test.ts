import type { Context } from "@hono/hono";
import assert from "node:assert/strict";
import { toHonoCorsOptions, toHonoOriginOption } from "./cors.ts";

Deno.test({
  name: "toHonoCorsOptions",
  fn: async (t) => {
    await t.step("basic behavior", () => {
      const expected = {
        origin: "*",
        allowHeaders: ["X-Foo", "X-Bar"],
        allowMethods: ["GET", "POST", "DELETE", "PUT"],
        exposeHeaders: ["X-Foo", "X-Bar", "X-Baz"],
        credentials: true,
        maxAge: 600,
      };
      const actual = toHonoCorsOptions(
        {
          origin: true,
          allowedHeaders: "X-Foo,X-Bar",
          methods: "GET,POST,DELETE,PUT",
          exposedHeaders: "X-Foo,X-Bar,X-Baz",
          credentials: true,
          maxAge: 600,
        },
      );
      assert.deepEqual(actual, expected);
    });

    await t.step("properly handles missing options", () => {
      const expected = {
        origin: "https://example.com",
      };
      const actual = toHonoCorsOptions(
        {
          origin: "https://example.com",
        },
      );
      assert.deepEqual(actual, expected);
    });
  },
  permissions: "none",
});

Deno.test({
  name: "toHonoOriginOption",
  fn: async (t) => {
    await t.step("returns a given string as-is", () => {
      const expected = "https://example.com";
      const actual = toHonoOriginOption("https://example.com");
      assert.equal(actual, expected);
    });

    await t.step("returns a given array of strings as-is", () => {
      const expected = ["https://test.com", "https://example.com"];
      const actual = toHonoOriginOption([...expected]);
      assert.deepEqual(actual, expected);
    });

    await t.step(
      "returns a function if a given array contains a RegExp object",
      () => {
        const fn = toHonoOriginOption([
          /test.com$/,
          "https://example.net",
        ]);
        assert(typeof fn === "function", "A function should be returned");
        // @ts-expect-error This is intended
        const c: Context = {};
        assert.equal(fn("http://test.com", c), "http://test.com");
        assert.equal(fn("https://example.net", c), "https://example.net");
        assert.equal(fn("https://foo.com", c), null);
      },
    );

    await t.step(
      "returns a function that always returns `null` if `false` is given",
      () => {
        const fn = toHonoOriginOption(false);
        assert(typeof fn === "function", "A function should be returned");
        // @ts-expect-error This is intended
        const c: Context = {};
        assert.equal(fn("https://example.com", c), null);
      },
    );

    await t.step("returns `'*'` if `true` is given", () => {
      const expected = "*";
      const actual = toHonoOriginOption(true);
      assert.strictEqual(actual, expected);
    });
  },
  permissions: "none",
});
