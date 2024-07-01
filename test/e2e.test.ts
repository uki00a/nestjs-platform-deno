import { createNestApp } from "../example/mod.ts";
import assert from "node:assert/strict";

Deno.test("e2e", async (t) => {
  const app = await createNestApp();
  await app.listen(3000);
  await t.step("GET /api/greet", async () => {
    const res = await fetch("http://localhost:3000/api/greet");
    assert.equal(await res.text(), "Hello Deno!");
    assert.equal(res.status, 200);
  });
  await t.step("POST /api/tags", async () => {
    const name = "foo";
    const res = await fetch("http://localhost:3000/api/tags", {
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
  });
  await app.close();
});
