# Plonbli — Platform Design Spec

> Farmer-consumer marketplace + social platform (PWA)
> Eliminates supply chain middlemen, connects local communities.

## 1. Vision & Goals

- Connect farmers directly with consumers based on geolocation
- Enable self-organization of consumer buying groups and farmer communities
- Provide transparent product provenance (crop documentation, reviews)
- Combine marketplace with social media for stronger local communities
- Blockchain-ready data layer for farming logs and reputation

## 2. Target Users

- **Farmers** — sell products, document crops, manage deliveries
- **Consumers** — find local products, organize group purchases, review farmers
- **Both** — a user can be both farmer and consumer
- Individual users can create/join groups (buying groups, communities)

## 3. Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router, Server Actions, Server Components) |
| UI | shadcn/ui + Tailwind CSS |
| Database | PostgreSQL + PostGIS (Neon serverless) |
| ORM | Drizzle |
| Auth | NextAuth.js v5 (email+password, Google, Facebook) |
| Real-time | WebSockets (chat) + SSE (feed, notifications) |
| i18n | next-intl (Polish default, prepared for more) |
| Validation | Zod (shared schemas frontend/backend) |
| PWA | next-pwa (service worker, manifest, offline) |
| Storage | S3-compatible (Cloudflare R2) |
| Search | PostgreSQL tsvector/tsquery (Polish dictionary) |

## 4. Architecture

Monolithic Next.js with domain-driven internal structure.

```
src/
  app/                    # Next.js routes
  domains/
    auth/                 # authentication, sessions
    marketplace/          # listings, products, search
    social/               # feed, posts, groups, events
    messaging/            # chat 1:1, group, channels
    farming/              # crop documentation (blockchain-ready)
    reputation/           # reviews, reputation (blockchain-ready)
    logistics/            # delivery, pickup points, coordination
    geo/                  # geolocation, administrative hierarchy
  shared/
    ui/                   # shadcn components, themes
    db/                   # schema, migrations, connection
    lib/                  # utils, types, validation
```

**Blockchain-ready principle:** Domains `farming` and `reputation` use repository pattern — interface separates logic from storage. Today: PostgreSQL implementation. Future: swap to blockchain implementation without changing the rest of the app.

## 5. Data Model

### 5.1 Users & Auth

```
User
  - id, email, passwordHash?, name, avatar
  - role: FARMER | CONSUMER | BOTH
  - location: POINT (PostGIS, optional)
  - address: voivodeship, county, commune, postalCode
  - createdAt, updatedAt

AuthAccount (social login)
  - provider: GOOGLE | FACEBOOK
  - providerAccountId
  - userId -> User
```

### 5.2 Groups

```
Group
  - id, name, description, avatar
  - type: BUYING_GROUP | COMMUNITY
  - location (address like User)
  - joinPolicy: OPEN | INVITE_ONLY
  - createdBy -> User

GroupMember
  - userId -> User, groupId -> Group
  - role: ADMIN | MEMBER
```

### 5.3 Marketplace

```
Product
  - id, farmerId -> User
  - name, description, category, subcategory, images[]
  - tags: string[] (eco, gluten-free, vegan, etc.)
  - method: ECO | CONVENTIONAL | OTHER

Listing
  - id, productId -> Product
  - price, unit (kg/piece/l), quantityAvailable
  - availability: AVAILABLE | SEASONAL | OUT_OF_STOCK
  - validUntil: date
  - deliveryOptions: DeliveryOption[]

DeliveryOption
  - type: PICKUP | DELIVERY | DROP_POINT
  - address?, radius?, minAmount?, cost?
  - hours? (for pickup)

ProductCategory
  - id, name, parentId? -> ProductCategory
  (Warzywa, Owoce, Nabial, Mieso, Pieczywo, Przetwory, Miod, Jaja, Ziola, Inne)
```

### 5.4 Social

