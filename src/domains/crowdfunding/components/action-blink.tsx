"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import QRCode from "qrcode";
import { Copy, Check, QrCode, ExternalLink } from "lucide-react";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";

type Props = {
  campaignId: string;
};

export function ActionBlink({ campaignId }: Props) {
  const t = useTranslations("crowdfunding.backer.actionBlink");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const actionUrl =
    typeof window !== "undefined"
      ? `solana-action:${window.location.origin}/api/actions/contribute/${campaignId}`
      : "";

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/actions/contribute/${campaignId}`
      : "";

  useEffect(() => {
    if (!actionUrl) return;
    QRCode.toDataURL(actionUrl, {
      width: 256,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
    }).then(setQrDataUrl);
  }, [actionUrl]);

  async function handleCopy() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <QrCode className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-base">{t("title")}</CardTitle>
        </div>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* QR Code */}
        {qrDataUrl && (
          <div className="flex justify-center">
            <img
              src={qrDataUrl}
              alt="Solana Action QR"
              width={200}
              height={200}
              className="rounded-lg border"
            />
          </div>
        )}

        {/* Copy link button */}
        <Button
          variant="outline"
          className="w-full"
          onClick={handleCopy}
        >
          {copied ? (
            <>
              <Check className="mr-2 h-4 w-4 text-green-600" />
              {t("copied")}
            </>
          ) : (
            <>
              <Copy className="mr-2 h-4 w-4" />
              {t("copyLink")}
            </>
          )}
        </Button>

        {/* Steps */}
        <ol className="space-y-1.5 text-xs text-muted-foreground">
          <li className="flex gap-2">
            <span className="font-medium text-foreground">1.</span>
            {t("step1")}
          </li>
          <li className="flex gap-2">
            <span className="font-medium text-foreground">2.</span>
            {t("step2")}
          </li>
          <li className="flex gap-2">
            <span className="font-medium text-foreground">3.</span>
            {t("step3")}
          </li>
        </ol>
      </CardContent>
    </Card>
  );
}
