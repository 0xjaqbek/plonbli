import { RegisterForm } from "@/domains/auth/components/register-form";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const { invite } = await searchParams;
  return <RegisterForm inviteCode={invite} />;
}
