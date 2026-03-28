"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { createGroup } from "@/domains/social/actions/create-group";

export default function CreateGroupPage() {
  const t = useTranslations("group");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"BUYING_GROUP" | "COMMUNITY">(
    "COMMUNITY"
  );
  const [joinPolicy, setJoinPolicy] = useState<"OPEN" | "INVITE_ONLY">(
    "OPEN"
  );
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    startTransition(async () => {
      const result = await createGroup({
        name: name.trim(),
        description: description.trim(),
        type,
        joinPolicy,
      });

      if (result.success) {
        router.push(`/social/groups/${result.groupId}`);
      } else if (result.error) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="max-w-lg mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">{t("createGroup")}</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">{t("groupName")}</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={100}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">{t("groupDescription")}</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label>{t("groupType")}</Label>
          <Select
            value={type}
            onValueChange={(v) =>
              setType(v as "BUYING_GROUP" | "COMMUNITY")
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="COMMUNITY">
                {t("typeCommunity")}
              </SelectItem>
              <SelectItem value="BUYING_GROUP">
                {t("typeBuyingGroup")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{t("joinPolicy")}</Label>
          <Select
            value={joinPolicy}
            onValueChange={(v) =>
              setJoinPolicy(v as "OPEN" | "INVITE_ONLY")
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="OPEN">{t("policyOpen")}</SelectItem>
              <SelectItem value="INVITE_ONLY">
                {t("policyInviteOnly")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <Button type="submit" disabled={isPending} className="w-full">
          {t("createGroup")}
        </Button>
      </form>
    </div>
  );
}
