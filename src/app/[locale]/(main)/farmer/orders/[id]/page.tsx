import { redirect, notFound } from "next/navigation";
import { auth } from "@/domains/auth/lib/auth";
import { getOrder } from "@/domains/orders/queries/get-order";
import { FarmerOrderDetail } from "@/domains/orders/components/farmer-dashboard/farmer-order-detail";

export default async function FarmerOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const order = await getOrder(id);

  if (!order) notFound();
  if (order.farmerId !== session.user.id) notFound();

  return (
    <div className="max-w-2xl mx-auto p-4">
      <FarmerOrderDetail order={order} />
    </div>
  );
}
