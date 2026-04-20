# Umami Analytics — Deployment Guide for Plonbli

## Context

This document describes how to deploy a self-hosted Umami analytics instance for the **plonbli** platform (farmer-consumer marketplace PWA). Umami runs as a **separate Vercel project** with its own **Neon PostgreSQL database**, isolated from the main plonbli application.

The main plonbli app already has the tracking script and 17 custom events integrated. Once Umami is deployed, you only need to:
1. Create a website entry in Umami
2. Copy the website ID to plonbli's env vars

---

## Architecture

```
plonbli (main app)                    umami (analytics app)
───────────────────                   ─────────────────────
Vercel project A             →        Vercel project B
Neon database A (main)                Neon database B (analytics)
app.plonbli.com              →        analytics.plonbli.com
                             ↑
                   script.js + event tracking
```

---

## Step 1: Fork Umami

1. Go to https://github.com/umami-software/umami
2. Fork to your GitHub account (e.g., `plonbli-analytics` or keep as `umami`)
3. Clone locally if you want to verify, or deploy directly from the fork

Umami is a Next.js 14 app — no code changes needed for basic deployment.

---

## Step 2: Create Neon Database

1. Log in to https://console.neon.tech
2. Create a **new project** (do NOT use the same project as the main plonbli app)
   - Name: `plonbli-analytics`
   - Region: same as main app (e.g., `eu-central-1`)
3. Copy the **connection string** from the dashboard
   - Format: `postgresql://user:pass@host/dbname?sslmode=require`
4. Save it — this becomes `DATABASE_URL` for Umami

Umami runs its own database migrations automatically on first startup. No manual SQL needed.

---

## Step 3: Deploy to Vercel

1. Go to https://vercel.com/new
2. Import the forked umami repository
3. Set **Framework Preset** to `Next.js` (auto-detected)
4. Set these **Environment Variables**:

| Variable | Value | Notes |
|----------|-------|-------|
| `DATABASE_URL` | `postgresql://...` | From Neon step above |
| `APP_SECRET` | random 32+ char string | Generate: `openssl rand -hex 32` |

5. Click **Deploy**

First deploy takes ~3 minutes. Umami migrates the database automatically on startup.

---

## Step 4: Configure Custom Domain

1. In Vercel project settings → **Domains**
2. Add: `analytics.plonbli.com`
3. In your DNS provider, add a CNAME record:
   ```
   analytics.plonbli.com  →  cname.vercel-dns.com
   ```
4. Wait for DNS propagation (usually 5–15 minutes)
5. Verify: https://analytics.plonbli.com should show the Umami login page

---

## Step 5: Create a Website in Umami

1. Log in to https://analytics.plonbli.com
   - Default credentials: `admin` / `umami` — **change immediately**
2. Go to **Settings → Websites → Add website**
3. Fill in:
   - **Name:** `plonbli`
   - **Domain:** `plonbli.com` (or your actual domain)
4. Save — Umami generates a **Website ID** (UUID format)
5. Copy the Website ID

---

## Step 6: Wire into Plonbli

In the plonbli repository, add to `.env.local` (and Vercel environment variables for the main project):

```env
NEXT_PUBLIC_UMAMI_WEBSITE_ID=<paste Website ID here>
NEXT_PUBLIC_UMAMI_URL=https://analytics.plonbli.com
```

Redeploy the main plonbli app. Umami will start receiving pageviews and custom events immediately.

---

## Events Tracked by Plonbli

The main app sends these 17 custom events to Umami:

| Event | Fired when |
|-------|-----------|
| `auth.registered` | User registers (email) |
| `auth.logged_in` | User logs in (email / Google / Facebook) |
| `auth.logged_out` | User logs out |
| `listing.viewed` | User opens a product listing |
| `listing.created` | Farmer creates a new listing |
| `listing.availability_updated` | Farmer changes listing availability |
| `cart.item_added` | User adds item to cart |
| `cart.item_removed` | User removes item from cart |
| `order.placed` | User completes checkout |
| `post.created` | User publishes a social post |
| `post.liked` | User likes a post |
| `group.joined` | User joins a group |
| `event.rsvp` | User RSVPs to an event |
| `conversation.started` | First message in a new conversation |
| `message.sent` | User sends a chat message |
| `role.upgraded_to_farmer` | User upgrades role to Farmer or Both |

