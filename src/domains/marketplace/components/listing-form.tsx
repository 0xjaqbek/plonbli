"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createListing } from "../actions/create-listing";
import { z } from "zod";

const formSchema = z.object({
  name: z.string().min(1, "Nazwa jest wymagana").max(255),
  description: z.string().max(5000).default(""),
  categoryId: z.string().min(1, "Kategoria jest wymagana"),
  method: z.enum(["ECO", "CONVENTIONAL", "OTHER"]).default("CONVENTIONAL"),
  tags: z.array(z.string()).default([]),
  images: z.array(z.string().url()).default([]),
  price: z.coerce.number().positive("Cena musi byc wieksza od 0"),
  unit: z.enum(["KG", "PIECE", "LITER", "BUNCH"]),
  quantityAvailable: z.coerce.number().positive().optional(),
  availability: z.enum(["AVAILABLE", "SEASONAL", "OUT_OF_STOCK"]).default("AVAILABLE"),
  validUntil: z.string().optional(),
});

type FormInput = z.infer<typeof formSchema>;
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import type { Category } from "@/shared/db/schema";

interface ListingFormProps {
  categories: Category[];
}

export function ListingForm({ categories }: ListingFormProps) {
  const t = useTranslations("product");
  const tMarketplace = useTranslations("marketplace");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const [pickupEnabled, setPickupEnabled] = useState(false);
  const [deliveryEnabled, setDeliveryEnabled] = useState(false);
  const [dropPointEnabled, setDropPointEnabled] = useState(false);

  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupHours, setPickupHours] = useState("");
  const [deliveryRadius, setDeliveryRadius] = useState("");
  const [deliveryCost, setDeliveryCost] = useState("");
  const [deliveryMinAmount, setDeliveryMinAmount] = useState("");
  const [dropPointAddress, setDropPointAddress] = useState("");

  const form = useForm<FormInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: "",
      description: "",
      categoryId: "",
      method: "CONVENTIONAL",
      tags: [],
      images: [],
      price: 0,
      unit: "KG",
      availability: "AVAILABLE",
    },
  });

  function buildDeliveryOptions() {
    const options = [];
    if (pickupEnabled) {
      options.push({
        type: "PICKUP" as const,
        address: pickupAddress || undefined,
        hours: pickupHours || undefined,
      });
    }
    if (deliveryEnabled) {
      options.push({
        type: "DELIVERY" as const,
        radius: deliveryRadius ? Number(deliveryRadius) : undefined,
        cost: deliveryCost ? Number(deliveryCost) : undefined,
        minAmount: deliveryMinAmount ? Number(deliveryMinAmount) : undefined,
      });
    }
    if (dropPointEnabled) {
      options.push({
        type: "DROP_POINT" as const,
        address: dropPointAddress || undefined,
      });
    }
    return options;
  }

  function onSubmit(data: FormInput) {
    const deliveryOptions = buildDeliveryOptions();
    if (deliveryOptions.length === 0) {
      setServerError("Dodaj przynajmniej jedna opcje dostawy");
      return;
    }

    setServerError(null);
    startTransition(async () => {
      const result = await createListing({
        ...data,
        deliveryOptions,
      });
      if (result.success) {
        router.push(`/marketplace/${result.listingId}`);
      } else if (!result.success && result.error) {
        setServerError(result.error);
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("name")}</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("description")}</FormLabel>
              <FormControl>
                <Textarea rows={4} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="categoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("category")}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t("category")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="method"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("method")}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="ECO">{t("methodEco")}</SelectItem>
                  <SelectItem value="CONVENTIONAL">
                    {t("methodConventional")}
                  </SelectItem>
                  <SelectItem value="OTHER">{t("methodOther")}</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="tags"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("tags")}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t("tagsPlaceholder")}
                  value={field.value?.join(", ") ?? ""}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean)
                    )
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("price")} (zl)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="unit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("unit")}</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="KG">{t("unitKg")}</SelectItem>
                    <SelectItem value="PIECE">{t("unitPiece")}</SelectItem>
                    <SelectItem value="LITER">{t("unitLiter")}</SelectItem>
                    <SelectItem value="BUNCH">{t("unitBunch")}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="quantityAvailable"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("quantity")}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  {...field}
                  value={field.value ?? ""}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value ? Number(e.target.value) : undefined
                    )
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Delivery options */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">{t("delivery")}</h3>

          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={pickupEnabled}
                onChange={(e) => setPickupEnabled(e.target.checked)}
                className="rounded"
              />
              <span className="font-medium">{t("deliveryPickup")}</span>
            </label>
            {pickupEnabled && (
              <div className="ml-6 grid grid-cols-2 gap-2">
                <Input
                  placeholder={t("deliveryAddress")}
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                />
                <Input
                  placeholder={t("deliveryHours")}
                  value={pickupHours}
                  onChange={(e) => setPickupHours(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={deliveryEnabled}
                onChange={(e) => setDeliveryEnabled(e.target.checked)}
                className="rounded"
              />
              <span className="font-medium">{t("deliveryDelivery")}</span>
            </label>
            {deliveryEnabled && (
              <div className="ml-6 grid grid-cols-3 gap-2">
                <Input
                  type="number"
                  placeholder={t("deliveryRadius")}
                  value={deliveryRadius}
                  onChange={(e) => setDeliveryRadius(e.target.value)}
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder={t("deliveryCost")}
                  value={deliveryCost}
                  onChange={(e) => setDeliveryCost(e.target.value)}
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder={t("deliveryMinAmount")}
                  value={deliveryMinAmount}
                  onChange={(e) => setDeliveryMinAmount(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={dropPointEnabled}
                onChange={(e) => setDropPointEnabled(e.target.checked)}
                className="rounded"
              />
              <span className="font-medium">{t("deliveryDropPoint")}</span>
            </label>
            {dropPointEnabled && (
              <div className="ml-6">
                <Input
                  placeholder={t("deliveryAddress")}
                  value={dropPointAddress}
                  onChange={(e) => setDropPointAddress(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>

        {serverError && (
          <p className="text-sm text-destructive">{serverError}</p>
        )}

        <Button type="submit" className="w-full" disabled={isPending}>
          {tMarketplace("createListing")}
        </Button>
      </form>
    </Form>
  );
}
