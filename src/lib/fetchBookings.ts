"use server";

import { isAfter, startOfDay } from "date-fns";

interface BookingResponse {
  bookings: Array<{
    status: string;
    startTime: string;
    responses: {
      game: string;
    };
  }>;
}
const fetchBookings = async (removePastBookings: boolean, group: string) => {
  const url = `https://api.cal.com/v1/bookings?apiKey=${process.env.NEXT_CAL_API_KEY}`;
  const response = await fetch(url, {
    next: { tags: ["bookings"], revalidate: 600 },
  });
  const body: BookingResponse = await response.json();
  const bookings = body.bookings
    .filter((booking) => booking.status === "ACCEPTED")
    .map((booking) => ({
      game: booking.responses.game,
      date: new Date(booking.startTime),
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  return removePastBookings
    ? bookings.filter((booking) =>
        isAfter(booking.date, startOfDay(new Date())),
      )
    : bookings;
};
export default fetchBookings;
