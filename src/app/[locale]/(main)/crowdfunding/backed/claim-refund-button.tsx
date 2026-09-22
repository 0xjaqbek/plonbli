"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { claimRefundAction } from "@/domains/crowdfunding/actions/claim-refund";
import { Button } from "@/shared/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/ui/alert-dialog";

export function ClaimRefundButton({
  contributionId,
  amount,
}: {
  contributionId: string;
  amount: string;
}) {
  const t = useTranslations("crowdfunding");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ amount: string } | null>(null);
  const [pending, setPending] = useState(false);

  async function handleRefund() {
    setPending(true);
    setError(null);
    try {
      const result = await claimRefundAction(contributionId);
      if (result.error) {
        setError(result.error as string);
      } else if (result.success) {
        setSuccess({ amount: result.amount as string });
      }
    } catch {
      setError(t("backed.refundError"));
    } finally {
      setPending(false);
    }
  }

  if (success) {
    return (
      <p className="text-sm text-green-600 dark:text-green-400">
        {t("backed.refundSuccessAmount", { amount: success.amount })}
      </p>
    );
  }

  return (
    <div>
      {error && <p className="text-sm text-destructive mb-1">{error}</p>}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" size="sm" disabled={pending}>
            {pending ? t("backed.claimingRefund") : t("backed.claimRefund")}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("backed.refundConfirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("backed.refundConfirm", { amount })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("manage.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRefund}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("backed.claimRefund")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
