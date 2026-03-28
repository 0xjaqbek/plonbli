import { asc } from "drizzle-orm";
import { db } from "@/shared/db";
import { categories } from "@/shared/db/schema";

export async function getCategories() {
  return db
    .select()
    .from(categories)
    .orderBy(asc(categories.sortOrder));
}
