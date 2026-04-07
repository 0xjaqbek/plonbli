// src/domains/orders/components/order-detail/payment-proof-form.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { Camera, Link as LinkIcon, Wallet } from "lucide-react";
import { submitPaymentProof } from "../../actions/submit-payment-proof";

interface PaymentProofFormProps {
  orderId: string;
}

export function PaymentProofForm({ orderId }: PaymentProofFormProps) {
  const t = useTranslations("orders");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [type, setType] = useState<"SCREENSHOT" | "BANK_TRANSFER" | "BLOCKCHAIN_LINK">("SCREENSHOT");
  const [imageUrl, setImageUrl] = useState("");
  const [transactionUrl, setTransactionUrl] = useState("");
  const [description, setDescription] = useState("");

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await submitPaymentProof({
        orderId,
        type,
        imageUrl: type === "SCREENSHOT" || type === "BANK_TRANSFER" ? imageUrl || undefined : undefined,
        transactionUrl: type === "BLOCKCHAIN_LINK" ? transactionUrl || undefined : undefined,
        description: description || undefined,
      });

      if (result.success) {
        router.refresh();
      } else {
        setError(result.error ?? t("error"));
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="flex items-center space-x-3 p-3 rounded-lg border cursor-pointer">
          <input
            type="radio"
            name="proofType"
            value="SCREENSHOT"
            checked={type === "SCREENSHOT"}
            onChange={() => setType("SCREENSHOT")}
            className="accent-primary"
          />
          <Camera className="h-4 w-4" />
          <span>{t("proofScreenshot")}</span>
        </label>
        <label className="flex items-center space-x-3 p-3 rounded-lg border cursor-pointer">
          <input
            type="radio"
            name="proofType"
            value="BANK_TRANSFER"
            checked={type === "BANK_TRANSFER"}
            onChange={() => setType("BANK_TRANSFER")}
            className="accent-primary"
          />
          <Wallet className="h-4 w-4" />
          <span>{t("proofBankTransfer")}</span>
        </label>
        <label className="flex items-center space-x-3 p-3 rounded-lg border cursor-pointer">
          <input
            type="radio"
            name="proofType"
            value="BLOCKCHAIN_LINK"
            checked={type === "BLOCKCHAIN_LINK"}
            onChange={() => setType("BLOCKCHAIN_LINK")}
            className="accent-primary"
          />
          <LinkIcon className="h-4 w-4" />
          <span>{t("proofBlockchain")}</span>
        </label>
      </div>

      {(type === "SCREENSHOT" || type === "BANK_TRANSFER") && (
        <div>
          <Label>{t("imageUrl")}</Label>
          <Input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://..."
          />
          <p className="text-xs text-muted-foreground mt-1">
            {t("imageUrlHint")}
          </p>
        </div>
      )}

      {type === "BLOCKCHAIN_LINK" && (
        <div>
          <Label>{t("transactionUrl")}</Label>
          <Input
            value={transactionUrl}
            onChange={(e) => setTransactionUrl(e.target.value)}
            placeholder="https://etherscan.io/tx/..."
          />
        </div>
      )}

      <div>
        <Label>{t("descriptionOptional")}</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          maxLength={1000}
        />
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <Button onClick={handleSubmit} disabled={isPending} className="w-full">
        {isPending ? "..." : t("submitProof")}
      </Button>
    </div>
  );
}
