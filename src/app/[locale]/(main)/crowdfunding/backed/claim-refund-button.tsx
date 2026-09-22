"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { claimRefundAction } from "@/domains/crowdfunding/actions/claim-refund";
import { Button } from "@/shared/ui/button";

export function ClaimRefundButton({
  contributionId,
  amount,
}: {
  contributionId: string;
  amount: string;
}) {
  const t = useTranslations("crowdfunding");

  const [state, formAction, pending] = useActionState(
    async () => {
      const confirmed = window.confirm(
        t("backed.refundConfirm", { amount })
      );
      if (!confirmed) return null;
      return claimRefundAction(contributionId);
    },
    null
  );

  return (
    <form action={formAction}>
      {state?.error && (
        <p className="text-sm text-destructive mb-1">{state.error}</p>
      )}
      {state?.success ? (
        <p className="text-sm text-green-600 dark:text-green-400">
          {t("backed.refundSuccessAmount", { amount: state.amount })}
        </p>
      ) : (
        <Button
          type="submit"
          variant="destructive"
          size="sm"
          disabled={pending}
        >
          {pending ? t("backed.claimingRefund") : t("backed.claimRefund")}
        </Button>
      )}
    </form>
  );
}
