import { eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { users, products, events, cropLogs, listings } from "@/shared/db/schema";

export type SharedEntityData =
  | {
      type: "FARMER";
      id: string;
      name: string;
      avatar: string | null;
      location: string | null;
    }
  | {
      type: "EVENT";
      id: string;
      title: string;
      startDate: Date;
      location: string | null;
      coverImage: string | null;
      eventType: string;
    }
  | {
      type: "CROP_LOG";
      id: string;
      logType: string;
      description: string;
      image: string | null;
      farmerName: string;
    }
  | {
      type: "PRODUCT";
      id: string;
      listingId: string | null;
      name: string;
      image: string | null;
      method: string;
      price: string | null;
      unit: string | null;
      farmerName: string;
    };

export async function resolveSharedEntity(
  entityType: string,
  entityId: string
): Promise<SharedEntityData | null> {
  switch (entityType) {
    case "FARMER": {
      const farmer = await db.query.users.findFirst({
        where: eq(users.id, entityId),
      });
      if (!farmer) return null;
      const locationParts: string[] = [];
      if (farmer.commune) locationParts.push(farmer.commune);
      if (farmer.voivodeship) locationParts.push(farmer.voivodeship);
      return {
        type: "FARMER",
        id: farmer.id,
        name: farmer.name,
        avatar: farmer.avatar,
        location: locationParts.join(", ") || null,
      };
    }
    case "EVENT": {
      const event = await db.query.events.findFirst({
        where: eq(events.id, entityId),
      });
      if (!event) return null;
      return {
        type: "EVENT",
        id: event.id,
        title: event.title,
        startDate: event.startDate,
        location: event.location,
        coverImage: event.coverImage,
        eventType: event.type,
      };
    }
    case "CROP_LOG": {
      const log = await db
        .select({
          id: cropLogs.id,
          logType: cropLogs.type,
          description: cropLogs.description,
          images: cropLogs.images,
          farmerName: users.name,
        })
        .from(cropLogs)
        .innerJoin(users, eq(cropLogs.farmerId, users.id))
        .where(eq(cropLogs.id, entityId))
        .limit(1);
      if (log.length === 0) return null;
      return {
        type: "CROP_LOG",
        id: log[0].id,
        logType: log[0].logType,
        description: log[0].description,
        image: log[0].images[0] ?? null,
        farmerName: log[0].farmerName,
      };
    }
    case "PRODUCT": {
      const result = await db
        .select({
          id: products.id,
          name: products.name,
          images: products.images,
          method: products.method,
          farmerName: users.name,
          listingId: listings.id,
          price: listings.price,
          unit: listings.unit,
        })
        .from(products)
        .innerJoin(users, eq(products.farmerId, users.id))
        .leftJoin(listings, eq(listings.productId, products.id))
        .where(eq(products.id, entityId))
        .limit(1);
      if (result.length === 0) return null;
      return {
        type: "PRODUCT",
        id: result[0].id,
        listingId: result[0].listingId,
        name: result[0].name,
        image: result[0].images[0] ?? null,
        method: result[0].method,
        price: result[0].price,
        unit: result[0].unit,
        farmerName: result[0].farmerName,
      };
    }
    default:
      return null;
  }
}
