/**
 * SEED DEMO DATA — fikcyjne dane demonstracyjne
 *
 * Wszystkie ID zaczynają się od "demo_" żeby łatwo je znaleźć i usunąć.
 * Hasło do wszystkich kont: "demo1234"
 *
 * Uruchomienie: npx tsx scripts/seed-demo.ts
 * Usunięcie:    npx tsx scripts/seed-demo.ts --cleanup
 */

import { config } from "dotenv";
config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { like, sql } from "drizzle-orm";
import { createHash } from "crypto";
import * as schema from "../src/shared/db/schema";
import type { DeliveryOption } from "../src/shared/db/schema/listings";

const client = neon(process.env.DATABASE_URL!);
const db = drizzle(client, { schema });

const DEMO_PREFIX = "demo_";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function demoId(name: string): string {
  return `${DEMO_PREFIX}${name}`;
}

function futureDate(daysFromNow: number, hours = 10): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hours, 0, 0, 0);
  return d;
}

function pastDate(daysAgo: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d;
}

// bcrypt hash for "demo1234" — pre-computed so we don't need bcrypt dependency
const DEMO_PASSWORD_HASH =
  "$2a$10$dRFLSkYedQ4D1Q3r3YNOyeEEGnBpWKjGJqNQ2Oe.wYDnYqOGBsCy";

// ---------------------------------------------------------------------------
// DATA DEFINITIONS
// ---------------------------------------------------------------------------

const CATEGORY_SLUGS = {
  warzywa: "warzywa",
  owoce: "owoce",
  nabial: "nabial",
  mieso: "mieso",
  pieczywo: "pieczywo",
  przetwory: "przetwory",
  miod: "miod",
  ziola: "ziola",
} as const;

// Will be resolved at runtime from existing categories
  const categoryIdBySlug: Record<string, string> = {};

const FARMERS = [
  {
    id: demoId("farmer_kowalski"),
    email: "jan.kowalski@demo.plonbli.pl",
    name: "[DEMO] Jan Kowalski",
    role: "FARMER" as const,
    voivodeship: "mazowieckie",
    county: "garwolinski",
    commune: "Garwolin",
    postalCode: "08-400",
    latitude: "51.643",
    longitude: "21.615",
  },
  {
    id: demoId("farmer_nowak"),
    email: "anna.nowak@demo.plonbli.pl",
    name: "[DEMO] Anna Nowak",
    role: "FARMER" as const,
    voivodeship: "malopolskie",
    county: "nowosadecki",
    commune: "Stary Sacz",
    postalCode: "33-340",
    latitude: "49.556",
    longitude: "20.634",
  },
  {
    id: demoId("farmer_wisniewski"),
    email: "piotr.wisniewski@demo.plonbli.pl",
    name: "[DEMO] Piotr Wisniewski",
    role: "BOTH" as const,
    voivodeship: "lubelskie",
    county: "puławski",
    commune: "Pulawy",
    postalCode: "24-100",
    latitude: "51.417",
    longitude: "21.969",
  },
  {
    id: demoId("farmer_zielinska"),
    email: "maria.zielinska@demo.plonbli.pl",
    name: "[DEMO] Maria Zielinska",
    role: "FARMER" as const,
    voivodeship: "podkarpackie",
    county: "rzeszowski",
    commune: "Tyczyn",
    postalCode: "36-020",
    latitude: "49.960",
    longitude: "22.027",
  },
];

const CONSUMERS = [
  {
    id: demoId("consumer_lewandowski"),
    email: "tomek.lewandowski@demo.plonbli.pl",
    name: "[DEMO] Tomek Lewandowski",
    role: "CONSUMER" as const,
    voivodeship: "mazowieckie",
    commune: "Warszawa",
  },
  {
    id: demoId("consumer_kaminska"),
    email: "ewa.kaminska@demo.plonbli.pl",
    name: "[DEMO] Ewa Kaminska",
    role: "CONSUMER" as const,
    voivodeship: "malopolskie",
    commune: "Krakow",
  },
  {
    id: demoId("consumer_dabrowska"),
    email: "katarzyna.dabrowska@demo.plonbli.pl",
    name: "[DEMO] Katarzyna Dabrowska",
    role: "CONSUMER" as const,
    voivodeship: "lubelskie",
    commune: "Lublin",
  },
];

