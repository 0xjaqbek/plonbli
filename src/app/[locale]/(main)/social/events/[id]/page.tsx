import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import {
  CalendarDays,
  MapPin,
  Users,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { auth } from "@/domains/auth/lib/auth";
import { Badge } from "@/shared/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import { getEvent } from "@/domains/social/queries/get-event";
import { RsvpButton } from "@/domains/social/components/rsvp-button";
import { DeleteEventButton } from "./delete-button";

const typeKeys: Record<string, string> = {
  MARKET: "typeMarket",
  OPEN_DAY: "typeOpenDay",
  MEETUP: "typeMeetup",
  OTHER: "typeOther",
};

const recurrenceKeys: Record<string, string> = {
  WEEKLY: "recurrenceWeekly",
  BIWEEKLY: "recurrenceBiweekly",
  MONTHLY: "recurrenceMonthly",
};

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("event");
  const session = await auth();
  const event = await getEvent(id, session?.user?.id);

  if (!event) {
    notFound();
  }

  const isCreator = session?.user?.id === event.creator.id;

  function formatDate(date: Date) {
    return new Date(date).toLocaleDateString("pl-PL", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const creatorInitials = event.creator.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="max-w-2xl mx-auto py-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{event.title}</h1>
          <Badge variant="secondary" className="mt-2">
            {t(typeKeys[event.type])}
          </Badge>
          {event.groupName && (
            <Badge variant="outline" className="ml-2 mt-2">
              {event.groupName}
            </Badge>
          )}
        </div>
        {isCreator && <DeleteEventButton eventId={event.id} />}
      </div>

      {event.description && (
        <p className="text-sm whitespace-pre-wrap">{event.description}</p>
      )}

      <div className="space-y-3 border rounded-lg p-4">
        <div className="flex items-center gap-2 text-sm">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <div>
            <p>{formatDate(event.startDate)}</p>
            <p className="text-muted-foreground">
              — {formatDate(event.endDate)}
            </p>
          </div>
        </div>

        {event.recurrence && (
          <div className="flex items-center gap-2 text-sm">
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
            <span>{t(recurrenceKeys[event.recurrence])}</span>
          </div>
        )}

        {event.location && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{event.location}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Link
          href={`/social/users/${event.creator.id}`}
          className="flex items-center gap-2"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={event.creator.avatar ?? undefined} />
            <AvatarFallback>{creatorInitials}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">{event.creator.name}</p>
            <p className="text-xs text-muted-foreground">{t("organizer")}</p>
          </div>
        </Link>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            {event.goingCount} {t("goingCount")}
          </span>
          <span>
            {event.interestedCount} {t("interestedCount")}
          </span>
        </div>

        {session?.user?.id && (
          <RsvpButton
            eventId={event.id}
            currentStatus={event.currentUserRsvp}
          />
        )}
      </div>

      {event.attendees.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">{t("attendees")}</h2>
          <div className="space-y-2">
            {event.attendees.map((attendee) => {
              const initials = attendee.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();

              return (
                <Link
                  key={attendee.id}
                  href={`/social/users/${attendee.id}`}
                  className="flex items-center gap-2 p-2 rounded-md hover:bg-accent"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={attendee.avatar ?? undefined} />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{attendee.name}</span>
                  <Badge variant="outline" className="ml-auto text-[10px]">
                    {attendee.status === "GOING"
                      ? t("going")
                      : t("interested")}
                  </Badge>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
