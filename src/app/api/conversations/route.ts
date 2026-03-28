import { NextResponse } from "next/server";
import { auth } from "@/domains/auth/lib/auth";
import { getConversations } from "@/domains/messaging/queries/get-conversations";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const conversations = await getConversations(session.user.id);

  return NextResponse.json({ conversations });
}