const PRODUCTS = [
  // Kowalski — warzywa i owoce
  {
    id: demoId("prod_pomidory"),
    farmerId: demoId("farmer_kowalski"),
    name: "Pomidory malinowe",
    description: "Soczyste pomidory malinowe z naszego pola. Idealne na salatki i do jedzenia na surowo. Uprawa bez sztucznych nawozow.",
    categorySlug: "warzywa",
    method: "ECO" as const,
    tags: ["eko", "sezonowe", "bez oprysków"],
  },
  {
    id: demoId("prod_ogorki"),
    farmerId: demoId("farmer_kowalski"),
    name: "Ogorki gruntowe",
    description: "Chrupiace ogorki gruntowe, zbierane codziennie rano. Swietne do salatki i na kiszonki.",
    categorySlug: "warzywa",
    method: "ECO" as const,
    tags: ["eko", "sezonowe"],
  },
  {
    id: demoId("prod_jablka"),
    farmerId: demoId("farmer_kowalski"),
    name: "Jablka Szampion",
    description: "Jablka odmiany Szampion z naszego sadu. Slodkie, soczyste, idealne na szarlotke.",
    categorySlug: "owoce",
    method: "CONVENTIONAL" as const,
    tags: ["sad", "sezonowe"],
  },
  // Nowak — nabial i przetwory
  {
    id: demoId("prod_ser"),
    farmerId: demoId("farmer_nowak"),
    name: "Ser gorski bundzowy",
    description: "Tradycyjny ser bundzowy robiony recznie wedlug receptury mojej babci. Z mleka krow pasacych sie na halach.",
    categorySlug: "nabial",
    method: "OTHER" as const,
    tags: ["tradycyjne", "goralskie"],
  },
  {
    id: demoId("prod_dzem"),
    farmerId: demoId("farmer_nowak"),
    name: "Dzem sliwkowy",
    description: "Domowy dzem ze sliwek wegierek. Bez konserwantow, z minimalna iloscia cukru.",
    categorySlug: "przetwory",
    method: "ECO" as const,
    tags: ["domowe", "bez konserwantow"],
  },
  // Wisniewski — miod i ziola
  {
    id: demoId("prod_miod"),
    farmerId: demoId("farmer_wisniewski"),
    name: "Miod wielokwiatowy",
    description: "Miod wielokwiatowy z pasieki nad Wisla. Niefiltrowany, niepasteryzowany. Bezposrednio z ula.",
    categorySlug: "miod",
    method: "ECO" as const,
    tags: ["eko", "surowy", "pasieka"],
  },
  {
    id: demoId("prod_ziola"),
    farmerId: demoId("farmer_wisniewski"),
    name: "Mieszanka ziol leczniczych",
    description: "Suszone ziola: mięta, melisa, rumianek, lawenda. Zbierane recznie z naszych lak.",
    categorySlug: "ziola",
    method: "ECO" as const,
    tags: ["eko", "suszone", "recznie zbierane"],
  },
  // Zielinska — mieso i pieczywo
  {
    id: demoId("prod_jaja"),
    farmerId: demoId("farmer_zielinska"),
    name: "Jaja z wolnego wybiegu",
    description: "Jaja od kur z wolnego wybiegu karmionych ziarnem i resztkami warzywnymi. Zolte zoltka gwarantowane.",
    categorySlug: "nabial",
    method: "ECO" as const,
    tags: ["wolny wybieg", "eko"],
  },
  {
    id: demoId("prod_chleb"),
    farmerId: demoId("farmer_zielinska"),
    name: "Chleb na zakwasie",
    description: "Chleb zytni na naturalnym zakwasie, pieczony w piecu opalanym drewnem. Bez drozdzy, bez ulepszaczy.",
    categorySlug: "pieczywo",
    method: "OTHER" as const,
    tags: ["zakwas", "tradycyjne", "piec chlebowy"],
  },
];

