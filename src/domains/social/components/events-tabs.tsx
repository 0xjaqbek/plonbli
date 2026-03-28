"use client";

import { useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { EventCard } from "./event-card";
import { EventCalendar } from "./event-calendar";
import { EventMap } from "./event-map";
import type { EventWithDetails } from "../queries/get-events";

interface EventsTabsProps {
  events: EventWithDetails[];
}

export function EventsTabs({ events }: EventsTabsProps) {
  const t = useTranslations("event");

  return (
    <Tabs defaultValue="list">
      <TabsList>
        <TabsTrigger value="list">{t("listView")}</TabsTrigger>
        <TabsTrigger value="calendar">{t("calendarView")}</TabsTrigger>
        <TabsTrigger value="map">{t("mapView")}</TabsTrigger>
      </TabsList>

      <TabsContent value="list" className="mt-4">
        {events.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            {t("noEvents")}
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="calendar" className="mt-4">
        <EventCalendar events={events} />
      </TabsContent>

      <TabsContent value="map" className="mt-4">
        <EventMap events={events} />
      </TabsContent>
    </Tabs>
  );
}
