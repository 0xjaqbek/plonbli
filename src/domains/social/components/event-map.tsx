"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import type { EventWithDetails } from "../queries/get-events";

interface EventMapProps {
  events: EventWithDetails[];
}

const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false }
);

const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false }
);

const Marker = dynamic(
  () => import("react-leaflet").then((m) => m.Marker),
  { ssr: false }
);

const Popup = dynamic(
  () => import("react-leaflet").then((m) => m.Popup),
  { ssr: false }
);

const typeKeys: Record<string, string> = {
  MARKET: "typeMarket",
  OPEN_DAY: "typeOpenDay",
  MEETUP: "typeMeetup",
  OTHER: "typeOther",
};

export function EventMap({ events }: EventMapProps) {
  const t = useTranslations("event");

  const geoEvents = useMemo(
    () =>
      events.filter(
        (e) => e.latitude && e.longitude
      ),
    [events]
  );

  if (geoEvents.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] border rounded-md">
        <p className="text-sm text-muted-foreground">{t("noEvents")}</p>
      </div>
    );
  }

  const centerLat =
    geoEvents.reduce((sum, e) => sum + parseFloat(e.latitude!), 0) /
    geoEvents.length;
  const centerLng =
    geoEvents.reduce((sum, e) => sum + parseFloat(e.longitude!), 0) /
    geoEvents.length;

  return (
    <div className="h-[400px] rounded-md overflow-hidden border">
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={8}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {geoEvents.map((event) => (
          <Marker
            key={event.id}
            position={[
              parseFloat(event.latitude!),
              parseFloat(event.longitude!),
            ]}
          >
            <Popup>
              <div className="space-y-1">
                <a
                  href={`/social/events/${event.id}`}
                  className="font-medium text-sm hover:underline"
                >
                  {event.title}
                </a>
                <p className="text-xs text-muted-foreground">
                  {t(typeKeys[event.type])}
                </p>
                <p className="text-xs">
                  {new Date(event.startDate).toLocaleDateString("pl-PL", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                {event.location && (
                  <p className="text-xs text-muted-foreground">
                    {event.location}
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
