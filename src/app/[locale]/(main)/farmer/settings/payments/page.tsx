import { redirect } from "next/navigation";
import { auth } from "@/domains/auth/lib/auth";
import { getFarmerPaymentMethods } from "@/domains/orders/queries/get-farmer-payment-methods";
import { PaymentMethodsForm } from "@/domains/orders/components/farmer-dashboard/payment-methods-form";
import { getTranslations } from "next-intl/server";

export default async function PaymentMethodsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const t = await getTranslations("orders");
  const methods = await getFarmerPaymentMethods(session.user.id);

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">{t("paymentMethods")}</h1>
      <PaymentMethodsForm methods={methods} />
    </div>
  );
}
