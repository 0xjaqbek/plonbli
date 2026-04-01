import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Plus } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { getEvents } from "@/domains/social/queries/get-events";
import { EventsTabs } from "@/domains/social/components/events-tabs";

export default async function EventsPage() {
  const t = await getTranslations("event");
  const events = await getEvents({ upcoming: true });

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("events")}</h1>
        <Button asChild size="sm">
          <Link href="/social/events/create">
            <Plus className="h-4 w-4 mr-1" />
            {t("createEvent")}
          </Link>
        </Button>
      </div>

      <EventsTabs events={events} />
    </div>
  );
}
