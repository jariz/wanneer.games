import { afterEach, expect, test, vi } from "vitest";
vi.mock("node:fs/promises", () => ({ writeFile: vi.fn(), rename: vi.fn(), unlink: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { writeFile, rename } from "node:fs/promises";
import { revalidatePath } from "next/cache";
import { POST } from "@/app/artworks/save/route";

const selection = { version: 1, games: [{ id: 1, name: "Example", artworkIds: ["ar1"] }] };
function request(body: unknown = selection, origin = "http://localhost:3000") {
  return new Request("http://localhost:3000/artworks/save", { method: "POST", headers: { origin }, body: JSON.stringify(body) });
}

afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

test("production never writes files", async () => {
  vi.stubEnv("NODE_ENV", "production");
  expect((await POST(request())).status).toBe(404);
  expect(writeFile).not.toHaveBeenCalled();
});

test("dev save validates the origin and image IDs", async () => {
  vi.stubEnv("NODE_ENV", "development");
  expect((await POST(request(selection, "https://elsewhere.example"))).status).toBe(403);
  expect((await POST(request({ version: 1, games: [{ id: 1, name: "Bad", artworkIds: ["../bad"] }] }))).status).toBe(400);
  expect(writeFile).not.toHaveBeenCalled();
});

test("dev save writes validated JSON atomically and refreshes the app", async () => {
  vi.stubEnv("NODE_ENV", "development");
  expect((await POST(request())).status).toBe(200);
  expect(writeFile).toHaveBeenCalledWith(expect.stringContaining("artwork-selection.json."), JSON.stringify(selection, null, 2) + "\n", "utf8");
  expect(rename).toHaveBeenCalledWith(expect.any(String), expect.stringContaining("/lib/artwork-selection.json"));
  expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
});

test.each(["jari.computer:3000", "192.168.1.10:3000"])("dev save accepts the incoming LAN host %s", async (host) => {
  vi.stubEnv("NODE_ENV", "development");
  const incoming = request(selection, `http://${host}`);
  incoming.headers.set("host", host);
  expect((await POST(incoming)).status).toBe(200);
  expect(writeFile).toHaveBeenCalledOnce();
});

test("LAN requests still reject an unrelated origin", async () => {
  vi.stubEnv("NODE_ENV", "development");
  const incoming = request(selection, "https://elsewhere.example");
  incoming.headers.set("host", "jari.computer:3000");
  expect((await POST(incoming)).status).toBe(403);
  expect(writeFile).not.toHaveBeenCalled();
});