const LISTINGS: Array<{
  id: string;
  productId: string;
  price: string;
  unit: "KG" | "PIECE" | "LITER" | "BUNCH";
  quantityAvailable: string;
  availability: "AVAILABLE" | "SEASONAL" | "OUT_OF_STOCK";
  deliveryOptions: DeliveryOption[];
}> = [
  {
    id: demoId("list_pomidory"),
    productId: demoId("prod_pomidory"),
    price: "12.00",
    unit: "KG",
    quantityAvailable: "200.00",
    availability: "AVAILABLE",
    deliveryOptions: [
      { type: "PICKUP", address: "ul. Polna 15, Garwolin", hours: "Pn-Sb 8-18" },
      { type: "DELIVERY", address: "pow. garwolinski", cost: 15 },
    ],
  },
  {
    id: demoId("list_ogorki"),
    productId: demoId("prod_ogorki"),
    price: "8.00",
    unit: "KG",
    quantityAvailable: "150.00",
    availability: "AVAILABLE",
    deliveryOptions: [
      { type: "PICKUP", address: "ul. Polna 15, Garwolin" },
    ],
  },
  {
    id: demoId("list_jablka"),
    productId: demoId("prod_jablka"),
    price: "5.50",
    unit: "KG",
    quantityAvailable: "500.00",
    availability: "SEASONAL",
    deliveryOptions: [
      { type: "PICKUP", address: "Sad, Garwolin" },
      { type: "DELIVERY", cost: 20, radius: 50 },
    ],
  },
  {
    id: demoId("list_ser"),
    productId: demoId("prod_ser"),
    price: "45.00",
    unit: "KG",
    quantityAvailable: "30.00",
    availability: "AVAILABLE",
    deliveryOptions: [
      { type: "PICKUP", address: "Targ w Starym Saczu", hours: "Sb 8-13" },
    ],
  },
  {
    id: demoId("list_dzem"),
    productId: demoId("prod_dzem"),
    price: "18.00",
    unit: "PIECE",
    quantityAvailable: "50.00",
    availability: "AVAILABLE",
    deliveryOptions: [
      { type: "PICKUP", address: "Stary Sacz" },
      { type: "DELIVERY", cost: 12 },
    ],
  },
  {
    id: demoId("list_miod"),
    productId: demoId("prod_miod"),
    price: "55.00",
    unit: "PIECE",
    quantityAvailable: "80.00",
    availability: "AVAILABLE",
    deliveryOptions: [
      { type: "PICKUP", address: "Pasieka, Pulawy" },
      { type: "DELIVERY", address: "Pulawy/Lublin", cost: 10 },
    ],
  },
  {
    id: demoId("list_ziola"),
    productId: demoId("prod_ziola"),
    price: "12.00",
    unit: "PIECE",
    quantityAvailable: "100.00",
    availability: "AVAILABLE",
    deliveryOptions: [
      { type: "DELIVERY", cost: 8 },
    ],
  },
  {
    id: demoId("list_jaja"),
    productId: demoId("prod_jaja"),
    price: "1.50",
    unit: "PIECE",
    quantityAvailable: "300.00",
    availability: "AVAILABLE",
    deliveryOptions: [
      { type: "PICKUP", address: "Tyczyn", hours: "codziennie 7-17" },
    ],
  },
  {
    id: demoId("list_chleb"),
    productId: demoId("prod_chleb"),
    price: "14.00",
    unit: "PIECE",
    quantityAvailable: "20.00",
    availability: "AVAILABLE",
    deliveryOptions: [
      { type: "PICKUP", address: "Piekarnia, Tyczyn", hours: "Sr-Pt 6-14" },
    ],
  },
];

const GROUPS = [
  {
    id: demoId("group_wawa"),
    name: "[DEMO] Grupa zakupowa Warszawa-Mokotow",
    description: "Wspolne zakupy od lokalnych rolnikow dla mieszkancow Mokotowa i okolic. Zbiorki co 2 tygodnie.",
    type: "BUYING_GROUP" as const,
    joinPolicy: "OPEN" as const,
    createdBy: demoId("consumer_lewandowski"),
    voivodeship: "mazowieckie",
    commune: "Warszawa",
  },
  {
    id: demoId("group_krakow"),
    name: "[DEMO] Eko Krakow — swiezo z pola",
    description: "Spolecznosc milosnikow ekologicznej zywnosci w Krakowie. Wymieniamy sie kontaktami do sprawdzonych rolnikow.",
    type: "COMMUNITY" as const,
    joinPolicy: "OPEN" as const,
    createdBy: demoId("consumer_kaminska"),
    voivodeship: "malopolskie",
    commune: "Krakow",
  },
  {
    id: demoId("group_lublin"),
    name: "[DEMO] Kooperatywa spozywcza Lublin",
    description: "Zamawiamy wspolnie od rolnikow z Lubelszczyzny. Punkt odbioru w centrum Lublina.",
    type: "BUYING_GROUP" as const,
    joinPolicy: "OPEN" as const,
    createdBy: demoId("consumer_dabrowska"),
    voivodeship: "lubelskie",
    commune: "Lublin",
  },
];

