"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { completeOnboarding } from "@/domains/auth/actions/complete-onboarding";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";

export default function OnboardingPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [profileType, setProfileType] = useState<string>("");
  const [acceptedAge, setAcceptedAge] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = profileType !== "" && acceptedAge;

  function onSubmit() {
    if (!canSubmit) return;
    setError(null);
    startTransition(async () => {
      const result = await completeOnboarding({
        profileType,
        acceptAge: true,
      });
      if (result.success) {
        router.replace("/");
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="font-semibold text-lg">{t("onboardingTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("onboardingSubtitle")}</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>{t("profileType")}</Label>
          <Select onValueChange={setProfileType} value={profileType}>
            <SelectTrigger>
              <SelectValue placeholder={t("profileType")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PRIVATE">{t("profileTypePrivate")}</SelectItem>
              <SelectItem value="SMALL_FARM">{t("profileTypeSmallFarm")}</SelectItem>
              <SelectItem value="MEDIUM_FARM">{t("profileTypeMediumFarm")}</SelectItem>
              <SelectItem value="LARGE_FARM">{t("profileTypeLargeFarm")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-row items-start space-x-3">
          <Checkbox
            id="onboarding-age"
            checked={acceptedAge}
            onCheckedChange={(checked) => setAcceptedAge(checked === true)}
          />
          <Label
            htmlFor="onboarding-age"
            className="font-normal text-sm cursor-pointer leading-snug"
          >
            {t("acceptAge")}
          </Label>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        className="w-full"
        disabled={!canSubmit}
        isLoading={isPending}
        onClick={onSubmit}
      >
        {t("onboardingSubmit")}
      </Button>
    </div>
  );
}
