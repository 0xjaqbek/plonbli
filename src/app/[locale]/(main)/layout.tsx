import { redirect } from "next/navigation";
import { auth } from "@/domains/auth/lib/auth";
import { NavBar } from "@/shared/ui/nav-bar";
import { hasUnreadMessages } from "@/domains/messaging/queries/has-unread-messages";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  const hasUnread = await hasUnreadMessages(session.user!.id!);

  return (
    <div className="min-h-screen bg-background">
      <NavBar hasUnread={hasUnread} />
      <main className="pb-20 md:pb-0">{children}</main>
    </div>
  );
}
