import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = ts.transpileModule(
  readFileSync(new URL("./fetchBookings.ts", import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText;

function load(fetch) {
  const loaded = { exports: {} };
  const mockedRequire = (id) => {
    if (id === "@/env") return { env: { NEXT_CAL_API_KEY: "test" } };
    if (id === "@/shared/eventTypeMap") return { default: { kiwis: 1236792 } };
    return require(id);
  };
  new Function("require", "module", "exports", "fetch", source)(
    mockedRequire, loaded, loaded.exports, fetch,
  );
  return loaded.exports.default;
}

const booking = (start) => ({
  status: "accepted", start, bookingFieldsResponses: { game: "Test" },
});

test("upcoming sessions survive more than 100 past bookings; export paginates", async () => {
  const requests = [];
  const future = booking("2099-11-13T20:00:00.000Z");
  const old = booking("2024-10-09T19:00:00Z");
  const fetchBookings = load(async (url) => {
    const params = new URL(url).searchParams;
    requests.push(params);
    assert.equal(params.getAll("status").length, 1);
    const data = params.get("status") === "upcoming"
      ? [future]
      : params.get("skip") === "0" ? Array(100).fill(old) : [old];
    return { ok: true, json: async () => ({ data }) };
  });
  const exported = await fetchBookings(false, "kiwis");
  assert.equal(exported.length, 102);
  assert.equal(exported.at(-1).date.toISOString(), future.start);
  assert.ok(requests.some((params) => params.get("skip") === "100"));
  requests.length = 0;
  const upcoming = await fetchBookings(true, "kiwis");
  assert.equal(upcoming.length, 1);
  assert.equal(upcoming[0].date.toISOString(), future.start);
  assert.ok(requests.every((params) => params.has("afterStart")));
});

test("Cal failures are not silently shown as an empty calendar", async () => {
  const fetchBookings = load(async () => ({
    ok: false, status: 401, statusText: "Unauthorized",
  }));
  await assert.rejects(fetchBookings(true, "kiwis"), /401 Unauthorized/);
});
