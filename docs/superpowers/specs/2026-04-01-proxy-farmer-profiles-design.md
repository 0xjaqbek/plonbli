# Proxy Farmer Profiles (Profil-ambasador)

## Overview

Allow logged-in users to create farmer profiles on behalf of farmers who are not on the platform (e.g., non-technical farmers). These proxy profiles serve as business cards with informational product listings. They are clearly marked as proxy profiles, show who created them, and display the farmer's preferred contact methods.

A proxy profile is NOT a full account — the farmer does not log in or manage it. The creator manages it entirely.

## Data Model

### New table: `proxy_farmers`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | text (CUID2) | PK | Unique identifier |
| creatorId | text | FK→users, NOT NULL | User who created this proxy profile |
| name | varchar(255) | NOT NULL | Farmer's name |
| bio | text | nullable | Description of the farm/farmer |
| avatar | text | nullable | Profile image URL |
| voivodeship | varchar(50) | nullable | Polish administrative region |
| county | varchar(100) | nullable | County |
| commune | varchar(100) | nullable | Commune |
| latitude | text | nullable | For map display |
| longitude | text | nullable | For map display |
| contactMethods | jsonb | NOT NULL, default [] | Array of contact method objects |
| products | jsonb | NOT NULL, default [] | Array of informational product objects |
| createdAt | timestamp w/tz | NOT NULL, default now() | |
| updatedAt | timestamp w/tz | NOT NULL, default now() | |

### contactMethods JSON structure

Array of objects, each with:
- `type`: one of `"PHONE"`, `"EMAIL"`, `"IN_PERSON"`, `"PICKUP"`, `"OTHER"`
- `value`: string — the contact detail (phone number, email, address, description)
- `note`: string (optional) — additional context (e.g., "po 18:00", "tylko w weekendy")

At least one contact method is required.

```json
[
  { "type": "PHONE", "value": "123-456-789", "note": "po 18:00" },
  { "type": "IN_PERSON", "value": "targ w Krakowie, soboty 8-12" }
]
```

### products JSON structure

Array of informational product objects (no prices, no availability, no IDs):
- `name`: string — product name (required)
- `category`: string — free-text category label
- `method`: one of `"ECO"`, `"CONVENTIONAL"`, `"OTHER"` (optional)
- `description`: string (optional) — brief description

```json
[
  { "name": "Jajka wolnowybiegowe", "category": "nabial", "method": "ECO" },
  { "name": "Ziemniaki", "category": "warzywa", "method": "CONVENTIONAL", "description": "odmiany Vineta i Denar" }
]
```

## Business Rules

### Creation limits
- Any logged-in user can create proxy profiles
- Maximum **3** proxy farmer profiles per user account
- Enforce at creation time; display remaining quota in UI

### Lifecycle
- Creator can edit and delete the profile at any time
- Proxy profiles never convert to full accounts — if the farmer joins, they create a separate account
- No admin approval required for creation

### Social interactions
- **Reviews**: Users can leave reviews on proxy farmer profiles (reviews link to proxy_farmers.id instead of users.id — requires polymorphic target OR a new reviews table column)
- **Following**: Users can follow proxy farmer profiles (follows table needs polymorphic target support)
- **Sharing**: Proxy profiles can be shared as posts (new PROXY_FARMER entity type in shared_entity_type enum)
- **Messages**: Messages sent "to" a proxy farmer profile are delivered to the creator's conversations

### Display
- Proxy profiles appear on the farmers list page alongside regular farmers
- Proxy profiles appear on the farmers map (when coordinates are available)
- Always display a prominent **"Profil-ambasador"** badge
- Always show **"Profil utworzony przez [Creator Name]"** with link to creator's social profile
- Contact methods section is prominent and always visible

## Routes

| Route | Purpose |
|-------|---------|
| `/farmers/proxy/create` | Creation form |
| `/farmers/proxy/[id]` | Public profile view |
| `/farmers/proxy/[id]/edit` | Edit form (creator only) |

## Pages and Components

