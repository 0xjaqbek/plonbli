import { eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { listings } from "@/shared/db/schema";

export async function getListing(id: string) {
  return db.query.listings.findFirst({
    where: eq(listings.id, id),
    with: {
      product: {
        with: {
          farmer: true,
          category: true,
        },
      },
    },
  });
}

export type ListingDetail = NonNullable<Awaited<ReturnType<typeof getListing>>>;
