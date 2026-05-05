import { auth } from "@/domains/auth/lib/auth";
import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import { locales, defaultLocale } from "./i18n/config";

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "never",
});

export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (
    req.auth?.user?.needsConsent &&
    !pathname.startsWith("/consent")
  ) {
    return NextResponse.redirect(new URL("/consent", req.url));
  }

  return intlMiddleware(req);
});

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
