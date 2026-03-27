"use server";

import { signIn } from "../lib/auth";
import { loginSchema, type LoginInput } from "../schemas/validation";

type LoginResult =
  | { success: true }
  | { success: false; error: string };

export async function login(input: LoginInput): Promise<LoginResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Nieprawidlowe dane logowania" };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
    return { success: true };
  } catch {
    return { success: false, error: "Nieprawidlowy email lub haslo" };
  }
}
