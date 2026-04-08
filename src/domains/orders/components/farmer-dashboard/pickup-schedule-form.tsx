"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Trash2, Plus, Clock } from "lucide-react";
import { addPickupSlot, deletePickupSlot } from "../../actions/manage-pickup-slots";
import type { PickupSlot } from "@/shared/db/schema";

interface PickupScheduleFormProps {
  slots: PickupSlot[];
}

export function PickupScheduleForm({ slots }: PickupScheduleFormProps) {
  const t = useTranslations("orders");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showAdd, setShowAdd] = useState(false);
  const [dayOfWeek, setDayOfWeek] = useState("1");
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("14:00");

  const dayNames = [
    t("daySunday"),
    t("dayMonday"),
    t("dayTuesday"),
    t("dayWednesday"),
    t("dayThursday"),
    t("dayFriday"),
    t("daySaturday"),
  ];

  function handleAdd() {
    startTransition(async () => {
      const result = await addPickupSlot({ dayOfWeek: Number(dayOfWeek), startTime, endTime });
      if (result.success) {
        setShowAdd(false);
        router.refresh();
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deletePickupSlot(id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {slots.map((slot) => (
        <Card key={slot.id}>
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">
                  {slot.dayOfWeek !== null ? dayNames[slot.dayOfWeek] : slot.specificDate}
                </p>
                <p className="text-sm text-muted-foreground">{slot.startTime} - {slot.endTime}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(slot.id)} disabled={isPending}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      ))}

      {showAdd ? (
        <Card>
          <CardHeader><CardTitle>{t("addSlot")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>{t("dayOfWeek")}</Label>
              <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {dayNames.map((name, i) => (
                    <SelectItem key={i} value={String(i)}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("startTime")}</Label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div>
                <Label>{t("endTime")}</Label>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAdd} disabled={isPending}>{t("addSlot")}</Button>
              <Button variant="ghost" onClick={() => setShowAdd(false)}>{tCommon("cancel")}</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button variant="outline" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t("addSlot")}
        </Button>
      )}
    </div>
  );
}
