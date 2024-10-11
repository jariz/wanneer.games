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
const fetchBookings = async () => {
  const url = `https://api.cal.com/v1/bookings?apiKey=${process.env.NEXT_CAL_API_KEY}`;
  const response = await fetch(url, {
    next: { tags: ["bookings"], revalidate: 600 },
  });
  const body: BookingResponse = await response.json();
  return body.bookings
    .filter((booking) => isAfter(new Date(booking.startTime), startOfDay(new Date())))
    .filter((booking) => booking.status === "ACCEPTED")
    .map((booking) => ({
      game: booking.responses.game,
      date: new Date(booking.startTime),
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
};
export default fetchBookings;
