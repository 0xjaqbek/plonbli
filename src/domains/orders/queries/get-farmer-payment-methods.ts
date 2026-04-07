import { eq, and } from "drizzle-orm";
import { db } from "@/shared/db";
import { farmerPaymentMethods } from "@/shared/db/schema";

export async function getFarmerPaymentMethods(farmerId: string) {
  return db.query.farmerPaymentMethods.findMany({
    where: and(
      eq(farmerPaymentMethods.farmerId, farmerId),
      eq(farmerPaymentMethods.isActive, true),
    ),
  });
}
