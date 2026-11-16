"use client";

import { Calendar, CalendarDay, CalendarGrid, CalendarHeading, CalendarNext, CalendarPrevious, CalendarWeekday, CalendarWeekdays, CalendarWeeks } from "@ui-sdk/react/calendar";
import { Radio, RadioGroup } from "@ui-sdk/react/radio";
import { ChevronLeft, ChevronRight, Clock3, LoaderCircle, RefreshCw } from "lucide-react";
import { amsterdam, dateLabel, formatDate } from "@/lib/session-display";
import { Alert } from "./ui/alert";
import { Button, buttonVariants } from "./ui/button";
import { Card } from "./ui/card";
import StepHeading from "./step-heading";

type SlotPickerProps = {
  month: string; onMonthChange: (month: string) => void;
  day: string | null; onDayChange: (day: string | null) => void;
  time: string | null; onTimeChange: (time: string | null) => void;
  slots: string[]; loading: boolean; error: string | null; onRetry: () => void;
  disabled: boolean; today: string; maxDate: string;
};

function MonthCalendar({ month, onMonthChange, day, onDayChange, availableDays, disabled, today, maxDate }: Pick<SlotPickerProps, "month" | "onMonthChange" | "day" | "onDayChange" | "disabled" | "today" | "maxDate"> & {
  availableDays: Set<string>;
}) {
  const navButton = buttonVariants({ variant: "ghost", size: "icon" });
  return (
    <Calendar
      aria-label="Kies een speeldag"
      value={day}
      onValueChange={(value) => onDayChange(typeof value === "string" ? value : null)}
      month={month}
      onMonthChange={onMonthChange}
      min={today}
      max={maxDate}
      today={today}
      timeZone={amsterdam}
      locale="nl-NL"
      weekStartsOn={1}
      weekdayFormat="short"
      fixedWeeks
      unavailable={(date) => !availableDays.has(date)}
      disabled={disabled}
    >
      <div className="mb-5 flex items-center justify-between gap-1">
        <CalendarHeading className="text-sm font-semibold capitalize" />
        <div className="flex gap-1">
          <CalendarPrevious className={navButton} aria-label="Vorige maand"><ChevronLeft size={17} /></CalendarPrevious>
          <CalendarNext className={navButton} aria-label="Volgende maand"><ChevronRight size={17} /></CalendarNext>
        </div>
      </div>
      <CalendarGrid className="w-full table-fixed border-separate border-spacing-x-1 border-spacing-y-[7px]">
        <CalendarWeekdays>{(index) => <CalendarWeekday className="pb-2.5 font-mono text-[8px] font-normal uppercase text-quiet" index={index} />}</CalendarWeekdays>
        <CalendarWeeks>
          {(cell) => (
            <CalendarDay className="glass-control group h-11 cursor-pointer rounded-md border border-glass-edge text-center text-xs transition-colors hover:border-brand hover:bg-white/10 data-[disabled]:cursor-default data-[unavailable]:cursor-default data-[disabled]:border-transparent data-[unavailable]:border-transparent data-[disabled]:bg-transparent data-[unavailable]:bg-transparent data-[disabled]:text-quiet/60 data-[unavailable]:text-quiet/60 data-[outside]:opacity-40 data-[selected]:bg-brand data-[selected]:font-semibold data-[selected]:text-canvas phone:h-12 desktop:h-11 wide:h-[52px]" value={cell.date}>
              {(state) => (
                <span className="flex flex-col items-center gap-[3px] py-1">
                  {state.label}
                  <span className="size-[5px] rounded-full border border-transparent bg-brand group-data-[disabled]:invisible group-data-[unavailable]:invisible group-data-[selected]:bg-canvas group-data-[today]:visible group-data-[today]:border-brand group-data-[today]:bg-transparent group-data-[selected]:group-data-[today]:border-canvas group-data-[selected]:group-data-[today]:bg-transparent" />
                </span>
              )}
            </CalendarDay>
          )}
        </CalendarWeeks>
      </CalendarGrid>
    </Calendar>
  );
}

