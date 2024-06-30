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
  await app.close();
});
