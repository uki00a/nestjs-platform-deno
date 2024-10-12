import { createNestApp } from "./app/mod.ts";
import assert from "node:assert/strict";

Deno.test("e2e", async (t) => {
  const app = await createNestApp();
  const port = 3001;
  await app.listen(port);
  await t.step("`GET /api/greet`", async () => {
    const res = await fetch(`http://localhost:${port}/api/greet`);
    assert.equal(await res.text(), "Hello Deno!");
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("x-foo"), "bar");
    assert.equal(res.headers.get("cache-control"), "no-cache");
  });

  await t.step("/api/healthcheck", async () => {
    {
      const res = await fetch(`http://localhost:${port}/api/healthcheck`);
      assert(res.ok);
      assert.equal(await res.json(), true);
      assert.equal(res.headers.get("x-foo"), "bar");
    }

    {
      const res = await fetch(`http://localhost:${port}/api/healthcheck`, {
        method: "POST",
      });
      assert(res.ok);
      assert.equal(await res.json(), true);
      assert.equal(res.headers.get("x-foo"), "bar");
    }
  });

  await t.step(
    "`POST /api/tags`, `GET /api/tags/:id`, `PUT /api/tags/:id`, `PATCH /api/tags/:id` and `DELETE /api/tags/:id`",
    async () => {
      const name = "foo";
      // POST /api/tags
      const res = await fetch(`http://localhost:${port}/api/tags`, {
        method: "POST",
        body: JSON.stringify({ name }),
        headers: {
          "content-type": "application/json",
        },
      });
      const body = await res.json();
      assert.equal(typeof body, "object");
      assert.ok(body);
      assert.equal(body.name, name);
      assert.ok(body.id);

      {
        // GET /api/tags/:id
        const res = await fetch(`http://localhost:${port}/api/tags/${body.id}`);
        assert(res.ok);
        const found = await res.json();
        assert.ok(found);
        assert.equal(found.name, name);
        assert.equal(found.id, body.id);
        assert.equal(res.headers.get("x-foo"), "bar");
      }

      {
        // PUT /api/tags/:id
        const name = "bar";
        const res = await fetch(
          `http://localhost:${port}/api/tags/${body.id}`,
          {
            method: "PUT",
            body: JSON.stringify({ name }),
            headers: {
              "content-type": "application/json",
            },
          },
        );
        assert(res.ok);
        const result = await res.json();
        assert.ok(result);
        assert.equal(result.id, body.id);
        assert.equal(result.name, name);
        assert.equal(res.headers.get("x-foo"), "bar");
      }

      {
        // PATCH /api/tags/:id
        const name = "baz";
        const res = await fetch(
          `http://localhost:${port}/api/tags/${body.id}`,
          {
            method: "PATCH",
            body: JSON.stringify({ name }),
            headers: {
              "content-type": "application/json",
            },
          },
        );
        assert(res.ok);
        const result = await res.json();
        assert.ok(result);
        assert.equal(result.id, body.id);
        assert.equal(result.name, name);
        assert.equal(res.headers.get("x-foo"), "bar");
      }

      {
        // DELETE /api/tags/:id
        const res = await fetch(
          `http://localhost:${port}/api/tags/${body.id}`,
          {
            method: "DELETE",
          },
        );
        assert.equal(res.status, 204);
        assert.equal(res.headers.get("x-foo"), "bar");
      }
    },
  );

  await t.step("GET `/api/redirect`", async () => {
    const res = await fetch(`http://localhost:${port}/api/redirect`, {
      redirect: "manual",
    });
    assert.equal(res.status, 303);
    assert.equal(res.headers.get("location"), "/api/greet");
    const _ = await res.text();
  });

  await t.step("404", async () => {
    const res = await fetch(`http://localhost:${port}/api/no_such_route`);
    const _text = await res.text();
    assert.equal(res.status, 404);
  });

  await t.step("GET `/api/error`", async () => {
    const res = await fetch(`http://localhost:${port}/api/error`);
    assert.equal(res.status, 500);
    assert.equal(await res.text(), "NG");
  });

  await t.step("GET `/README`", async () => {
    // Tests `HonoAdapter#useStaticAssets`
    const res = await fetch(`http://localhost:${port}/README`);
    assert.equal(res.status, 200);
    const content = await res.text();
    assert.match(content, /nestjs-platform-hono/);
  });

  await app.close();
});
