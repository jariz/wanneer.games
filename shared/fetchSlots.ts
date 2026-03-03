import eventTypeMap from "./eventTypeMap.ts";
import { addDays } from "date-fns";

interface SlotsResponse {
  status: string;
  data: {
    slots: Record<string, Array<{ time: string }>>;
  };
}

const fetchSlots = async (group: string): Promise<Date[]> => {
  const eventTypeId = eventTypeMap[group];
  if (eventTypeId === undefined) {
    throw new Error(`Unknown group: "${group}"`);
  }
  const start = new Date();
  const end = addDays(start, 10);

  const url = `https://api.cal.com/v2/slots/available?eventTypeId=${eventTypeId}&startTime=${start.toISOString()}&endTime=${end.toISOString()}`;

  const response = await fetch(url, {
    headers: {
      Authorization: process.env.NEXT_CAL_API_KEY as string,
      "Cal-Api-Version": "2024-08-13",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch slots: ${response.statusText}`);
  }

  const body: SlotsResponse = await response.json();

  return Object.values(body.data.slots)
    .flat()
    .map((slot) => new Date(slot.time))
    .sort((a, b) => a.getTime() - b.getTime());
};

export default fetchSlots;
