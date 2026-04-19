import { redirect } from "next/navigation";
import { auth } from "@/domains/auth/lib/auth";
import { getFarmerOrders } from "@/domains/orders/queries/get-farmer-orders";
import { OrderList } from "@/domains/orders/components/order-list/order-list";
import { getTranslations } from "next-intl/server";
import type { OrderStatus } from "@/domains/orders/types";

export default async function FarmerOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const t = await getTranslations("orders");
  const params = await searchParams;

  const results = await getFarmerOrders(session.user.id, {
    status: params.status,
    page: params.page ? Number(params.page) : 1,
  });

  const orders = results.map(({ order, customer }) => ({
    order: { ...order, status: order.status as OrderStatus, hasUnseenChanges: !order.farmerHasSeen },
    counterparty: customer,
  }));

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">{t("farmerOrders")}</h1>
      <OrderList orders={orders} basePath="/farmer/orders" />
    </div>
  );
}
