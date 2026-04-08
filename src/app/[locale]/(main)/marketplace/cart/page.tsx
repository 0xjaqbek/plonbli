import { redirect } from "next/navigation";
import { auth } from "@/domains/auth/lib/auth";
import { getCart } from "@/domains/orders/queries/get-cart";
import { CartView } from "@/domains/orders/components/cart/cart-view";
import { getTranslations } from "next-intl/server";

export default async function CartPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const t = await getTranslations("orders");
  const groups = await getCart(session.user.id);

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">{t("cart")}</h1>
      <CartView groups={groups} />
    </div>
  );
}
