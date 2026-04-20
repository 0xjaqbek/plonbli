import { redirect } from "next/navigation";
import { auth } from "@/domains/auth/lib/auth";
import { getFarmerOrders } from "@/domains/orders/queries/get-farmer-orders";
import { getCustomerOrders } from "@/domains/orders/queries/get-customer-orders";
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

  const [farmerResults, customerResults] = await Promise.all([
    getFarmerOrders(session.user.id, {
      status: params.status,
      page: params.page ? Number(params.page) : 1,
    }),
    getCustomerOrders(session.user.id, {
      status: params.status,
      page: params.page ? Number(params.page) : 1,
    }),
  ]);

  const farmerOrders = farmerResults.map(({ order, customer }) => ({
    order: { ...order, status: order.status as OrderStatus, hasUnseenChanges: !order.farmerHasSeen },
    counterparty: customer,
  }));

  const customerOrders = customerResults.map(({ order, farmer }) => ({
    order: { ...order, status: order.status as OrderStatus, hasUnseenChanges: !order.customerHasSeen },
    counterparty: farmer,
  }));

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-6">{t("farmerOrders")}</h1>
        <OrderList orders={farmerOrders} basePath="/farmer/orders" />
      </div>

      <div>
        <h2 className="text-xl font-bold mb-4">{t("myPurchases")}</h2>
        <OrderList orders={customerOrders} basePath="/orders" />
      </div>
    </div>
  );
}
