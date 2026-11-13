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

test("requests only the next month and paginates each status separately", async () => {
  const requests = [];
  const future = booking("2099-11-13T20:00:00.000Z");
  const old = booking("2024-10-09T19:00:00Z");
  const fetchBookings = load(async (url) => {
    const params = new URL(url).searchParams;
    requests.push(params);
    assert.equal(params.getAll("status").length, 1);
    const start = new Date(params.get("afterStart"));
    const end = new Date(params.get("beforeEnd"));
    assert.ok(start < new Date());
    assert.ok(end > new Date());
    assert.ok((end - start) / 86400000 >= 28);
    assert.ok((end - start) / 86400000 <= 32);
    assert.equal(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Amsterdam", hour: "2-digit", minute: "2-digit",
      }).format(start),
      "00:00",
    );
    const data = params.get("status") === "upcoming"
      ? [future]
      : params.get("skip") === "0" ? Array(100).fill(old) : [old];
    return { ok: true, json: async () => ({ data }) };
  });
  const exported = await fetchBookings("kiwis");
  assert.equal(exported.length, 102);
  assert.equal(exported.at(-1).date.toISOString(), future.start);
  assert.ok(requests.some((params) => params.get("skip") === "100"));
  assert.equal(new Set(requests.map((params) => params.get("afterStart"))).size, 1);
  assert.equal(new Set(requests.map((params) => params.get("beforeEnd"))).size, 1);
});

test("Cal failures are not silently shown as an empty calendar", async () => {
  const fetchBookings = load(async () => ({
    ok: false, status: 401, statusText: "Unauthorized",
  }));
  await assert.rejects(fetchBookings("kiwis"), /401 Unauthorized/);
});

test("calendar export fetches all history without date bounds and paginates", async () => {
  const requests = [];
  const fetchBookings = load(async (url) => {
    const params = new URL(url).searchParams;
    requests.push(params);
    assert.equal(params.has("afterStart"), false);
    assert.equal(params.has("beforeEnd"), false);
    const data = params.get("status") === "past"
      ? Array(params.get("skip") === "0" ? 100 : 1)
        .fill(booking("2024-10-09T19:00:00Z"))
      : [booking("2099-11-13T20:00:00Z")];
    return { ok: true, json: async () => ({ data }) };
  });
  const bookings = await fetchBookings("kiwis", true);
  assert.equal(bookings.length, 102);
  assert.ok(requests.some((params) => params.get("skip") === "100"));
  assert.equal(bookings[0].date.getUTCFullYear(), 2024);
  assert.equal(bookings.at(-1).date.getUTCFullYear(), 2099);
});
