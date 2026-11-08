# Multi-user Live Rooms Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let every authenticated user own one live room with name/category/optional thumbnail, and let other authenticated users watch and bid.

**Architecture:** Add owner/category/thumbnail columns to rooms; keep all writes in server Route Handlers. Replace allowlist seller checks with room-owner checks for starting/ending live, items, relist, expiry, and publish grants. Public RLS remains read-only.

**Tech Stack:** Next.js 16 App Router, TypeScript, Supabase, LiveKit, next-intl, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-08-multi-user-live-rooms-design.md`

## Global Constraints

- Client can only read public rows; every mutation is server/service-role.
- One room per owner via unique `owner_id`.
- `SELLER_ALLOWLIST` is retired as an authorization gate.
- Categories are exactly `pokemon-tcg`, `one-piece-tcg`, `yu-gi-oh-tcg`, `mtg`, `sports-cards`, `other`.
- Thumbnail is optional, JPEG/PNG/WebP, maximum 5MB.
- Bid/payment/anti-sniping behavior must remain unchanged.

## Review Focus

- Two users racing Start Live must never share a room.
- A non-owner must not create items, start/end live, publish video, relist, or expire another room.
- End Live while an auction is active must be refused.
- Anonymous room visitors must see an actionable video-login state, not a generic media error.
- Lobby must not list lobby/ended rooms publicly.

---

### Task 1: Schema and room validation

**Files:** `supabase/schema.sql`, `lib/room-categories.ts`, `lib/validation/room.ts`, `tests/room-validation.test.ts`, `tests/room-lifecycle.test.ts`, `lib/types.ts`.

**Interfaces:**
- Produces: `ROOM_CATEGORIES`, `RoomCategory`, `parseRoomInput(form): { title; category; thumbnail: File|null }`, and extended `Room` fields `owner_id`, `category`, `thumbnail_url`.

- [x] Write failing tests for valid input, required trimmed title 1..80, exact category allowlist, optional thumbnail, invalid MIME/oversize, owner uniqueness, and active-item End guard.
- [x] Add nullable room columns and partial unique owner index to schema; keep public room SELECT.
- [x] Implement category constants and multipart form validation; run focused tests.

### Task 2: Server lifecycle and ownership

**Files:** `lib/server/rooms.ts`, `lib/server/items.ts`, `lib/server/auth.ts`, `app/api/rooms/route.ts`, `app/api/rooms/[id]/end/route.ts`, `app/api/items/route.ts`, `app/api/items/relist/route.ts`, `app/api/orders/[id]/expire/route.ts`, `app/api/livekit-token/route.ts`, related tests.

**Interfaces:**
- Produces: `listLiveRooms()`, `getRoomByOwner(ownerId)`, `startRoomForOwner(userId, sellerName, input)`, `endRoomForOwner(roomId, userId)`.
- Start/end errors map to 401/400/403/409/502 without secret payloads.
- LiveKit grant sets `canPublish` only when `room.owner_id === user.id`.

- [x] Extend room reads with owner/category/thumbnail fields.
- [x] Implement server-only Start/End, thumbnail upload to `room-thumbnails`, rollback on create failure, and old-thumbnail cleanup after successful replacement.
- [x] Replace allowlist checks in item/relist/expire/video paths with owner checks.
- [x] Unit-test owner/non-owner isolation and active-auction End refusal.

### Task 3: Home discovery and Start Live UI

**Files:** `app/[locale]/page.tsx`, `components/start-live-form.tsx`, `components/end-live-button.tsx`, `components/room-card.tsx`, `app/[locale]/room/[roomId]/page.tsx`, `components/live-video.tsx`, `components/live-auction.tsx`, `components/seller-item-form.tsx`, `app/globals.css`, catalogs.

**Interfaces:**
- Home shows live rooms to everyone and Start Live form only to logged-in users.
- Start form sends multipart `title`, `category`, optional `thumbnail`.
- Owner sees End Live; anonymous video state links to login.

- [x] Implement form with localized pending/errors and redirect to created room.
- [x] Show owner CTA/return-to-room and live-only discovery with thumbnail/category.
- [x] Remove obsolete in-room Go Live path; enforce owner and active-item state for End Live.
- [x] Browser-check 360px/desktop, ID/EN, keyboard focus, and fallback thumbnail.

### Task 4: Verification and release

- [x] Apply schema migration and create `room-thumbnails`.
- [x] Unit/integration/type/lint/build all pass.
- [x] Deploy and run two-user production acceptance: each owns one room, non-owner denied, viewer video login gate, live-only lobby, End Live guard.
- [ ] After explicit confirmation, commit `feat: multi-user live rooms` plus final freeze docs; do not tag/release.
