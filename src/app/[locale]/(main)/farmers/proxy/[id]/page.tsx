import { notFound } from "next/navigation";
import { auth } from "@/domains/auth/lib/auth";
import { getProxyFarmer } from "@/domains/marketplace/queries/get-proxy-farmer";
import { ProxyFarmerProfileView } from "@/domains/marketplace/components/proxy-farmer-profile-view";

export default async function ProxyFarmerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const profile = await getProxyFarmer(id);

  if (!profile) {
    notFound();
  }

  const isCreator = session?.user?.id === profile.creatorId;

  return (
    <div className="max-w-2xl mx-auto p-4">
      <ProxyFarmerProfileView
        profile={profile}
        isCreator={isCreator}
        currentUserId={session?.user?.id ?? null}
      />
    </div>
  );
}
