"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { ImageLightbox } from "@/shared/ui/image-lightbox";
import type { EventWithDetails } from "../queries/get-events";

interface EventCardProps {
  event: EventWithDetails;
}

const typeKeys: Record<string, string> = {
  MARKET: "typeMarket",
  OPEN_DAY: "typeOpenDay",
  MEETUP: "typeMeetup",
  OTHER: "typeOther",
};

export function EventCard({ event }: EventCardProps) {
  const t = useTranslations("event");

  function formatDate(date: Date) {
    return new Date(date).toLocaleDateString("pl-PL", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <Link href={`/social/events/${event.id}`}>
      <Card className="h-full hover:shadow-md transition-shadow overflow-hidden">
        {event.coverImage && (
          <ImageLightbox images={[event.coverImage]}>
            {(onOpen) => (
              <img
                src={event.coverImage!}
                alt=""
                className="w-full aspect-[3/1] object-cover cursor-pointer"
                onClick={(e) => {
                  e.preventDefault();
                  onOpen(0);
                }}
              />
            )}
          </ImageLightbox>
        )}
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{event.title}</CardTitle>
            <Badge variant="secondary">{t(typeKeys[event.type])}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {event.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {event.description}
            </p>
          )}

          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarDays className="h-3 w-3" />
            <span>{formatDate(event.startDate)}</span>
          </div>

          {event.location && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span className="truncate">{event.location}</span>
            </div>
          )}

          <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {event.goingCount} {t("goingCount")}
            </span>
            <span>
              {event.interestedCount} {t("interestedCount")}
            </span>
          </div>

          {event.groupName && (
            <Badge variant="outline" className="text-[10px]">
              {event.groupName}
            </Badge>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
