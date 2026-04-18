import { redirect } from "next/navigation";
import { ne } from "drizzle-orm";
import { db } from "@/shared/db";
import { users } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";
import { getConversations } from "@/domains/messaging/queries/get-conversations";
import { ConversationList } from "@/domains/messaging/components/conversation-list";

export default async function MessagesPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const conversations = await getConversations(session.user.id);

  // Get all users for new conversation dialog (exclude self)
  const allUsers = await db
    .select({
      id: users.id,
      name: users.name,
      avatar: users.avatar,
    })
    .from(users)
    .where(ne(users.id, session.user.id));

  return (
    <div className="max-w-4xl mx-auto h-[calc(100dvh-6.6rem)] md:h-[calc(100vh-4rem)]">
      <ConversationList
        initialConversations={conversations}
        currentUserId={session.user.id}
        users={allUsers}
      />
    </div>
  );
}
