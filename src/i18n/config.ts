export const locales = ["pl"] as const;
export const defaultLocale = "pl" as const;

export type Locale = (typeof locales)[number];