function TimeSlots({ day, slots, time, onTimeChange, disabled }: { day: string | null; slots: string[]; time: string | null; onTimeChange: (time: string | null) => void; disabled: boolean }) {
  return (
    // Beside the calendar, size containment keeps a long day from stretching the card: the column takes the calendar's height and scrolls.
    <div className="flex flex-col border-t border-glass-edge p-5 phone:border-l phone:border-t-0 phone:px-3 phone:pb-[18px] phone:pt-6 phone:[contain:size]">
      <h3 className="mb-4 text-[10px] font-medium">{day ? formatDate(`${day}T12:00:00Z`, { weekday: "short", day: "numeric", month: "short" }) : "Kies eerst een dag"}</h3>
      {day && slots.length > 0 ? (
        <RadioGroup aria-label="Kies een starttijd" value={time} onValueChange={onTimeChange} disabled={disabled} className="grid max-h-60 min-h-0 flex-1 grid-cols-3 content-start gap-2 overflow-y-auto p-0.5 [scrollbar-color:rgb(var(--control))_transparent] [scrollbar-width:thin] phone:max-h-none phone:grid-cols-1">
          {slots.map((slot) => (
            <Radio key={slot} value={slot} aria-label={dateLabel(slot, "HH:mm")} className="glass-control group flex min-h-10 w-full items-center justify-center gap-2.5 rounded-md border border-glass-edge text-xs tabular-nums transition-colors hover:border-brand hover:bg-white/10 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40 data-[checked]:bg-brand data-[checked]:font-semibold data-[checked]:text-canvas">
              <span>{dateLabel(slot, "HH:mm")}</span>
            </Radio>
          ))}
        </RadioGroup>
      ) : (
        <div className="flex min-h-[120px] flex-1 flex-col items-center justify-center gap-3 text-center text-quiet phone:min-h-[300px]">
          <Clock3 size={30} strokeWidth={1} />
          <span className="text-[8px] leading-relaxed">De beschikbare tijden verschijnen hier.</span>
        </div>
      )}
    </div>
  );
}

export default function SlotPicker({ slots, loading, error, onRetry, time, onTimeChange, ...calendar }: SlotPickerProps) {
  const availableDays = new Set(slots.map((slot) => dateLabel(slot, "yyyy-MM-dd")));
  const daySlots = slots.filter((slot) => dateLabel(slot, "yyyy-MM-dd") === calendar.day);

  return (
    <Card render={<section />} aria-labelledby="pick-date-heading">
      <StepHeading className="border-b border-glass-edge p-5 phone:p-6" step="01" id="pick-date-heading" title="Datum en tijd" description="Kies een beschikbaar moment." />
      <div className="grid grid-cols-1 phone:grid-cols-[minmax(0,1fr)_170px] desktop:grid-cols-[minmax(0,1fr)_135px] wide:grid-cols-[minmax(0,1fr)_160px]">
        <div className="min-w-0 px-3 py-5 phone:px-5 phone:py-6 wide:p-7">
          <MonthCalendar {...calendar} disabled={calendar.disabled || loading} availableDays={availableDays} />
          <div className="mt-5 flex items-center gap-4 border-t border-glass-edge pt-4 text-[8px] text-quiet">
            <span className="flex items-center gap-1.5"><i className="size-[5px] rounded-full bg-brand" />Beschikbaar</span>
            <span className="flex items-center gap-1.5"><i className="size-[5px] rounded-full border border-brand" />Vandaag</span>
          </div>
          {loading && <p className="mt-3.5 flex items-center gap-2 text-[10px] text-quiet" role="status"><LoaderCircle size={15} className="animate-spin" />Beschikbaarheid ophalen…</p>}
          {error && (
            <Alert variant="destructive" className="mt-3.5">
              <p>{error}</p>
              <Button variant="link" size="none" onClick={onRetry}><RefreshCw size={14} />Probeer opnieuw</Button>
            </Alert>
          )}
          {!loading && !error && availableDays.size === 0 && <Alert className="mt-3.5">Deze maand is vol. Probeer de volgende maand.</Alert>}
        </div>
        <TimeSlots day={calendar.day} slots={daySlots} time={time} onTimeChange={onTimeChange} disabled={calendar.disabled} />
      </div>
    </Card>
  );
}
