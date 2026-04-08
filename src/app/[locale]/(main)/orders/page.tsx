import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/domains/auth/lib/auth";
import { db } from "@/shared/db";
import { users } from "@/shared/db/schema";
import { getCustomerOrders } from "@/domains/orders/queries/get-customer-orders";
import { OrderList } from "@/domains/orders/components/order-list/order-list";
import { getTranslations } from "next-intl/server";
import type { OrderStatus } from "@/domains/orders/types";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: { role: true },
  });

  if (user?.role === "FARMER" || user?.role === "BOTH") {
    redirect("/farmer/orders");
  }

  const t = await getTranslations("orders");
  const params = await searchParams;

  const results = await getCustomerOrders(session.user.id, {
    status: params.status,
    page: params.page ? Number(params.page) : 1,
  });

  const orders = results.map(({ order, farmer }) => ({
    order: { ...order, status: order.status as OrderStatus },
    counterparty: farmer,
  }));

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">{t("title")}</h1>
      <OrderList orders={orders} basePath="/orders" />
    </div>
  );
}
