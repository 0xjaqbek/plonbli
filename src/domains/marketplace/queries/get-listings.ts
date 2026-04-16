import {
  eq,
  and,
  ilike,
  gte,
  lte,
  desc,
  asc,
  sql,
  ne,
} from "drizzle-orm";
import { db } from "@/shared/db";
import {
  listings,
  products,
  users,
  categories,
} from "@/shared/db/schema";
import type { SearchListingsInput } from "../schemas/validation";

const ITEMS_PER_PAGE = 12;

export async function getListings(filters: SearchListingsInput) {
  const conditions = [ne(listings.availability, "OUT_OF_STOCK")];

  if (filters.q) {
    conditions.push(ilike(products.name, `%${filters.q}%`));
  }
  if (filters.category) {
    conditions.push(eq(categories.slug, filters.category));
  }
  if (filters.voivodeship) {
    conditions.push(eq(users.voivodeship, filters.voivodeship));
  }
  if (filters.county) {
    conditions.push(eq(users.county, filters.county));
  }
  if (filters.commune) {
    conditions.push(eq(users.commune, filters.commune));
  }
  if (filters.minPrice !== undefined) {
    conditions.push(gte(listings.price, String(filters.minPrice)));
  }
  if (filters.maxPrice !== undefined) {
    conditions.push(lte(listings.price, String(filters.maxPrice)));
  }
  if (filters.method) {
    conditions.push(eq(products.method, filters.method));
  }

  const orderMap = {
    newest: desc(listings.createdAt),
    price_asc: asc(listings.price),
    price_desc: desc(listings.price),
    name: asc(products.name),
  } as const;

  const orderClause = orderMap[filters.sort ?? "newest"];
  const offset = ((filters.page ?? 1) - 1) * ITEMS_PER_PAGE;

  const results = await db
    .select({
      listing: listings,
      product: products,
      farmer: {
        id: users.id,
        name: users.name,
        avatar: users.avatar,
        voivodeship: users.voivodeship,
      },
      category: {
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
      },
    })
    .from(listings)
    .innerJoin(products, eq(listings.productId, products.id))
    .innerJoin(users, eq(products.farmerId, users.id))
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(and(...conditions))
    .orderBy(orderClause)
    .limit(ITEMS_PER_PAGE)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(listings)
    .innerJoin(products, eq(listings.productId, products.id))
    .innerJoin(users, eq(products.farmerId, users.id))
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(and(...conditions));

  return {
    results,
    total: count,
    page: filters.page ?? 1,
    totalPages: Math.ceil(count / ITEMS_PER_PAGE),
  };
}

export type ListingWithDetails = Awaited<
  ReturnType<typeof getListings>
>["results"][number];
