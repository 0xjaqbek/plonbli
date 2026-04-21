import admin from "firebase-admin";
import type { App } from "firebase-admin/app";

let firebaseAdminApp: App | undefined;

export function getFirebaseAdmin(): App {
  if (firebaseAdminApp) return firebaseAdminApp;

  if (admin.apps.length > 0) {
    firebaseAdminApp = admin.apps[0]!;
    return firebaseAdminApp;
  }

  firebaseAdminApp = admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });

  return firebaseAdminApp;
}
