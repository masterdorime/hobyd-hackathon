# Chat, Sign-up, and Listing Lifecycle — Design

**Date:** 2026-11-08
**Status:** Approved scope amendment

## Goal

Add authenticated room chat, self-service email sign-up, and a listing-first auction
lifecycle where sellers explicitly start each lot and may run multiple lots at once.

## Scope amendment

This supersedes prior exclusions for live chat and changes auction creation from
"start immediately" to "listed until seller starts". Sign-up is self-service with
name, email, and password. Password visibility controls are allowed.

## Auction lifecycle

- A created item is `listed`, has no `ends_at`, and cannot receive bids.
- Seller may create many listings and start any number simultaneously.
- `start_item` atomically changes `listed → live`, resets price/extensions/winner,
  and sets `ends_at = now() + server duration`.
- Viewers choose one active lot from a horizontal lot selector. Each selected lot
  has its own price, timer, feed, bid form, winner, and order.
- Every lot timer is managed server-authoritatively; closing is idempotent.
- Relist produces a new listed item; seller must start it explicitly.

## Chat

- One public chat history per room; authenticated users read and post.
- Max 280 characters, one message per user per room per second, server timestamp.
- Realtime inserts; no moderation/delete/mute in this scope.
- Chat is isolated: failures never block bidding or video.

## Sign-up and auth

- `/signup` accepts display name, email, password, and confirmation.
- Server validates then creates an auto-confirmed Supabase user with profile name
  metadata, allowing immediate password login. This is hackathon-only; production
  should enable email verification and abuse protection.
- Password fields on login/sign-up include an accessible show/hide control.
- Navbar always exposes a `Live` link to home; every authenticated user can start
  a room and become seller for that room.

## Mobile UI

- Room uses tabs `Auction | Seller` when applicable; chat lives inside the Auction
  tab below video/feed on mobile and alongside auction content on desktop.
- Only one dense panel is visible at a time for seller management.
- Active lots use horizontal snap chips; bid panel stays before video.
- Payment confirmation is a persistent status block: pending exposes the sandbox
  action, paid shows confirmation time, expired/cancelled show terminal status.
- Chat composer stays inside the panel and respects mobile keyboard behavior.
- 320/360/390px, landscape, focus, reduced-motion, and touch targets are tested.

## Out of scope

Private DM, chat moderation/mute, scheduled auctions, automatic starts, chat
attachments, email verification, password reset, social login, multiple rooms per user.
