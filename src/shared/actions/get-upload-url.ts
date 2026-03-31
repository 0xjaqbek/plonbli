"use server";

import { auth } from "@/domains/auth/lib/auth";
import { supabaseAdmin, STORAGE_BUCKET, getPublicUrl } from "@/shared/lib/supabase";

type UploadUrlResult =
  | { success: true; signedUrl: string; publicUrl: string; path: string }
  | { success: false; error: string };

export async function getUploadUrl(
  folder: string,
  contentType: string
): Promise<UploadUrlResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(contentType)) {
    return { success: false, error: "Niedozwolony typ pliku" };
  }

  const allowedFolders = ["avatars", "posts", "products", "events", "crop-logs"];
  if (!allowedFolders.includes(folder)) {
    return { success: false, error: "Niedozwolony folder" };
  }

  const ext = contentType === "image/webp" ? "webp" : contentType === "image/png" ? "png" : "jpg";
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  const path = `${folder}/${session.user.id}/${timestamp}-${random}.${ext}`;

  const { data, error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data) {
    return { success: false, error: error?.message ?? "Nie udalo sie utworzyc URL" };
  }

  return {
    success: true,
    signedUrl: data.signedUrl,
    publicUrl: getPublicUrl(path),
    path,
  };
}
