import { redirect, notFound } from "next/navigation";
import { auth } from "@/domains/auth/lib/auth";
import { getCart } from "@/domains/orders/queries/get-cart";
import { getGlobalPickupSlots } from "@/domains/orders/queries/get-pickup-slots";
import { CheckoutForm } from "@/domains/orders/components/checkout/checkout-form";
import { getTranslations } from "next-intl/server";

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ farmerId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { farmerId } = await params;
  const t = await getTranslations("orders");
  const groups = await getCart(session.user.id);
  const cartGroup = groups.find((g) => g.farmer.id === farmerId);

  if (!cartGroup) notFound();

  const pickupSlots = await getGlobalPickupSlots(farmerId);

  const allDeliveryOptions = cartGroup.items.flatMap(
    (item) => item.listing.deliveryOptions ?? []
  );
  const availableMethods =
    allDeliveryOptions.length > 0
      ? [...new Set(allDeliveryOptions.map((o) => o.type))]
      : ["DELIVERY", "PICKUP"];

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">{t("checkout")}</h1>
      <CheckoutForm
        cartGroup={cartGroup}
        farmerId={farmerId}
        pickupSlots={pickupSlots}
        availableDeliveryMethods={availableMethods}
      />
    </div>
  );
}
