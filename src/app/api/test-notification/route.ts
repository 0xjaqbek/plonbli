import { NextResponse } from "next/server";
import { getMessaging } from "firebase-admin/messaging";
import { db } from "@/shared/db";
import { pushSubscriptions } from "@/shared/db/schema";
import { getFirebaseAdmin } from "@/shared/lib/firebase-admin";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get("secret") !== process.env.TEST_NOTIF_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, unknown> = {};

  // 1. Check env vars
  results.env = {
    FIREBASE_PROJECT_ID: !!process.env.FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL: !!process.env.FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY: !!process.env.FIREBASE_PRIVATE_KEY,
    NEXT_PUBLIC_FIREBASE_VAPID_KEY: !!process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
  };

  // 2. Try initializing Firebase Admin
  try {
    const app = getFirebaseAdmin();
    results.adminInit = { ok: true, appName: app.name };
  } catch (e) {
    results.adminInit = { ok: false, error: String(e) };
    return NextResponse.json(results);
  }

  // 3. Get tokens from DB
  const tokens = await db.select({ fcmToken: pushSubscriptions.fcmToken }).from(pushSubscriptions);
  results.tokens = { count: tokens.length };

  if (tokens.length === 0) {
    return NextResponse.json({ ...results, message: "No tokens in DB" });
  }

  // 4. Try sending a test notification
  try {
    const app = getFirebaseAdmin();
    const response = await getMessaging(app).sendEachForMulticast({
      tokens: tokens.map((t) => t.fcmToken),
      notification: { title: "Test Plonbli 🌱", body: "Powiadomienia działają!" },
      data: { url: "/" },
      webpush: {
        notification: {
          icon: "/plonbliLogoBezTlaKolo-removebg-preview.png",
          badge: "/icons/badge.png",
        },
        fcmOptions: { link: "/" },
      },
    });
    results.send = {
      successCount: response.successCount,
      failureCount: response.failureCount,
      responses: response.responses.map((r) => ({
        success: r.success,
        error: r.error ? { code: r.error.code, message: r.error.message } : null,
      })),
    };
  } catch (e) {
    results.send = { ok: false, error: String(e) };
  }

  return NextResponse.json(results);
}
