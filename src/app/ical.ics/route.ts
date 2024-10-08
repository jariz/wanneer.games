import { NextResponse } from "next/server";
import { createEvents, EventAttributes } from "ics";
import fetchBookings from "@/lib/fetchBookings";

export async function GET() {
  try {
    // Fetch bookings from Cal.com API
    const bookings = await fetchBookings();

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
        duration: { hours: 1 }, // Adjust this based on your booking duration
        title: `Game sessie: ${booking.game ?? "onbekend"}`,
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
