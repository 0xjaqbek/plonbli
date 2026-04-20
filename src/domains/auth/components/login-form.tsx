"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "../schemas/validation";
import { login } from "../actions/login";
import { trackEvent, EVENTS } from "@/domains/analytics";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Separator } from "@/shared/ui/separator";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/ui/form";
import { signIn } from "next-auth/react";
import Link from "next/link";

export function LoginForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  function onSubmit(data: LoginInput) {
    setError(null);
    startTransition(async () => {
      const result = await login(data);
      if (result.success) {
        trackEvent(EVENTS.AUTH_LOGGED_IN, { method: "email" });
        router.push("/");
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      {registered && (
        <p className="text-sm text-primary text-center">
          {t("registerSuccess")}
        </p>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("email")}</FormLabel>
                <FormControl>
                  <Input type="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("password")}</FormLabel>
                <FormControl>
                  <Input type="password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={isPending}>
            {t("login")}
          </Button>
        </form>
      </Form>

      <Separator />

      <div className="space-y-2">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            trackEvent(EVENTS.AUTH_LOGGED_IN, { method: "google" });
            signIn("google", { callbackUrl: "/" });
          }}
        >
          Google
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            trackEvent(EVENTS.AUTH_LOGGED_IN, { method: "facebook" });
            signIn("facebook", { callbackUrl: "/" });
          }}
        >
          Facebook
        </Button>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        {t("noAccount")}{" "}
        <Link href="/register" className="text-primary underline">
          {t("register")}
        </Link>
      </p>
    </div>
  );
}
