import { eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { pushSubscriptions } from "@/shared/db/schema";
import { getFirebaseAdmin } from "@/shared/lib/firebase-admin";
import { getUserTokens } from "../queries/get-user-tokens";
import { getNotificationPreferences } from "../queries/get-notification-preferences";
import type { NotificationPayload } from "./notification-types";

const INVALID_TOKEN_CODES = [
  "messaging/invalid-registration-token",
  "messaging/registration-token-not-registered",
];

export async function sendNotification(
  recipientUserId: string,
  payload: NotificationPayload
): Promise<void> {
  try {
    const [tokens, prefs] = await Promise.all([
      getUserTokens(recipientUserId),
      getNotificationPreferences(recipientUserId),
    ]);

    if (tokens.length === 0) return;
    if (!prefs[payload.category]) return;

    const admin = getFirebaseAdmin();
    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: { title: payload.title, body: payload.body },
      data: { url: payload.url },
      webpush: {
        notification: {
          icon: "/plonbliLogoBezTlaKolo-removebg-preview.png",
          badge: "/icons/badge.png",
        },
        fcmOptions: { link: payload.url },
      },
    });

    for (let i = 0; i < response.responses.length; i++) {
      const resp = response.responses[i];
      if (
        !resp.success &&
        resp.error &&
        INVALID_TOKEN_CODES.includes(resp.error.code)
      ) {
        await db
          .delete(pushSubscriptions)
          .where(eq(pushSubscriptions.fcmToken, tokens[i]));
      }
    }
  } catch (error) {
    console.error("[sendNotification] error:", error);
  }
}
