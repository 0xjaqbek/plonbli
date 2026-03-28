import { notFound } from "next/navigation";
import { auth } from "@/domains/auth/lib/auth";
import { getListing } from "@/domains/marketplace/queries/get-listing";
import { ProductDetail } from "@/domains/marketplace/components/product-detail";

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const listing = await getListing(id);

  if (!listing) notFound();

  const session = await auth();
  const isOwner = session?.user?.id === listing.product.farmerId;

  return (
    <div className="max-w-3xl mx-auto p-4">
      <ProductDetail listing={listing} isOwner={isOwner} />
    </div>
  );
}
