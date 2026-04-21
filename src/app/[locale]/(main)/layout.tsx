import { redirect } from "next/navigation";
import { auth } from "@/domains/auth/lib/auth";
import { NavBar } from "@/shared/ui/nav-bar";
import { hasUnreadMessages } from "@/domains/messaging/queries/has-unread-messages";
import { hasUnseenOrderChanges } from "@/domains/orders/queries/has-unseen-order-changes";
import { PushPermissionPrompt } from "@/domains/notifications/components/push-permission-prompt";
import { ForegroundMessageHandler } from "@/domains/notifications/components/foreground-message-handler";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  const [hasUnread, hasUnseenOrders] = await Promise.all([
    hasUnreadMessages(session.user!.id!),
    hasUnseenOrderChanges(session.user!.id!),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <NavBar hasUnread={hasUnread} hasUnseenOrders={hasUnseenOrders} />
      <main className="pb-20 md:pb-0">{children}</main>
      <PushPermissionPrompt />
      <ForegroundMessageHandler />
    </div>
  );
}
