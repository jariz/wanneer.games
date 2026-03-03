import eventTypeMap from "./eventTypeMap.ts";

interface CreateBookingParams {
  group: string;
  start: Date;
  game?: string;
}

const createBooking = async ({
  group,
  start,
  game,
}: CreateBookingParams): Promise<void> => {
  const eventTypeId = eventTypeMap[group];

  if (eventTypeId === undefined) {
    throw new Error(`Unknown group: "${group}"`);
  }

  const response = await fetch("https://api.cal.com/v2/bookings", {
    method: "POST",
    headers: {
      Authorization: process.env.NEXT_CAL_API_KEY as string,
      "Cal-Api-Version": "2024-08-13",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      eventTypeId,
      start: start.toISOString(),
      attendee: {
        name: "Gaming Bot",
        email: "games@wanneer.games",
        timeZone: "Europe/Amsterdam",
        language: "nl",
      },
      ...(game && { bookingFieldsResponses: { game } }),
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to create booking: ${response.statusText} — ${body}`);
  }
};

export default createBooking;