const EVENTS = [
  {
    id: demoId("event_targ"),
    creatorId: demoId("farmer_kowalski"),
    title: "[DEMO] Targ rolniczy w Garwolinie",
    description: "Coniedzielny targ na rynku w Garwolinie. Warzywa, owoce, nabiał prosto od producentów.",
    type: "MARKET" as const,
    location: "Rynek Glowny, Garwolin",
    latitude: "51.643",
    longitude: "21.615",
    startDate: futureDate(3, 8),
    endDate: futureDate(3, 14),
    recurrence: "WEEKLY" as const,
  },
  {
    id: demoId("event_dzien"),
    creatorId: demoId("farmer_nowak"),
    title: "[DEMO] Dzien otwarty — serowarnia Nowak",
    description: "Zapraszamy na zwiedzanie naszej serowarni! Pokaz robienia sera, degustacja, mozliwosc zakupu.",
    type: "OPEN_DAY" as const,
    location: "ul. Gorska 12, Stary Sacz",
    latitude: "49.556",
    longitude: "20.634",
    startDate: futureDate(7, 10),
    endDate: futureDate(7, 16),
  },
  {
    id: demoId("event_spotkanie"),
    creatorId: demoId("consumer_kaminska"),
    groupId: demoId("group_krakow"),
    title: "[DEMO] Spotkanie grupy — planowanie sezonu",
    description: "Omawiamy plan zamowien na wiosne/lato. Ustalamy dostawcow i grafik zbiorek.",
    type: "MEETUP" as const,
    location: "Kawiarnia Nowa Prowincja, Krakow",
    startDate: futureDate(5, 18),
    endDate: futureDate(5, 20),
  },
];

const POSTS = [
  {
    id: demoId("post_sezon"),
    authorId: demoId("farmer_kowalski"),
    content: "[DEMO] Sezon na pomidory malinowe w pelni! W tym roku wyjatkowo udane — soczyste, slodkie, pachnace latem. Zapraszam po odbior lub zamawiam na plonbli. Ilosc ograniczona! 🍅",
    type: "POST" as const,
    visibility: "PUBLIC" as const,
  },
  {
    id: demoId("post_ser"),
    authorId: demoId("farmer_nowak"),
    content: "[DEMO] Nowa partia sera bundzowego gotowa! Dojrzewala 3 tygodnie, smak wyrazisty. Dla stalych klientow mala niespodzianka przy zamowieniu powyzej 2 kg 😊",
    type: "POST" as const,
    visibility: "PUBLIC" as const,
  },
  {
    id: demoId("post_group_zbiorka"),
    authorId: demoId("consumer_lewandowski"),
    groupId: demoId("group_wawa"),
    content: "[DEMO] Hej! Kto chetny na wspolna zbiorke pomidorow od Jana Kowalskiego? Cena 12 zl/kg, ale przy zamowieniu powyzej 50 kg rolnik dowiezie nam pod drzwi za darmo! Zbieram chenych do piatku.",
    type: "POST" as const,
    visibility: "GROUP" as const,
  },
  {
    id: demoId("post_miod"),
    authorId: demoId("farmer_wisniewski"),
    content: "[DEMO] Wlasnie zakonczylismy miodobranie! Miod wielokwiatowy — tegoroczny, nie filtrowany, pachnie lakami nad Wisla. Sloiki 0.9l juz do kupienia na plonbli. Zapas ograniczony!",
    type: "POST" as const,
    visibility: "PUBLIC" as const,
  },
  {
    id: demoId("post_przepis"),
    authorId: demoId("consumer_kaminska"),
    groupId: demoId("group_krakow"),
    content: "[DEMO] Zrobilam wczoraj tarte z serem od Anny Nowak i pomidorami z Garwolina — palce lizac! Polecam polaczenie bundzowego sera z bazylią i suszonymi pomidorami. Ktos chce przepis?",
    type: "POST" as const,
    visibility: "GROUP" as const,
  },
];

