import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      needsConsent: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    needsConsent?: boolean;
  }
}
