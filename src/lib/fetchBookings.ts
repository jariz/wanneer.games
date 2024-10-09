"use server";

interface BookingResponse {
  bookings: Array<{
    status: string;
    startTime: string;
    responses: {
      game: string;
    };
  }>;
}
const fetchBookings = async (after?: Date) => {
  let url = `https://api.cal.com/v1/bookings?apiKey=${process.env.NEXT_CAL_API_KEY}`;
  if (after) {
    url += `&afterStart=${after.toISOString()}`;
  }
  const response = await fetch(url, {
    next: { tags: ["bookings"], revalidate: 600 },
  });
  const body: BookingResponse = await response.json();
  return body.bookings
    .filter((booking) => booking.status === "ACCEPTED")
    .map((booking) => ({
      game: booking.responses.game,
      date: new Date(booking.startTime),
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
};
export default fetchBookings;