### Creation/Edit Form (`/farmers/proxy/create`, `/farmers/proxy/[id]/edit`)
- Fields: name, bio, avatar (image upload), location (voivodeship/county/commune + GPS)
- Dynamic contact methods list: add/remove rows, each with type dropdown + value input + optional note
- Dynamic products list: add/remove rows, each with name + category + method dropdown + description
- Zod validation: name required, at least 1 contact method, max 10 products, max 5 contact methods

### Profile View (`/farmers/proxy/[id]`)
- **Banner**: "Profil-ambasador — utworzony przez [Name]" with distinct styling
- **Header**: Avatar, name, location, member-since date
- **Bio**: If present
- **Contact methods**: Prominent card with icons per type (Phone, Mail, MapPin, Home, MessageCircle)
- **Products**: Grid of simple cards showing name, category badge, farming method badge, description
- **Social**: Follow button, share button, reviews link, message button

### My Proxy Profiles (in user's profile page)
- Section listing the user's proxy farmer profiles (0-3)
- Each entry: name, location, edit/delete buttons
- "Create new" button (disabled with tooltip when at limit of 3)

### Farmers List Integration
- Query `proxy_farmers` alongside `users` with FARMER/BOTH role
- Proxy entries display with "ambasador" badge on the card
- Map markers for proxy farmers use a distinct marker style or color

## Validation Schemas (Zod)

### createProxyFarmerSchema
```
name: string, min 1, max 255
bio: string, max 1000, nullable, optional
avatar: string url, nullable, optional
voivodeship: enum(VOIVODESHIPS), nullable, optional
county: string, max 100, nullable, optional
commune: string, max 100, nullable, optional
latitude: string, nullable, optional
longitude: string, nullable, optional
contactMethods: array of { type: enum, value: string min 1, note: string optional }, min 1, max 5
products: array of { name: string min 1, category: string optional, method: enum optional, description: string optional }, max 10
```

## Integration with Existing Social Features

### Reviews
Add `proxyFarmerId` nullable column to `reviews` table. A review targets either `targetId` (user) OR `proxyFarmerId` (proxy farmer), never both. Query reviews for proxy farmer profile page using `proxyFarmerId`.

### Follows
Add `proxyFarmerId` nullable column to `follows` table. A follow targets either `followeeId` (user) OR `proxyFarmerId` (proxy farmer). Query follower count for proxy profile using `proxyFarmerId`.

### Sharing (Posts)
Add `PROXY_FARMER` to `shared_entity_type` enum. Resolve shared entity in `resolve-shared-entity.ts` with a new PROXY_FARMER case returning name, avatar, location.

### Messages
When a user clicks "message" on a proxy profile, create/find a conversation with the creator user. Include a system note or metadata indicating the conversation originated from the proxy farmer profile.

## Translations (Polish)

New keys under `"proxyFarmer"` namespace:
- `title`: "Profil-ambasador"
- `createdBy`: "Profil utworzony przez"
- `createProfile`: "Utworz profil rolnika"
- `editProfile`: "Edytuj profil"
- `deleteProfile`: "Usun profil"
- `confirmDelete`: "Na pewno chcesz usunac ten profil?"
- `myProxyProfiles`: "Moje profile-ambasador"
- `contactMethods`: "Jak skontaktowac sie z rolnikiem"
- `addContactMethod`: "Dodaj metode kontaktu"
- `contactPhone`: "Telefon"
- `contactEmail`: "Email"
- `contactInPerson`: "Spotkania osobiste"
- `contactPickup`: "Odbior na miejscu"
- `contactOther`: "Inne"
- `contactValue`: "Dane kontaktowe"
- `contactNote`: "Uwagi"
- `products`: "Produkty"
- `addProduct`: "Dodaj produkt"
- `productName`: "Nazwa produktu"
- `productCategory`: "Kategoria"
- `productDescription`: "Opis"
- `noProducts`: "Brak produktow"
- `limitReached`: "Osiagnieto limit 3 profili-ambasador"
- `remainingProfiles`: "Pozostalo profili do utworzenia"
- `ambassadorBadge`: "Ambasador"
- `deleted`: "Profil usuniety"
