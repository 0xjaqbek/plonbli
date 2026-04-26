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
import { ImageUpload } from "@/shared/ui/image-upload";
import { createEvent } from "../actions/create-event";

interface EventFormProps {
  groupId?: string;
}

export function EventForm({ groupId }: EventFormProps) {
  const t = useTranslations("event");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"MARKET" | "OPEN_DAY" | "MEETUP" | "OTHER">(
    "MARKET"
  );
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [recurrence, setRecurrence] = useState<string>("");
  const [coverImage, setCoverImage] = useState<string[]>([]);
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    startTransition(async () => {
      const result = await createEvent({
        title: title.trim(),
        description: description.trim(),
        type,
        groupId,
        location: location.trim() || undefined,
        coverImage: coverImage[0] || undefined,
        startDate,
        endDate,
        recurrence: recurrence
          ? (recurrence as "WEEKLY" | "BIWEEKLY" | "MONTHLY")
          : undefined,
      });

      if (result.success) {
        router.push(`/social/events/${result.eventId}`);
      } else if (result.error) {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">{t("eventTitle")}</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={200}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">{t("eventDescription")}</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>{t("eventType")}</Label>
        <Select
          value={type}
          onValueChange={(v) =>
            setType(v as "MARKET" | "OPEN_DAY" | "MEETUP" | "OTHER")
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="MARKET">{t("typeMarket")}</SelectItem>
            <SelectItem value="OPEN_DAY">{t("typeOpenDay")}</SelectItem>
            <SelectItem value="MEETUP">{t("typeMeetup")}</SelectItem>
            <SelectItem value="OTHER">{t("typeOther")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">{t("address")}</Label>
        <Input
          id="location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          maxLength={300}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">{t("startDate")}</Label>
          <Input
            id="startDate"
            type="datetime-local"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">{t("endDate")}</Label>
          <Input
            id="endDate"
            type="datetime-local"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t("coverImage")}</Label>
        <ImageUpload
          folder="events"
          maxFiles={1}
          value={coverImage}
          onChange={setCoverImage}
        />
      </div>

      <div className="space-y-2">
        <Label>{t("recurrence")}</Label>
        <Select value={recurrence} onValueChange={setRecurrence}>
          <SelectTrigger>
            <SelectValue placeholder={t("recurrenceNone")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="NONE">{t("recurrenceNone")}</SelectItem>
            <SelectItem value="WEEKLY">{t("recurrenceWeekly")}</SelectItem>
            <SelectItem value="BIWEEKLY">
              {t("recurrenceBiweekly")}
            </SelectItem>
            <SelectItem value="MONTHLY">{t("recurrenceMonthly")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" isLoading={isPending} className="w-full">
        {t("createEvent")}
      </Button>
    </form>
  );
}
