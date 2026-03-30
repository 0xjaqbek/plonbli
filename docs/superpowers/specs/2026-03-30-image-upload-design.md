# Image Upload Design

**Date:** 2026-03-30
**Status:** Approved

## Overview

Add image upload capability across the plonbli platform using Supabase Storage with presigned URLs. Users can attach photos to posts, products, events, crop logs, and profile avatars.

## Storage

- **Provider:** Supabase Storage
- **Bucket:** `images` (public)
- **Folder structure:** `avatars/`, `posts/`, `products/`, `events/`, `crop-logs/`
- **File naming:** `{userId}/{timestamp}-{random}.webp`
- **Public URL pattern:** `https://{project}.supabase.co/storage/v1/object/public/images/{path}`
- **Server dependency:** `@supabase/supabase-js` (server-side only, for signed URL generation)
- **Env vars:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

## Upload Flow (Presigned URL)

1. Client compresses image (canvas resize + WebP conversion)
2. Client calls Server Action `getUploadUrl(folder, filename, contentType)`
3. Server validates session, generates signed upload URL (TTL 60s)
4. Client PUTs file directly to Supabase Storage via signed URL
5. Client receives public URL, stores in form state
6. On form submit, URLs are saved to database (existing text/text[] columns)

**Rationale:** Presigned URL approach avoids Vercel's 4.5MB body limit, eliminates double transfer through the server, and keeps auth control in NextAuth Server Actions.

## Client-Side Compression

- **Utility:** `compressImage(file: File): Promise<Blob>` in `src/shared/lib/compress-image.ts`
- **Max dimension:** 1920px (longer edge), maintain aspect ratio
- **Format:** WebP at 80% quality via `canvas.toBlob("image/webp", 0.8)`
- **Fallback:** JPEG for browsers without WebP support
- **Size validation:** Max 5MB per file (pre-compression)
- **Type validation:** image/jpeg, image/png, image/webp

## Shared Component: `ImageUpload`

- **Location:** `src/shared/ui/image-upload.tsx`
- **Props:**
  - `folder: string` — storage subfolder (e.g., "posts", "avatars")
  - `maxFiles: number` — 1 for avatars, 5 for galleries
  - `value: string[]` — current image URLs
  - `onChange: (urls: string[]) => void` — callback with updated URLs
- **Features:**
  - Drag & drop + click to select
  - Thumbnail preview with remove button
  - Upload progress indicator
  - Client-side compression before upload
  - File type and size validation

## Form Integration

| Form | Location | Folder | Max Files | Field |
|------|----------|--------|-----------|-------|
| PostForm | `src/domains/social/components/post-form.tsx` | `posts` | 5 | images |
| ListingForm | `src/domains/marketplace/components/listing-form.tsx` | `products` | 5 | images (replace existing URL input) |
| ProfileForm | `src/domains/auth/components/profile-form.tsx` | `avatars` | 1 | avatar |
| EventForm | `src/domains/social/components/event-form.tsx` | `events` | 1 | cover image |
| CropLogForm | `src/domains/farming/components/crop-log-form.tsx` | `crop-logs` | 5 | images |

**No schema changes needed** — all image columns (`text` for avatars, `text[]` for galleries) already exist.

## Display Changes

- **`next.config.ts`** — add `remotePatterns` for Supabase project domain
- **PostCard** — render image gallery below post content when `post.images.length > 0`
- **EventCard** — optional cover image display
- **ListingCard / ProductDetail** — already render from URLs, no changes needed
- **Avatar** — already renders from URL, no changes needed

## Events Schema Addition

Events table currently has no image column. Add `coverImage text` column to `events` table.

## Constraints

- Max 5MB per file (before compression)
- Max 5 images per element (1 for avatars and event covers)
- Accepted types: JPEG, PNG, WebP
- Signed URL TTL: 60 seconds
- Output format: WebP (JPEG fallback)
- Max output dimension: 1920px
