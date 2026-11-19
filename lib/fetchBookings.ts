"use server";

import { env } from "@/env";
import eventTypeMap from "@/shared/eventTypeMap";
import { amsterdam } from "./session-display";
import { addMonths, startOfDay } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

interface BookingResponse {
  data: Array<{
    uid?: string;
    status: string;
    start: string;
    metadata?: { igdbGameId?: string };
    bookingFieldsResponses: {
      game: string;
    };
  }>;
}

const SESSION_LENGTH_MS = 5 * 60 * 60_000;

const fetchBookings = async (group: string, allBookings = false) => {
  const today = startOfDay(toZonedTime(new Date(), amsterdam));
  const afterStart = fromZonedTime(today, amsterdam).toISOString();
  const beforeEnd = fromZonedTime(addMonths(today, 1), amsterdam).toISOString();
  const fetchStatus = async (status: "upcoming" | "past") => {
    const data: BookingResponse["data"] = [];
    const take = 100;
    let skip = 0;

    while (true) {
      const params = new URLSearchParams({
        status,
        take: String(take),
        skip: String(skip),
        eventTypeId: String(eventTypeMap[group]),
      });
      if (!allBookings) {
        params.set("afterStart", afterStart);
        params.set("beforeEnd", beforeEnd);
      }
      const response = await fetch(`https://api.cal.com/v2/bookings?${params}`, {
        next: { tags: ["bookings"], revalidate: 600 },
        headers: {
          Authorization: env.NEXT_CAL_API_KEY,
          "Cal-Api-Version": "2024-08-13",
        },
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch bookings: ${response.status} ${response.statusText}`);
      }
      const body: BookingResponse = await response.json();
      data.push(...body.data);
      if (body.data.length < take) break;
      skip += take;
    }
    return data;
  };

  // Fetch statuses separately: past sessions must never crowd out upcoming ones.
  const pages = await Promise.all([fetchStatus("upcoming"), fetchStatus("past")]);
  const bookings = pages.flat()
    .map((booking) => ({
      id: booking.uid ?? booking.start,
      igdbGameId: booking.metadata?.igdbGameId ? Number(booking.metadata.igdbGameId) : undefined,
      game: booking.bookingFieldsResponses.game,
      date: new Date(booking.start),
      // Cal's booked length doesn't reflect real sessions; assume five hours.
      end: new Date(new Date(booking.start).getTime() + SESSION_LENGTH_MS),
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  return bookings;
};
export default fetchBookings;
