import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

export async function POST() {
  revalidateTag("bookings");
  return new NextResponse(null, { status: 204 });
}