const CROP_LOGS = [
  {
    id: demoId("crop_sadzenie"),
    farmerId: demoId("farmer_kowalski"),
    productId: demoId("prod_pomidory"),
    type: "PLANTING" as const,
    description: "Wysadzono sadzonki pomidorow malinowych — 500 sztuk na polu nr 3. Odm. Malinowy Ozarowski.",
    data: { crop: "pomidory malinowe", area: "0.3 ha", quantity: "500 szt" },
  },
  {
    id: demoId("crop_podlewanie"),
    farmerId: demoId("farmer_kowalski"),
    productId: demoId("prod_pomidory"),
    type: "GROWING" as const,
    description: "System nawadniania kropelkowego uruchomiony. Podsciolka ze slomy rozlozona. Rosliny w dobrej kondycji.",
    data: { method: "nawadnianie kropelkowe" },
  },
  {
    id: demoId("crop_zbiory"),
    farmerId: demoId("farmer_kowalski"),
    productId: demoId("prod_pomidory"),
    type: "HARVEST" as const,
    description: "Pierwszy zbior sezonu — 120 kg pomidorow malinowych. Jakosc bardzo dobra, bez chorob.",
    data: { crop: "pomidory malinowe", quantity: "120 kg" },
  },
];

// ---------------------------------------------------------------------------
// SEED
// ---------------------------------------------------------------------------

