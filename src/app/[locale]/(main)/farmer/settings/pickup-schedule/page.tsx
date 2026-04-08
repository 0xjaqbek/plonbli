import { redirect } from "next/navigation";
import { auth } from "@/domains/auth/lib/auth";
import { getGlobalPickupSlots } from "@/domains/orders/queries/get-pickup-slots";
import { PickupScheduleForm } from "@/domains/orders/components/farmer-dashboard/pickup-schedule-form";
import { getTranslations } from "next-intl/server";

export default async function PickupSchedulePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const t = await getTranslations("orders");
  const slots = await getGlobalPickupSlots(session.user.id);

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">{t("pickupSchedule")}</h1>
      <PickupScheduleForm slots={slots} />
    </div>
  );
}
