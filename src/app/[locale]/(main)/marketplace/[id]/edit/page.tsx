import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/domains/auth/lib/auth";
import { getListing } from "@/domains/marketplace/queries/get-listing";
import { getCategories } from "@/domains/marketplace/queries/get-categories";
import { ListingForm } from "@/domains/marketplace/components/listing-form";

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("marketplace");
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const listing = await getListing(id);
  if (!listing) notFound();

  if (listing.product.farmerId !== session.user.id) {
    redirect(`/marketplace/${id}`);
  }

  const categories = await getCategories();

  const initialValues = {
    name: listing.product.name,
    description: listing.product.description ?? "",
    categoryId: listing.product.categoryId,
    method: listing.product.method,
    tags: listing.product.tags,
    images: listing.product.images,
    price: Number(listing.price),
    unit: listing.unit,
    quantityAvailable: listing.quantityAvailable
      ? Number(listing.quantityAvailable)
      : undefined,
    availability: listing.availability,
    validUntil: listing.validUntil?.toISOString(),
    deliveryOptions: listing.deliveryOptions,
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">{t("editListing")}</h1>
      <ListingForm
        categories={categories}
        listingId={id}
        initialValues={initialValues}
      />
    </div>
  );
}