async function seed() {
  console.log("🌱 Seeding demo data...\n");

  // 1. Categories — use existing ones from DB
  console.log("  📂 Resolving categories...");
  const existingCats = await db.select({ id: schema.categories.id, slug: schema.categories.slug }).from(schema.categories);
  for (const cat of existingCats) {
    categoryIdBySlug[cat.slug] = cat.id;
  }
  const missingSlugs = Object.values(CATEGORY_SLUGS).filter((s) => !categoryIdBySlug[s]);
  if (missingSlugs.length > 0) {
    console.error(`  ❌ Missing categories: ${missingSlugs.join(", ")}. Run category seed first.`);
    process.exit(1);
  }

  // 2. Users (farmers + consumers)
  console.log("  👤 Users...");
  const allUsers = [...FARMERS, ...CONSUMERS].map((u) => ({
    ...u,
    passwordHash: DEMO_PASSWORD_HASH,
  }));
  for (const user of allUsers) {
    await db
      .insert(schema.users)
      .values(user)
      .onConflictDoUpdate({
        target: schema.users.id,
        set: { name: user.name },
      });
  }

  // 3. Products
  console.log("  🥕 Products...");
  for (const prod of PRODUCTS) {
    const { categorySlug, ...rest } = prod;
    await db
      .insert(schema.products)
      .values({ ...rest, categoryId: categoryIdBySlug[categorySlug] })
      .onConflictDoUpdate({ target: schema.products.id, set: { name: prod.name } });
  }

  // 4. Listings
  console.log("  📋 Listings...");
  for (const listing of LISTINGS) {
    await db.insert(schema.listings).values(listing).onConflictDoUpdate({ target: schema.listings.id, set: { price: listing.price } });
  }

  // 5. Groups
  console.log("  👥 Groups...");
  for (const group of GROUPS) {
    await db.insert(schema.groups).values(group).onConflictDoUpdate({ target: schema.groups.id, set: { name: group.name } });
  }

  // 6. Group members (creators + some cross-membership)
  console.log("  🤝 Group members...");
  const groupMemberships = [
    // Creators as admins
    { groupId: demoId("group_wawa"), userId: demoId("consumer_lewandowski"), role: "ADMIN" as const },
    { groupId: demoId("group_krakow"), userId: demoId("consumer_kaminska"), role: "ADMIN" as const },
    { groupId: demoId("group_lublin"), userId: demoId("consumer_dabrowska"), role: "ADMIN" as const },
    // Cross members
    { groupId: demoId("group_wawa"), userId: demoId("consumer_dabrowska"), role: "MEMBER" as const },
    { groupId: demoId("group_wawa"), userId: demoId("farmer_kowalski"), role: "MEMBER" as const },
    { groupId: demoId("group_krakow"), userId: demoId("farmer_nowak"), role: "MEMBER" as const },
    { groupId: demoId("group_krakow"), userId: demoId("consumer_dabrowska"), role: "MEMBER" as const },
    { groupId: demoId("group_lublin"), userId: demoId("farmer_wisniewski"), role: "MEMBER" as const },
    { groupId: demoId("group_lublin"), userId: demoId("consumer_lewandowski"), role: "MEMBER" as const },
  ];
  for (const m of groupMemberships) {
    await db.insert(schema.groupMembers).values(m).onConflictDoUpdate({ target: [schema.groupMembers.groupId, schema.groupMembers.userId], set: { role: m.role } });
  }

  // 7. Events
  console.log("  📅 Events...");
  for (const event of EVENTS) {
    await db.insert(schema.events).values(event).onConflictDoUpdate({ target: schema.events.id, set: { title: event.title } });
  }

  // 8. Event RSVPs
  console.log("  ✋ Event RSVPs...");
  const rsvps = [
    { eventId: demoId("event_targ"), userId: demoId("consumer_lewandowski"), status: "GOING" as const },
    { eventId: demoId("event_targ"), userId: demoId("consumer_kaminska"), status: "INTERESTED" as const },
    { eventId: demoId("event_dzien"), userId: demoId("consumer_kaminska"), status: "GOING" as const },
    { eventId: demoId("event_dzien"), userId: demoId("consumer_dabrowska"), status: "GOING" as const },
    { eventId: demoId("event_spotkanie"), userId: demoId("consumer_kaminska"), status: "GOING" as const },
    { eventId: demoId("event_spotkanie"), userId: demoId("farmer_nowak"), status: "GOING" as const },
  ];
  for (const rsvp of rsvps) {
    await db.insert(schema.eventRsvps).values(rsvp).onConflictDoUpdate({ target: [schema.eventRsvps.eventId, schema.eventRsvps.userId], set: { status: rsvp.status } });
  }

  // 9. Posts
  console.log("  📝 Posts...");
  for (const post of POSTS) {
    await db.insert(schema.posts).values(post).onConflictDoUpdate({ target: schema.posts.id, set: { content: post.content } });
  }

  // 10. Comments
  console.log("  💬 Comments...");
  const demoComments = [
    {
      id: demoId("comment_1"),
      postId: demoId("post_sezon"),
      authorId: demoId("consumer_lewandowski"),
      content: "[DEMO] Super! Ile kg mozna zamowic naraz?",
    },
    {
      id: demoId("comment_2"),
      postId: demoId("post_sezon"),
      authorId: demoId("farmer_kowalski"),
      content: "[DEMO] Bez limitu, ale przy wiekszych zamowieniach prosze pisac dzien wczesniej 😄",
    },
    {
      id: demoId("comment_3"),
      postId: demoId("post_ser"),
      authorId: demoId("consumer_kaminska"),
      content: "[DEMO] Pani Anno, czy da sie zamowic z dostawa do Krakowa?",
    },
  ];
  for (const comment of demoComments) {
    await db.insert(schema.comments).values(comment).onConflictDoUpdate({ target: schema.comments.id, set: { content: comment.content } });
  }

  // 11. Reactions
  console.log("  ❤️  Reactions...");
  const demoReactions = [
    { postId: demoId("post_sezon"), userId: demoId("consumer_lewandowski") },
    { postId: demoId("post_sezon"), userId: demoId("consumer_kaminska") },
    { postId: demoId("post_sezon"), userId: demoId("consumer_dabrowska") },
    { postId: demoId("post_ser"), userId: demoId("consumer_kaminska") },
    { postId: demoId("post_ser"), userId: demoId("consumer_lewandowski") },
    { postId: demoId("post_miod"), userId: demoId("consumer_dabrowska") },
    { postId: demoId("post_miod"), userId: demoId("consumer_kaminska") },
    { postId: demoId("post_przepis"), userId: demoId("farmer_nowak") },
  ];
  for (const r of demoReactions) {
    await db.insert(schema.reactions).values(r).onConflictDoUpdate({ target: [schema.reactions.postId, schema.reactions.userId], set: { postId: r.postId } });
  }

  // 12. Follows
  console.log("  👀 Follows...");
  const demoFollows = [
    { followerId: demoId("consumer_lewandowski"), followeeId: demoId("farmer_kowalski") },
    { followerId: demoId("consumer_lewandowski"), followeeId: demoId("farmer_wisniewski") },
    { followerId: demoId("consumer_kaminska"), followeeId: demoId("farmer_nowak") },
    { followerId: demoId("consumer_kaminska"), followeeId: demoId("farmer_kowalski") },
    { followerId: demoId("consumer_dabrowska"), followeeId: demoId("farmer_wisniewski") },
    { followerId: demoId("consumer_dabrowska"), followeeId: demoId("farmer_zielinska") },
    { followerId: demoId("farmer_nowak"), followeeId: demoId("farmer_kowalski") },
  ];
  for (const f of demoFollows) {
    await db.insert(schema.follows).values(f).onConflictDoUpdate({ target: [schema.follows.followerId, schema.follows.followeeId], set: { followerId: f.followerId } });
  }

  // 13. Reviews (with hash chain)
  console.log("  ⭐ Reviews...");
  const reviewsData = [
    {
      id: demoId("review_1"),
      reviewerId: demoId("consumer_lewandowski"),
      targetId: demoId("farmer_kowalski"),
      productId: demoId("prod_pomidory"),
      overall: 5,
      dimensions: { quality: 5, communication: 5, punctuality: 5, accuracy: 5 },
      comment: "[DEMO] Najlepsze pomidory jakie jadles! Swietny kontakt z rolnikiem, polecam kazdemu.",
    },
    {
      id: demoId("review_2"),
      reviewerId: demoId("consumer_kaminska"),
      targetId: demoId("farmer_nowak"),
      productId: demoId("prod_ser"),
      overall: 5,
      dimensions: { quality: 5, communication: 4, punctuality: 5, accuracy: 5 },
      comment: "[DEMO] Ser bundzowy z innej planety. Smak nieporownywalny do sklepowego. Bede stala klientka!",
    },
    {
      id: demoId("review_3"),
      reviewerId: demoId("consumer_dabrowska"),
      targetId: demoId("farmer_wisniewski"),
      productId: demoId("prod_miod"),
      overall: 4,
      dimensions: { quality: 5, communication: 4, punctuality: 3, accuracy: 4 },
      comment: "[DEMO] Miod swietny, naturalny smak. Lekkie opoznienie w dostawie ale produkt wart czekania.",
    },
  ];

  let prevHash: string | null = null;
  for (const r of reviewsData) {
    const contentHash = sha256(
      JSON.stringify({
        reviewerId: r.reviewerId,
        targetId: r.targetId,
        dimensions: r.dimensions,
        timestamp: new Date().toISOString(),
      })
    );
    await db
      .insert(schema.reviews)
      .values({ ...r, contentHash, previousHash: prevHash })
      .onConflictDoUpdate({ target: schema.reviews.id, set: { comment: r.comment } });
    prevHash = contentHash;
  }

  // 14. Crop logs (with hash chain)
  console.log("  🌿 Crop logs...");
  let cropPrevHash: string | null = null;
  for (const log of CROP_LOGS) {
    const contentHash = sha256(
      JSON.stringify({
        farmerId: log.farmerId,
        type: log.type,
        description: log.description,
        timestamp: new Date().toISOString(),
      })
    );
    await db
      .insert(schema.cropLogs)
      .values({ ...log, contentHash, previousHash: cropPrevHash })
      .onConflictDoUpdate({ target: schema.cropLogs.id, set: { description: log.description } });
    cropPrevHash = contentHash;
  }

  // 15. Pickup points
  console.log("  📍 Pickup points...");
  const pickupPoints = [
    {
      id: demoId("pickup_garwolin"),
      createdBy: demoId("farmer_kowalski"),
      name: "[DEMO] Gospodarstwo Kowalski — Garwolin",
      description: "Odbior z gospodarstwa. Parking przy wjezdzie.",
      address: "ul. Polna 15, 08-400 Garwolin",
      latitude: "51.643",
      longitude: "21.615",
      hours: "Pn-Sb 8:00-18:00",
    },
    {
      id: demoId("pickup_lublin"),
      createdBy: demoId("consumer_dabrowska"),
      name: "[DEMO] Punkt odbioru Lublin Centrum",
      description: "Odbior przy parkingu za Galerią Lublin Plaza.",
      address: "ul. Lipowa 1, 20-020 Lublin",
      latitude: "51.246",
      longitude: "22.568",
      hours: "Sb 10:00-14:00",
    },
  ];
  for (const pp of pickupPoints) {
    await db.insert(schema.pickupPoints).values(pp).onConflictDoUpdate({ target: schema.pickupPoints.id, set: { name: pp.name } });
  }

  // 16. Collections
  console.log("  📦 Collections...");
  const collections = [
    {
      id: demoId("coll_pomidory"),
      groupId: demoId("group_wawa"),
      listingId: demoId("list_pomidory"),
      coordinatorId: demoId("consumer_lewandowski"),
      title: "[DEMO] Zbiorka na pomidory malinowe — lipiec",
      description: "Wspolne zamowienie pomidorow od Jana Kowalskiego. Przy 50+ kg darmowy dowoz na Mokotow!",
      status: "COLLECTING" as const,
      targetAmount: "80.00",
      pickupAddress: "ul. Pulawska 120, Warszawa (parking Biedronka)",
      pickupDate: futureDate(10, 16),
    },
    {
      id: demoId("coll_miod"),
      groupId: demoId("group_lublin"),
      listingId: demoId("list_miod"),
      coordinatorId: demoId("consumer_dabrowska"),
      title: "[DEMO] Miod wielokwiatowy — zamowienie grupowe",
      description: "Zamawiamy miod od Piotra Wisniewskiego. Sloik 0.9l za 55 zl. Odbior w Lublinie.",
      status: "COLLECTING" as const,
      targetAmount: "20.00",
    },
  ];
  for (const c of collections) {
    await db.insert(schema.collections).values(c).onConflictDoUpdate({ target: schema.collections.id, set: { title: c.title } });
  }

  // 17. Collection items
  console.log("  🛒 Collection items...");
  const collectionItems = [
    { collectionId: demoId("coll_pomidory"), userId: demoId("consumer_lewandowski"), quantity: "15.00", note: "Moze byc troche niedojrzalych tez" },
    { collectionId: demoId("coll_pomidory"), userId: demoId("consumer_dabrowska"), quantity: "10.00" },
    { collectionId: demoId("coll_miod"), userId: demoId("consumer_dabrowska"), quantity: "3.00", note: "3 sloiki prosze" },
    { collectionId: demoId("coll_miod"), userId: demoId("consumer_lewandowski"), quantity: "2.00" },
  ];
  for (const ci of collectionItems) {
    await db.insert(schema.collectionItems).values(ci).onConflictDoUpdate({ target: [schema.collectionItems.collectionId, schema.collectionItems.userId], set: { quantity: ci.quantity } });
  }

  console.log("\n✅ Demo data seeded successfully!");
  console.log("   All demo IDs start with 'demo_'");
  console.log("   All demo user names start with '[DEMO]'");
  console.log("   Login: any @demo.plonbli.pl email, password: demo1234");
}

