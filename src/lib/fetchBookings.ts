"use server";

import eventTypeMap from "@/const/eventTypeMap";
import { isAfter, startOfDay } from "date-fns";

interface BookingResponse {
  data: Array<{
    status: string;
    start: string;
    bookingFieldsResponses: {
      game: string;
    };
  }>;
}

const fetchBookings = async (removePastBookings: boolean, group: string) => {
  const url = `https://api.cal.com/v2/bookings?status=upcoming&status=past&take=100&eventTypeId=${eventTypeMap[group]}`;
  console.log(url);
  const response = await fetch(url, {
    next: { tags: ["bookings"], revalidate: 600 },
    method: "GET",
    headers: {
      Authorization: process.env.NEXT_CAL_API_KEY as string,
      "Cal-Api-Version": "2024-08-13",
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch bookings: ${response.statusText}`);
  }
  const body: BookingResponse = await response.json();
  console.log(body)
  const bookings = body.data
    .map((booking) => ({
      game: booking.bookingFieldsResponses.game,
      date: new Date(booking.start),
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  return removePastBookings
    ? bookings.filter((booking) =>
        isAfter(booking.date, startOfDay(new Date())),
      )
    : bookings;
};
export default fetchBookings;
