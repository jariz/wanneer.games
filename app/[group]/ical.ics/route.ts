import { NextRequest, NextResponse } from "next/server";
import { createEvents, EventAttributes } from "ics";
import fetchBookings from "@/lib/fetchBookings";

const getEmoji = (group: string) => {
  switch (group) {
    case "kiwis":
      return "🥝";
    case "niglos":
      return "🦔";
  }
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ group: string }> },
) {
  try {
    const { group } = await params;
    // Fetch bookings from Cal.com API
    const bookings = await fetchBookings(false, group);

    // Map bookings to iCalendar event format
    const events = bookings.map(
      (booking): EventAttributes => ({
        start: [
          new Date(booking.date).getUTCFullYear(),
          new Date(booking.date).getUTCMonth() + 1, // Months are 0-indexed in JS
          new Date(booking.date).getUTCDate(),
          new Date(booking.date).getUTCHours(),
          new Date(booking.date).getUTCMinutes(),
        ],
        startInputType: "utc",
        duration: { hours: 3 },
        title: `${getEmoji(group)} Gaming sessie: ${booking.game ?? "onbekend"}`,
        organizer: { name: "wanneer.games", email: "jarizw+wanneer@gmail.com" },
      }),
    );

    // Generate the .ics file
    const { error, value } = createEvents(events);

    if (error) {
      throw new Error("Failed to create ICS file");
    }

    // Return the .ics file as a response
    return new NextResponse(value, {
      headers: {
        "Content-Type": "text/calendar",
        "Content-Disposition": 'attachment; filename="bookings.ics"',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "???" },
      { status: 500 },
    );
  }
}
