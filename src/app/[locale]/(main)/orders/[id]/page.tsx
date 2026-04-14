import { redirect, notFound } from "next/navigation";
import { auth } from "@/domains/auth/lib/auth";
import { getOrder } from "@/domains/orders/queries/get-order";
import { markOrderSeen } from "@/domains/orders/actions/mark-order-seen";
import { OrderDetail } from "@/domains/orders/components/order-detail/order-detail";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const order = await getOrder(id);

  if (!order) notFound();
  if (order.customerId !== session.user.id && order.farmerId !== session.user.id) notFound();

  await markOrderSeen(id);

  return (
    <div className="max-w-2xl mx-auto p-4">
      <OrderDetail order={order} isCustomer={order.customerId === session.user.id} />
    </div>
  );
}
