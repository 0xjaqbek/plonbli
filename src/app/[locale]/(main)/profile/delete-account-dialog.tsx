"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import { deleteAccount } from "@/domains/auth";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/ui/alert-dialog";

export function DeleteAccountDialog({ userEmail }: { userEmail: string }) {
  const t = useTranslations("profile");
  const [confirmedEmail, setConfirmedEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isConfirmed = confirmedEmail === userEmail;

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteAccount(confirmedEmail);
      if (!result.success) {
        setError(result.error);
      }
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button className="flex items-center w-full px-3 py-2.5 rounded-md hover:bg-accent transition-colors text-sm text-destructive">
          <span className="flex items-center gap-3">
            <Trash2 className="h-4 w-4" />
            {t("deleteAccount")}
          </span>
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("deleteAccountDialogTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("deleteAccountDialogDescription")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2 py-2">
          <p className="text-sm text-muted-foreground">
            {t("deleteAccountConfirmLabel")}
          </p>
          <Input
            type="email"
            value={confirmedEmail}
            onChange={(e) => setConfirmedEmail(e.target.value)}
            placeholder={userEmail}
            autoComplete="off"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={() => {
              setConfirmedEmail("");
              setError(null);
            }}
          >
            {t("deleteAccountCancel")}
          </AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={!isConfirmed || isPending}
            onClick={handleDelete}
            isLoading={isPending}
          >
            {t("deleteAccountConfirmButton")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