Pageviews are tracked automatically (all routes).

---

## Security Checklist

- [ ] Change default `admin`/`umami` credentials immediately after first login
- [ ] `APP_SECRET` is a strong random string (never committed to git)
- [ ] `DATABASE_URL` uses SSL (`sslmode=require`)
- [ ] Umami is on a separate Neon project from the main app
- [ ] Custom domain has HTTPS (Vercel handles this automatically)

---

## Environment Variables Reference

### Umami Vercel Project

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon PostgreSQL connection string |
| `APP_SECRET` | Yes | Random secret for session signing |

### Plonbli Main App (add after Umami is live)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_UMAMI_WEBSITE_ID` | Yes | UUID from Umami dashboard |
| `NEXT_PUBLIC_UMAMI_URL` | Yes | `https://analytics.plonbli.com` |

---

## Troubleshooting

**Umami login page not appearing:**
- Check Vercel deployment logs for database connection errors
- Verify `DATABASE_URL` is set correctly in Vercel env vars
- Neon database must allow connections from Vercel IP ranges (enabled by default)

**No events appearing in Umami:**
- Verify `NEXT_PUBLIC_UMAMI_WEBSITE_ID` matches the UUID in Umami settings
- Check browser console for script load errors
- Umami script loads with `strategy="afterInteractive"` — events fire after hydration
- Ad blockers may block the script in development

**Custom domain not working:**
- DNS propagation can take up to 24h
- Verify CNAME record points to `cname.vercel-dns.com`
- Check Vercel domain status in project settings

---

## Prompt for Claude in the Umami Repository

> Copy everything below this line into the CLAUDE.md of the forked Umami repository.

---

# CLAUDE.md — Plonbli Analytics (Umami Fork)

## What This Is

This is a fork of [Umami](https://umami.is) — an open-source, privacy-friendly analytics platform — deployed as the analytics backend for **plonbli**, a farmer-consumer marketplace PWA.

- **Live URL:** https://analytics.plonbli.com
- **Deployed on:** Vercel (separate project from main plonbli app)
- **Database:** Neon PostgreSQL (separate project from main plonbli DB)
- **Tracks:** The plonbli web application at plonbli.com

## What Plonbli Expects

The main plonbli app integrates with this Umami instance via:
- A tracking script at `${NEXT_PUBLIC_UMAMI_URL}/script.js`
- Website ID: configured in plonbli's `NEXT_PUBLIC_UMAMI_WEBSITE_ID`

The integration is already built into plonbli. This repo just needs to be deployed and configured correctly.

## Deployment Rules

- **Do NOT** modify Umami's core tracking logic
- **Do NOT** share the database with the main plonbli app — keep them isolated
- **Do NOT** commit `DATABASE_URL` or `APP_SECRET` to git
- Environment variables live in Vercel dashboard only

## Allowed Customizations

If customization is needed, limit changes to:
- Branding (logo, page title) in `public/` and `src/`
- Adding new admin users via Umami UI (not via code)
- Updating Umami version by merging upstream changes

## Updating Umami

To pull upstream changes from the original Umami repo:

```bash
git remote add upstream https://github.com/umami-software/umami
git fetch upstream
git merge upstream/main
# Resolve any conflicts
git push origin main
```

Vercel redeploys automatically on push to `main`.

## Environment Variables

Set in Vercel dashboard — never in `.env` files committed to git:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon PostgreSQL connection string for the analytics DB |
| `APP_SECRET` | Random 32+ char secret for session signing |

## Database

- Provider: Neon (serverless PostgreSQL)
- Migrations: run automatically by Umami on startup
- Backups: handled by Neon (point-in-time recovery available)
- No manual schema changes — Umami manages its own schema

## Contact / Context

This analytics instance tracks the plonbli platform. For questions about what events are being tracked or how the integration works, see the main plonbli repository's `docs/umami-deployment-guide.md`.
