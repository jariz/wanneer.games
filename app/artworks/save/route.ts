import { writeFile, rename, unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { revalidatePath } from "next/cache";
import { artworkSelectionSchema } from "@/lib/artwork-curation";

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") return new Response(null, { status: 404 });
  const origin = request.headers.get("origin");
  const host = request.headers.get("host") ?? new URL(request.url).host;
  // Next's dev request URL uses localhost even when the browser connects over LAN.
  if (!origin || ![`http://${host}`, `https://${host}`].includes(origin)) {
    return Response.json({ error: "Save from the curator on this server." }, { status: 403 });
  }
  const parsed = artworkSelectionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid artwork selection." }, { status: 400 });
  const path = join(process.cwd(), "lib/artwork-selection.json");
  const temporary = `${path}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, JSON.stringify(parsed.data, null, 2) + "\n", "utf8");
    await rename(temporary, path);
    revalidatePath("/", "layout");
    return Response.json({ ok: true });
  } catch {
    await unlink(temporary).catch(() => {});
    return Response.json({ error: "Could not save the selection. Try again or export it instead." }, { status: 500 });
  }
}
