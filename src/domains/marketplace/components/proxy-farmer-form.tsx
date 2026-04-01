"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import {
  createProxyFarmerSchema,
  type CreateProxyFarmerInput,
  type CreateProxyFarmerFormInput,
} from "../schemas/proxy-farmer";
import {
  createProxyFarmer,
  updateProxyFarmer,
} from "../actions/proxy-farmer";
import { VOIVODESHIPS } from "@/domains/geo";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { ImageUpload } from "@/shared/ui/image-upload";
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
import type { ProxyFarmer } from "@/shared/db/schema";

interface ProxyFarmerFormProps {
  existing?: ProxyFarmer;
}

export function ProxyFarmerForm({ existing }: ProxyFarmerFormProps) {
  const t = useTranslations("proxyFarmer");
  const tProfile = useTranslations("profile");
  const tFarmer = useTranslations("farmer");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<CreateProxyFarmerFormInput, unknown, CreateProxyFarmerInput>({
    resolver: zodResolver(createProxyFarmerSchema),
    defaultValues: {
      name: existing?.name ?? "",
      bio: existing?.bio ?? "",
      avatar: existing?.avatar ?? null,
      voivodeship: (existing?.voivodeship as CreateProxyFarmerInput["voivodeship"]) ?? null,
      county: existing?.county ?? "",
      commune: existing?.commune ?? "",
      contactMethods: existing?.contactMethods?.length
        ? existing.contactMethods
        : [{ type: "PHONE", value: "", note: "" }],
      products: existing?.products ?? [],
    },
  });

  const contactFields = useFieldArray({
    control: form.control,
    name: "contactMethods",
  });

  const productFields = useFieldArray({
    control: form.control,
    name: "products",
  });

  function onSubmit(data: CreateProxyFarmerInput) {
    setError(null);
    startTransition(async () => {
      const result = existing
        ? await updateProxyFarmer(existing.id, data)
        : await createProxyFarmer(data);

      if (result.success) {
        const targetId = existing ? existing.id : result.id;
        router.push(`/farmers/proxy/${targetId}`);
      } else {
        setError(result.error);
      }
    });
  }

  function handleGps() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      form.setValue("latitude", String(pos.coords.latitude));
      form.setValue("longitude", String(pos.coords.longitude));
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic info */}
        <FormField
          control={form.control}
          name="avatar"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Avatar</FormLabel>
              <FormControl>
                <ImageUpload
                  folder="proxy-farmers"
                  maxFiles={1}
                  value={field.value ? [field.value] : []}
                  onChange={(urls) => field.onChange(urls[0] ?? null)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("farmerName")}</FormLabel>
              <FormControl>
                <Input {...field} placeholder={t("farmerNamePlaceholder")} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("bio")}</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  value={field.value ?? ""}
                  placeholder={t("bioPlaceholder")}
                  rows={3}
                  maxLength={1000}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Location */}
        <h3 className="text-lg font-medium">{tFarmer("location")}</h3>

        <FormField
          control={form.control}
          name="voivodeship"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{tProfile("voivodeship")}</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value ?? undefined}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={tProfile("voivodeship")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {VOIVODESHIPS.map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="county"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{tProfile("county")}</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="commune"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{tProfile("commune")}</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="button" variant="outline" size="sm" onClick={handleGps}>
          {tProfile("useGps")}
        </Button>

        {/* Contact methods */}
        <div className="space-y-3">
          <h3 className="text-lg font-medium">{t("contactMethods")}</h3>
          {contactFields.fields.map((field, index) => (
            <div key={field.id} className="flex flex-col sm:flex-row gap-2 p-3 border rounded-lg">
              <FormField
                control={form.control}
                name={`contactMethods.${index}.type`}
                render={({ field }) => (
                  <FormItem className="w-full sm:w-40">
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PHONE">{t("contactPhone")}</SelectItem>
                        <SelectItem value="EMAIL">{t("contactEmail")}</SelectItem>
                        <SelectItem value="IN_PERSON">{t("contactInPerson")}</SelectItem>
                        <SelectItem value="PICKUP">{t("contactPickup")}</SelectItem>
                        <SelectItem value="OTHER">{t("contactOther")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`contactMethods.${index}.value`}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input {...field} placeholder={t("contactValue")} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`contactMethods.${index}.note`}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        placeholder={t("contactNote")}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {contactFields.fields.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() => contactFields.remove(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          {contactFields.fields.length < 5 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => contactFields.append({ type: "PHONE", value: "" })}
            >
              <Plus className="h-4 w-4 mr-1" />
              {t("addContactMethod")}
            </Button>
          )}
        </div>

        {/* Products */}
        <div className="space-y-3">
          <h3 className="text-lg font-medium">{t("products")}</h3>
          {productFields.fields.map((field, index) => (
            <div key={field.id} className="space-y-2 p-3 border rounded-lg">
              <div className="flex gap-2">
                <FormField
                  control={form.control}
                  name={`products.${index}.name`}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input {...field} placeholder={t("productName")} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`products.${index}.category`}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value ?? ""}
                          placeholder={t("productCategory")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`products.${index}.method`}
                  render={({ field }) => (
                    <FormItem className="w-40">
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value ?? undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={tFarmer("farmingMethods")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ECO">{tFarmer("methodEco")}</SelectItem>
                          <SelectItem value="CONVENTIONAL">{tFarmer("methodConventional")}</SelectItem>
                          <SelectItem value="OTHER">{tFarmer("methodOther")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() => productFields.remove(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <FormField
                control={form.control}
                name={`products.${index}.description`}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        placeholder={t("productDescription")}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          ))}
          {productFields.fields.length < 10 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => productFields.append({ name: "" })}
            >
              <Plus className="h-4 w-4 mr-1" />
              {t("addProduct")}
            </Button>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" className="w-full" disabled={isPending}>
          {existing ? t("editProfile") : t("createProfile")}
        </Button>
      </form>
    </Form>
  );
}
