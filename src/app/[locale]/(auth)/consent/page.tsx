"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { acceptConsent } from "@/domains/auth/actions/accept-consent";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { Label } from "@/shared/ui/label";

export default function ConsentPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);

  const canSubmit = acceptedTerms && acceptedPrivacy;

  function onSubmit() {
    startTransition(async () => {
      const result = await acceptConsent();
      if (result.success) {
        router.replace("/");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="font-semibold text-lg">{t("consentTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("consentDescription")}</p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-row items-start space-x-3">
          <Checkbox
            id="consent-terms"
            checked={acceptedTerms}
            onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
          />
          <Label htmlFor="consent-terms" className="font-normal text-sm cursor-pointer leading-snug">
            {t("acceptTermsLabel")}{" "}
            <Link href="/terms" className="text-primary underline" target="_blank">
              {t("acceptTermsLink")}
            </Link>
          </Label>
        </div>

        <div className="flex flex-row items-start space-x-3">
          <Checkbox
            id="consent-privacy"
            checked={acceptedPrivacy}
            onCheckedChange={(checked) => setAcceptedPrivacy(checked === true)}
          />
          <Label htmlFor="consent-privacy" className="font-normal text-sm cursor-pointer leading-snug">
            {t("acceptPrivacyLabel")}{" "}
            <Link href="/privacy" className="text-primary underline" target="_blank">
              {t("acceptPrivacyLink")}
            </Link>
          </Label>
        </div>
      </div>

      <Button
        className="w-full"
        disabled={!canSubmit}
        isLoading={isPending}
        onClick={onSubmit}
      >
        {t("consentSubmit")}
      </Button>
    </div>
  );
}
