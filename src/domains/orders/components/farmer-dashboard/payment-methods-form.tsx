"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Trash2, Plus } from "lucide-react";
import { addPaymentMethod, deletePaymentMethod } from "../../actions/manage-payment-methods";
import type { FarmerPaymentMethod } from "@/shared/db/schema";

interface PaymentMethodsFormProps {
  methods: FarmerPaymentMethod[];
}

export function PaymentMethodsForm({ methods }: PaymentMethodsFormProps) {
  const t = useTranslations("orders");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showAdd, setShowAdd] = useState(false);
  const [type, setType] = useState<"BLIK" | "TRANSFER" | "CRYPTO">("BLIK");
  const [label, setLabel] = useState("");
  const [details, setDetails] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  function handleAdd() {
    startTransition(async () => {
      const result = await addPaymentMethod({ type, label, details, isDefault });
      if (result.success) {
        setShowAdd(false);
        setLabel("");
        setDetails("");
        setIsDefault(false);
        router.refresh();
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deletePaymentMethod(id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {methods.map((method) => (
        <Card key={method.id}>
          <CardContent className="flex items-center justify-between py-4">
            <div>
              <p className="font-medium">{method.label}</p>
              <p className="text-sm text-muted-foreground">{method.details}</p>
              {method.isDefault && <span className="text-xs text-primary">{t("defaultMethod")}</span>}
            </div>
            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(method.id)} isLoading={isPending}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      ))}

      {showAdd ? (
        <Card>
          <CardHeader><CardTitle>{t("addPaymentMethod")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>{t("paymentType")}</Label>
              <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BLIK">{t("paymentMethodBlik")}</SelectItem>
                  <SelectItem value="TRANSFER">{t("paymentMethodTransfer")}</SelectItem>
                  <SelectItem value="CRYPTO">{t("paymentMethodCrypto")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("paymentLabel")}</Label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} />
            </div>
            <div>
              <Label>{t("paymentDetails")}</Label>
              <Input value={details} onChange={(e) => setDetails(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="isDefault" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="accent-primary" />
              <Label htmlFor="isDefault">{t("setAsDefault")}</Label>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAdd} isLoading={isPending} disabled={!label || !details}>{t("addPaymentMethod")}</Button>
              <Button variant="ghost" onClick={() => setShowAdd(false)}>{tCommon("cancel")}</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button variant="outline" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t("addPaymentMethod")}
        </Button>
      )}
    </div>
  );
}
