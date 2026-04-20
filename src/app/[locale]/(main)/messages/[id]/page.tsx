import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { eq, and, ne } from "drizzle-orm";
import { db } from "@/shared/db";
import {
  conversations,
  conversationMembers,
  users,
  orders,
  listings,
} from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";
import { getMessages } from "@/domains/messaging/queries/get-messages";
import { getConversations } from "@/domains/messaging/queries/get-conversations";
import { ChatView } from "@/domains/messaging/components/chat-view";
import { ConversationList } from "@/domains/messaging/components/conversation-list";
import { Button } from "@/shared/ui/button";
import { ArrowLeft, Package, Tag } from "lucide-react";
import Link from "next/link";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = await getTranslations("messaging");
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { id } = await params;

  // Verify membership
  const membership = await db.query.conversationMembers.findFirst({
    where: and(
      eq(conversationMembers.conversationId, id),
      eq(conversationMembers.userId, session.user.id)
    ),
  });

  if (!membership) {
    notFound();
  }

  const conversation = await db.query.conversations.findFirst({
    where: eq(conversations.id, id),
  });

  if (!conversation) {
    notFound();
  }

  // Get other members for header
  const otherMembers = await db
    .select({
      id: users.id,
      name: users.name,
      avatar: users.avatar,
      role: users.role,
    })
    .from(conversationMembers)
    .innerJoin(users, eq(conversationMembers.userId, users.id))
    .where(
      and(
        eq(conversationMembers.conversationId, id),
        ne(conversationMembers.userId, session.user.id)
      )
    );

  const displayName =
    conversation.type === "DIRECT"
      ? otherMembers[0]?.name ?? t("directConversation")
      : conversation.name ?? t("groupConversation");

  // Fetch context data if conversation is linked to an order or listing
  type ContextData =
    | { type: "ORDER"; label: string; href: string }
    | { type: "LISTING"; label: string; href: string }
    | null;

  let contextData: ContextData = null;

  if (conversation.orderId) {
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, conversation.orderId),
      columns: { orderNumber: true, customerId: true },
    });
    if (order) {
      const isCustomerView = order.customerId === session.user.id;
      contextData = {
        type: "ORDER",
        label: `#${order.orderNumber}`,
        href: isCustomerView
          ? `/orders/${conversation.orderId}`
          : `/farmer/orders/${conversation.orderId}`,
      };
    }
  } else if (conversation.listingId) {
    const listing = await db.query.listings.findFirst({
      where: eq(listings.id, conversation.listingId),
      with: { product: { columns: { name: true } } },
      columns: {},
    });
    if (listing) {
      contextData = {
        type: "LISTING",
        label: listing.product.name,
        href: `/marketplace/${conversation.listingId}`,
      };
    }
  }

  const { messages } = await getMessages(id);

  // For desktop split view
  const allConversations = await getConversations(session.user.id);
  const allUsers = await db
    .select({ id: users.id, name: users.name, avatar: users.avatar })
    .from(users)
    .where(ne(users.id, session.user.id));

  return (
    <div className="max-w-6xl mx-auto h-[calc(100dvh-6.6rem)] md:h-[calc(100vh-4rem)] flex">
      {/* Desktop sidebar */}
      <div className="hidden md:block w-80 border-r">
        <ConversationList
          initialConversations={allConversations}
          currentUserId={session.user.id}
          activeConversationId={id}
          users={allUsers}
        />
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        <div className="border-b p-1 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            asChild
          >
            <Link href="/messages">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <p className="font-medium">{displayName}</p>
            {conversation.type === "GROUP" && (
              <p className="text-xs text-muted-foreground">
                {otherMembers.length + 1} {t("membersCount")}
              </p>
            )}
            {contextData && (
              <Link
                href={contextData.href}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                {contextData.type === "ORDER" ? (
                  <Package className="h-3 w-3" />
                ) : (
                  <Tag className="h-3 w-3" />
                )}
                {contextData.label}
              </Link>
            )}
          </div>
        </div>

        <ChatView
          conversationId={id}
          currentUserId={session.user.id}
          initialMessages={messages}
          recipientRole={otherMembers[0]?.role?.toLowerCase()}
        />
      </div>
    </div>
  );
}
