"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Calendar } from "@/shared/ui/calendar";
import { Badge } from "@/shared/ui/badge";
import type { EventWithDetails } from "../queries/get-events";

interface EventCalendarProps {
  events: EventWithDetails[];
}

export function EventCalendar({ events }: EventCalendarProps) {
  const t = useTranslations("event");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const eventDates = new Map<string, EventWithDetails[]>();
  for (const event of events) {
    const key = new Date(event.startDate).toDateString();
    const existing = eventDates.get(key) ?? [];
    existing.push(event);
    eventDates.set(key, existing);
  }

  const datesWithEvents = [...eventDates.keys()].map((d) => new Date(d));

  const selectedDateEvents = selectedDate
    ? eventDates.get(selectedDate.toDateString()) ?? []
    : [];

  return (
    <div className="space-y-4">
      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={setSelectedDate}
        modifiers={{ hasEvent: datesWithEvents }}
        modifiersClassNames={{
          hasEvent: "bg-primary/20 font-bold",
        }}
        className="rounded-md border mx-auto"
      />

      {selectedDate && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">
            {selectedDate.toLocaleDateString("pl-PL", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </h3>
          {selectedDateEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noEvents")}</p>
          ) : (
            <div className="space-y-2">
              {selectedDateEvents.map((event) => (
                <Link
                  key={event.id}
                  href={`/social/events/${event.id}`}
                  className="block border rounded-md p-3 hover:bg-accent transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{event.title}</span>
                    <Badge variant="secondary" className="text-[10px]">
                      {t(typeKeys[event.type])}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(event.startDate).toLocaleTimeString("pl-PL", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {event.location && ` · ${event.location}`}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const typeKeys: Record<string, string> = {
  MARKET: "typeMarket",
  OPEN_DAY: "typeOpenDay",
  MEETUP: "typeMeetup",
  OTHER: "typeOther",
};
