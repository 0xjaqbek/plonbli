import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";
import { auth } from "@/domains/auth/lib/auth";
import { getOrCreateInvitation } from "@/domains/invitations";
import { InvitationPoster } from "@/domains/invitations/lib/poster";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !session.user.name) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const invitation = await getOrCreateInvitation(session.user.id);

  const baseUrl = new URL(request.url).origin;
  const inviteUrl = `${baseUrl}/register?invite=${invitation.code}`;

  const qrDataUrl = await QRCode.toDataURL(inviteUrl, {
    width: 440,
    margin: 1,
    color: { dark: "#1a1a1a", light: "#ffffff" },
  });

  const logoBuffer = fs.readFileSync(
    path.join(process.cwd(), "public", "plonbliLogoBezTla-removebg-preview.png")
  );
  const logoSrc = `data:image/png;base64,${logoBuffer.toString("base64")}`;

  const buffer = await renderToBuffer(
    <InvitationPoster
      userName={session.user.name}
      qrDataUrl={qrDataUrl}
      inviteUrl={inviteUrl}
      logoSrc={logoSrc}
    />
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="zaproszenie.pdf"',
    },
  });
}
