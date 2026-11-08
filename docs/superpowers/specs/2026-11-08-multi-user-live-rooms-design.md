# Multi-user Live Rooms — Design

**Date:** 2026-11-08
**Status:** Approved scope amendment

## Goal

Any authenticated HOBYD user can start one live room by entering a room name,
category, and optional thumbnail. Other authenticated users can discover and
watch live rooms and bid. Auction and payment invariants do not change.

## Scope amendment

This supersedes the original single-seed-room and `SELLER_ALLOWLIST` seller gate.
It explicitly adds room categories and thumbnails, which were previously
out-of-scope. Live chat, auction modes, marketplace payouts, and multi-room per
user remain out of scope.

## Model

- One persistent room per user, enforced by unique `rooms.owner_id`.
- Fixed categories: `pokemon-tcg`, `one-piece-tcg`, `yu-gi-oh-tcg`, `mtg`,
  `sports-cards`, `other`.
- `rooms.title`, `rooms.category`, optional `rooms.thumbnail_url`,
  `rooms.seller_name` from the authenticated profile.
- Legacy seed room remains readable for regression fixtures but is unowned and
  is not shown in the live-room list.

## Lifecycle

1. A logged-in user opens Home and selects Start Live.
2. The form requires name and category; thumbnail is optional JPEG/PNG/WebP ≤5MB.
3. `POST /api/rooms` validates and uploads any thumbnail server-side, then creates
   the owner’s room or reactivates that same room with `status='live'`.
4. Home lists only rooms with `status='live'`, including category and thumbnail.
5. Owner can End Live from their room. It is rejected while an item with status
   other than `closed` exists. Ending hides the room from discovery but preserves it.
6. Anonymous users can see the lobby/room summary but cannot obtain a LiveKit
   token or bid. Logged-in non-owners receive subscribe-only video grants.

## Authorization

All mutations remain server-only. Ownership is checked server-side for:
room start/end, item creation, relist, expiry, and LiveKit publish grants.
`SELLER_ALLOWLIST` stops granting seller/video-write powers. RLS remains SELECT-only.

## Files

- `supabase/schema.sql`: owner/category/thumbnail columns and unique owner index.
- `lib/room-categories.ts`, `lib/validation/room.ts`.
- `lib/server/rooms.ts`: live listing, owner lookup, start/end.
- `app/api/rooms/route.ts`, `app/api/rooms/[id]/end/route.ts`.
- `components/start-live-form.tsx`, `components/end-live-button.tsx`,
  `components/room-card.tsx`, lobby/room pages, seller item form.
- Item/token/expire/relist authorization updates.
- Tests for validation, owner isolation, live visibility, active-item End guard,
  video grants, and anonymous video denial.

## Non-goals

Scheduling, co-hosts, follows, chat, categories CRUD, multiple rooms per user,
room deletion, thumbnails for items beyond the existing item image.