```
Post
  - id, authorId -> User, groupId? -> Group
  - content, images[] (max 10)
  - type: POST | ANNOUNCEMENT
  - visibility: PUBLIC | GROUP | FOLLOWERS
  - createdAt

Comment
  - id, postId -> Post, authorId -> User
  - content, createdAt

Reaction
  - postId -> Post, userId -> User
  - type: LIKE

Follow
  - followerId -> User, followeeId -> User
```

### 5.5 Events

```
Event
  - id, creatorId -> User, groupId? -> Group
  - title, description, location (address + POINT)
  - startDate, endDate
  - recurrence?: WEEKLY | BIWEEKLY | MONTHLY
  - type: MARKET | OPEN_DAY | MEETUP | OTHER

EventRSVP
  - userId -> User, eventId -> Event
  - status: GOING | INTERESTED | NOT_GOING
```

### 5.6 Messaging

```
Conversation
  - id, type: DIRECT | GROUP | CHANNEL
  - groupId? -> Group (for group channels)

ConversationMember
  - conversationId, userId
  - role: MEMBER | ADMIN
  - muted: boolean

Message
  - id, conversationId -> Conversation
  - senderId -> User
  - content, images[] (max 5)
  - status: SENT | DELIVERED | READ
  - createdAt
```

### 5.7 Farming (blockchain-ready)

```
CropLog
  - id, farmerId -> User
  - productId? -> Product
  - type: PLANTING | GROWING | TREATMENT | HARVEST | OTHER
  - description, images[]
  - data: JSON { crop, area?, quantity?, method? }
  - contentHash: SHA-256(content + image_hashes + timestamp + farmerId)
  - previousHash -> previous CropLog hash for this farmer
  - createdAt (immutable)
```

Auto-tagging of entry type from content (simple keyword matching on start, NLP later). Farmer can manually correct.

Repository interface:
```typescript
interface CropLogRepository {
  create(entry: CropLogEntry): Promise<CropLog>
  getByFarmer(farmerId: string): Promise<CropLog[]>
  getByProduct(productId: string): Promise<CropLog[]>
  verify(entryId: string): Promise<boolean>
}
```

### 5.8 Reputation (blockchain-ready)

```
Review
  - id, reviewerId -> User, targetId -> User
  - productId? -> Product
  - overall: 1-5 (visible stars)
  - dimensions: JSON { quality?, communication?, punctuality?, accuracy? }
  - comment?
  - contentHash: SHA-256(reviewerId + targetId + dimensions + timestamp)
  - previousHash -> previous review hash by this reviewer
  - createdAt (immutable, no edits — new review = new entry)
```

Farmer reputation profile: average rating, review count, tenure, transaction count, badges.
Consumer reputation (lighter): pickup reliability, communication.
Moderation: flag inappropriate reviews, admin review queue.

## 6. Geolocation & Search

### Administrative hierarchy (TERYT/GUS data)

```
AdministrativeArea
  - id, name, type: VOIVODESHIP | COUNTY | COMMUNE
  - parentId? -> AdministrativeArea
  - boundary: POLYGON (PostGIS)

PostalCode
  - code, communeId -> AdministrativeArea
  - center: POINT (PostGIS)
```

### Search methods
1. Administrative hierarchy: voivodeship -> county -> commune (cascading filter)
2. Postal code + radius
3. Device GPS + radius (optional, with user consent)
4. Combination of above

All methods resolve to: `ST_DWithin(product.location, :userLocation, :radius)`

### Sorting
- Default: distance (nearest first)
- Optional: rating, price, newest

### Indexes
- GiST indexes on all geometry columns

### Product search & filtering
- Full-text: PostgreSQL tsvector + tsquery (Polish dictionary with stemming)
- Filters: category, subcategory, location, price range, farming method, farmer rating, availability

## 7. Real-time Communication

### WebSockets (chat)
- 1:1 and group chat: instant message delivery
- Message status: sent -> delivered -> read
- Typing indicators

### SSE (feed, notifications)
- New posts in feed
- Event reminders (24h and 1h before)
- Group buying updates (new participants, status changes)
- Broadcast channels (admin -> group members)

