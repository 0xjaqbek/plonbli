import { loadEnvConfig } from "@next/env";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { categories } from "../src/shared/db/schema/categories";

loadEnvConfig(process.cwd());

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

const CATEGORIES = [
  { name: "Warzywa", slug: "warzywa", sortOrder: 1 },
  { name: "Owoce", slug: "owoce", sortOrder: 2 },
  { name: "Nabial", slug: "nabial", sortOrder: 3 },
  { name: "Mieso", slug: "mieso", sortOrder: 4 },
  { name: "Pieczywo", slug: "pieczywo", sortOrder: 5 },
  { name: "Przetwory", slug: "przetwory", sortOrder: 6 },
  { name: "Miod", slug: "miod", sortOrder: 7 },
  { name: "Jaja", slug: "jaja", sortOrder: 8 },
  { name: "Ziola", slug: "ziola", sortOrder: 9 },
  { name: "Inne", slug: "inne", sortOrder: 10 },
];

async function seed() {
  console.log("Seeding categories...");
  await db.insert(categories).values(CATEGORIES).onConflictDoNothing();
  console.log(`Seeded ${CATEGORIES.length} categories`);
}

seed().catch(console.error);
