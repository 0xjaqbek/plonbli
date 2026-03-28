import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { auth } from "@/domains/auth/lib/auth";
import { db } from "@/shared/db";
import { users } from "@/shared/db/schema";
import { getCategories } from "@/domains/marketplace/queries/get-categories";
import { ListingForm } from "@/domains/marketplace/components/listing-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

export default async function CreateListingPage() {
  const t = await getTranslations("product");
  const tMarketplace = await getTranslations("marketplace");

  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  if (!user || (user.role !== "FARMER" && user.role !== "BOTH")) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              {t("onlyFarmers")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const categories = await getCategories();

  return (
    <div className="max-w-2xl mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>{tMarketplace("createListing")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ListingForm categories={categories} />
        </CardContent>
      </Card>
    </div>
  );
}
