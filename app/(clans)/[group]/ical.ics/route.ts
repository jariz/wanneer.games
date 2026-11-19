import { NextRequest, NextResponse } from "next/server";
import { createEvents, DateArray, EventAttributes } from "ics";
import fetchBookings from "@/lib/fetchBookings";

const getEmoji = (group: string) => {
  switch (group) {
    case "kiwis":
      return "🥝";
    case "niglos":
      return "🦔";
  }
};

const toDateArray = (date: Date): DateArray => [
  date.getUTCFullYear(),
  date.getUTCMonth() + 1, // Months are 0-indexed in JS
  date.getUTCDate(),
  date.getUTCHours(),
  date.getUTCMinutes(),
];

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ group: string }> },
) {
  try {
    const { group } = await params;
    // Fetch bookings from Cal.com API
    const bookings = await fetchBookings(group, true);

    // Map bookings to iCalendar event format
    const events = bookings.map(
      (booking): EventAttributes => ({
        start: toDateArray(booking.date),
        startInputType: "utc",
        end: toDateArray(booking.end),
        endInputType: "utc",
        title: `${getEmoji(group)} ${booking.game?.trim() || "Gamesessie"}`,
        // A personal address here makes subscribers' calendars treat the events as that person's own.
        organizer: { name: "wanneer.games", email: "games@wanneer.games" },
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
      { error: error instanceof Error ? error.message : "Onbekende fout" },
      { status: 500 },
    );
  }
}
