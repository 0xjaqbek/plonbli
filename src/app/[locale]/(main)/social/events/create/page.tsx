import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/domains/auth/lib/auth";
import { EventForm } from "@/domains/social/components/event-form";

export default async function CreateEventPage() {
  const t = await getTranslations("event");
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <div className="max-w-lg mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">{t("createEvent")}</h1>
      <EventForm />
    </div>
  );
}
