"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, Star } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { rsvpEvent } from "../actions/rsvp-event";
import { trackEvent, EVENTS } from "@/domains/analytics";

interface RsvpButtonProps {
  eventId: string;
  currentStatus: string | null;
}

export function RsvpButton({ eventId, currentStatus }: RsvpButtonProps) {
  const t = useTranslations("event");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleRsvp(status: "GOING" | "INTERESTED") {
    startTransition(async () => {
      await rsvpEvent({ eventId, status });
      trackEvent(EVENTS.EVENT_RSVP, { eventId });
      router.refresh();
    });
  }

  return (
    <div className="flex gap-2">
      <Button
        variant={currentStatus === "GOING" ? "default" : "outline"}
        size="sm"
        className={cn("gap-1", currentStatus === "GOING" && "bg-green-600 hover:bg-green-700")}
        onClick={() => handleRsvp("GOING")}
        disabled={isPending}
      >
        <Check className="h-4 w-4" />
        {t("going")}
      </Button>
      <Button
        variant={currentStatus === "INTERESTED" ? "default" : "outline"}
        size="sm"
        className={cn("gap-1", currentStatus === "INTERESTED" && "bg-yellow-600 hover:bg-yellow-700")}
        onClick={() => handleRsvp("INTERESTED")}
        disabled={isPending}
      >
        <Star className="h-4 w-4" />
        {t("interested")}
      </Button>
    </div>
  );
}