// ---------------------------------------------------------------------------
// CLEANUP
// ---------------------------------------------------------------------------

async function cleanup() {
  console.log("🧹 Removing demo data...\n");

  // Delete in reverse dependency order
  const tables = [
    { name: "collection_items", table: schema.collectionItems, col: schema.collectionItems.collectionId },
    { name: "collections", table: schema.collections, col: schema.collections.id },
    { name: "pickup_points", table: schema.pickupPoints, col: schema.pickupPoints.id },
    { name: "crop_logs", table: schema.cropLogs, col: schema.cropLogs.id },
    { name: "reviews", table: schema.reviews, col: schema.reviews.id },
    { name: "follows", table: schema.follows, col: schema.follows.followerId },
    { name: "reactions", table: schema.reactions, col: schema.reactions.postId },
    { name: "comments", table: schema.comments, col: schema.comments.id },
    { name: "posts", table: schema.posts, col: schema.posts.id },
    { name: "event_rsvps", table: schema.eventRsvps, col: schema.eventRsvps.eventId },
    { name: "events", table: schema.events, col: schema.events.id },
    { name: "group_members", table: schema.groupMembers, col: schema.groupMembers.groupId },
    { name: "groups", table: schema.groups, col: schema.groups.id },
    { name: "listings", table: schema.listings, col: schema.listings.id },
    { name: "products", table: schema.products, col: schema.products.id },
    { name: "users", table: schema.users, col: schema.users.id },
  ];

  for (const { name, table, col } of tables) {
    const result = await db.delete(table).where(like(col, `${DEMO_PREFIX}%`));
    console.log(`  ❌ ${name}`);
  }

  console.log("\n✅ Demo data removed!");
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------

const isCleanup = process.argv.includes("--cleanup");

(isCleanup ? cleanup() : seed())
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Error:", err);
    process.exit(1);
  });