### Push Notifications (Web Push API)
- New messages
- Event reminders
- Group buying updates
- Configurable per user (mute conversation/group)

## 8. Logistics & Group Buying

### Delivery options (per listing)
- **Personal pickup** — farm address, available hours
- **Delivery** — radius, minimum order amount, delivery cost
- **Drop point** — predefined locations (parking, shop, etc.)

### Group buying coordination
- Group member creates a "collection" for a product/farmer
- Others join — see progress toward minimum / free delivery threshold
- Status flow: COLLECTING -> COLLECTED -> ORDERED -> IN_DELIVERY -> RECEIVED
- Designated coordinator (pickup point = their address or agreed location)

## 9. Themes & PWA

### Two themes
- **Light (earthy/natural):** warm tones — beiges, greens, browns. Inspiration: earth, plants, nature. Default.
- **Dark (modern/clean):** dark backgrounds, contrast accents, sharp lines. Inspiration: minimalism, technology.
- Toggle in settings + respects `prefers-color-scheme`
- Implementation: shadcn/ui themes with CSS variables in Tailwind

### PWA
- `manifest.json` — icon, splash screen, standalone display
- Service Worker:
  - Cache: app shell, recent data (feed, conversations)
  - Offline: browse cached data, queue messages/posts
  - Background sync: send queued actions when back online
- Install prompt: "Add to home screen"

### Image uploads
- Client-side compression before upload
- Storage: Cloudflare R2 (S3-compatible)
- Server-side thumbnail generation

### Security
- Rate limiting on API routes
- Input sanitization (XSS prevention)
- CSRF protection (built into Next.js Server Actions)
- Content Security Policy headers

## 10. Internationalization

- next-intl with Polish as default language
- All UI strings in translation files from day 1
- Prepared for additional languages without code changes
- Date/number formatting locale-aware

## 11. Monetization

- Free platform on start
- Architecture prepared for future monetization (no specific implementation now)
- Possible future models: transaction fees, premium farmer profiles, promoted listings

## 13. Key Decisions & Constraints

- **No Order/Payment system on start** — transactions happen off-platform (cash, transfer). Platform facilitates contact and coordination, not payment processing. This simplifies MVP and avoids payment gateway complexity.
- **Moderation is manual on start** — admin review queue for flagged content/reviews. Automated moderation (AI/filters) is a future improvement.
- **No native app** — PWA only. Native apps (React Native) are a potential future step if PWA limitations become blocking.
- **Single database** — all domains share one PostgreSQL instance. Splitting databases per domain is a future scaling concern, not a start concern.
- **Image storage external** — Cloudflare R2. No images stored in database.
- **Blockchain migration scope** — only `farming` (CropLog) and `reputation` (Review) domains are designed for blockchain migration. Other domains remain in PostgreSQL.

## 12. Build Phases

Each phase gets its own implementation plan and cycle:

### Phase 1: Foundation
- Next.js project, domain structure, database schema, auth, i18n, themes, PWA shell
- User profile (farmer/consumer/both), location, settings
- Result: working app with login and empty shell

### Phase 2: Marketplace
- Products, listings, categories, search, filtering
- Geolocation, administrative hierarchy, PostGIS queries
- Pages: listing list, product details, farmer profile, create listing

### Phase 3: Messaging
- 1:1 chat, WebSocket infrastructure
- Group chat
- Conversation list, notifications

### Phase 4: Social
- Feed, posts, comments, reactions, follow
- Groups (creation, management, group board)
- Broadcast channels (SSE)

### Phase 5: Events
- Creation, RSVP, recurrence
- Event map, calendar view
- Reminders (push notifications)

### Phase 6: Farming + Reputation
- Crop log (blockchain-ready, repository pattern)
- Review system (blockchain-ready)
- Badges, reputation profile

### Phase 7: Logistics
- Delivery options on listings
- Group buying coordination (collections, statuses)
- Pickup points
