# Chat, Sign-up, and Listing Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans.

**Goal:** Implement room chat, self-signup, password visibility, navbar Live, and listing-first multi-lot auctions.

**Architecture:** Server-authoritative listing/start/chat routes; Supabase Realtime for chat and items; client tabs isolate Auction/Chat/Seller on mobile.

**Tech Stack:** Next.js 16, TypeScript, Supabase, LiveKit, next-intl, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-08-chat-signup-listing-design.md`

## Global Constraints

- Client never writes tables directly.
- `start_item` sets `ends_at` using Postgres `now()`; listed lots cannot be bid.
- Multiple active lots are independent.
- Chat: authenticated only, max 280 chars, 1 message/user/room/second.
- Sign-up auto-confirms only for hackathon/demo.

## Tasks

- [x] Task 1: Add `listed`/nullable deadline schema, `create_listing`, `start_item`, chat table/RLS/RPC and grants.
- [x] Task 2: TDD item-listing/start API, chat validation/API, signup validation/server auto-confirm; 177 tests passing.
- [x] Task 3: Refactor auction state to multiple lots and per-lot timers; add Auction/Chat/Seller tabs and lot selector.
- [x] Task 4: Add chat UI/realtime, signup/login password eye, `/signup`, navbar Live, seller listing queue and Start Bid.
- [x] Task 5: Verify mobile 390/360, production signup/listing/start/chat, rate-limit SQL, typecheck/lint/build; reset demo data.
- [x] Task 6: Explicit approval, commit/push/deploy final scope.

## Verification Evidence

- Auto-signup profile name: production `Production Collector`.
- Listing before start: `LISTED · Rp900.000`; no lot chip; after Start Bid, lot appears.
- Chat appeared on both clients in realtime.
- Chat same-user second message in one SQL transaction raises `chat_rate_limited`.
- No horizontal overflow at 390px production; route checks passed at 360px earlier.
