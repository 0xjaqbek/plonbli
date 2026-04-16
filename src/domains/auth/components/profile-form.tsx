"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { profileSchema, type ProfileInput } from "../schemas/validation";
import { updateProfile } from "../actions/update-profile";
import { LocationCascade } from "@/domains/geo";
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
import { ImageUpload } from "@/shared/ui/image-upload";
import type { User } from "@/shared/db/schema";

interface ProfileFormProps {
  user: User;
}

export function ProfileForm({ user }: ProfileFormProps) {
  const t = useTranslations("profile");
  const tAuth = useTranslations("auth");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user.name,
      avatar: user.avatar,
      bio: user.bio,
      role: user.role,
      voivodeship: user.voivodeship as ProfileInput["voivodeship"],
      county: user.county,
      commune: user.commune,
      postalCode: user.postalCode,
    },
  });

  function onSubmit(data: ProfileInput) {
    setMessage(null);
    startTransition(async () => {
      const result = await updateProfile(data);
      if (result.success) {
        setMessage(t("saved"));
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="avatar"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Avatar</FormLabel>
              <FormControl>
                <ImageUpload
                  folder="avatars"
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
              <FormLabel>{tAuth("name")}</FormLabel>
              <FormControl>
                <Input {...field} />
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
                  maxLength={500}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{tAuth("role")}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="CONSUMER">{tAuth("roleConsumer")}</SelectItem>
                  <SelectItem value="FARMER">{tAuth("roleFarmer")}</SelectItem>
                  <SelectItem value="BOTH">{tAuth("roleBoth")}</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <h3 className="text-lg font-medium">{t("location")}</h3>

        <LocationCascade
          mode="form"
          value={{
            voivodeship: form.watch("voivodeship") ?? null,
            county: form.watch("county") ?? null,
            commune: form.watch("commune") ?? null,
          }}
          onChange={({ voivodeship, county, commune }) => {
            form.setValue(
              "voivodeship",
              voivodeship as ProfileInput["voivodeship"]
            );
            form.setValue("county", county);
            form.setValue("commune", commune);
          }}
          labels={{
            voivodeship: t("voivodeship"),
            county: t("county"),
            commune: t("commune"),
          }}
        />

        <FormField
          control={form.control}
          name="postalCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("postalCode")}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ""}
                  placeholder="XX-XXX"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="button" variant="outline" onClick={handleGps}>
          {t("useGps")}
        </Button>

        {message && <p className="text-sm text-primary">{message}</p>}

        <Button type="submit" className="w-full" disabled={isPending}>
          {t("editProfile")}
        </Button>
      </form>
    </Form>
  );
}
