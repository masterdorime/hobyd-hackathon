# HOBYD — UI-Shell-First Design

**Date:** 2026-11-08
**Status:** Approved for implementation planning
**Source of constraints:** `docs/00-scope-freeze.md`, `docs/01-runbook-12h.md`, `docs/02-data-model-and-env.md`, and `docs/03-demo-scenario.md`

## 1. Purpose and success criteria

HOBYD is a mobile-responsive live-auction website for Indonesian collectors, with Pokémon TCG as the beachhead. Its single product job is to let one seller broadcast an item auction while multiple authenticated bidders compete transparently, then let the winner complete a sandbox QRIS payment.

Implementation follows a **UI-shell-first** sequence approved by the user, while preserving the runbook's safeguards: deploy early, replace all fixtures with real integrations, and treat the bid engine as a hard gate. Convenience services and visual experimentation must never delay the server-authoritative auction path.

The build is done only when the complete golden path in `03-demo-scenario.md` works on the production Vercel URL:

1. Seller logs in, goes live, and creates an item with image, title, and start price.
2. At least three bidders see synchronized price and bid-feed updates.
3. A bid in the final ten seconds adds ten seconds, at most five times.
4. Expiry locks one winner and produces one order.
5. The winner sees sandbox QRIS and a five-minute timer, then becomes `paid`.
6. A timeout becomes `expired`, and the seller can relist as a new item.

## 2. Frozen scope and technical invariants

In scope: email auth and profiles; one-seller rooms; item creation with Storage; custom integer-IDR bids; server-side anti-sniping and winner lock; sandbox QRIS; isolated LiveKit video; ID+EN; responsive desktop/mobile UI.

Explicitly excluded: chat, categories, auction-mode selection, room thumbnails, theater mode, a special mobile viewer stack, seller inbox, reputation leaderboard, WhatsApp handoff, multi-seller behavior, analytics, notifications, disputes, or other features absent from the frozen scope.

Non-negotiable rules:

- Browser clients never decide auction outcomes and never write directly to Supabase.
- Only Next.js Route Handlers using the Supabase secret key may write to the database.
- All timestamps and deadline decisions come from Postgres `now()`.
- Every bid executes through the single `place_bid` RPC transaction.
- Anti-sniping occurs only when `0 <= ends_at - now < 10s` and `extensions_used < 5`.
- A late bid is rejected and never reopens an item.
- Closing is POST-only and idempotent; one item has at most one order.
- Video has no ownership of bid state or bidding availability.
- Existing frozen tables, RLS policies, RPC functions, environment variables, and storage bucket remain the technical contract.
- `.env.local`, secret keys, session keys, and generated companion sessions are never committed.

## 3. Approved experience and visual system

### Direction

The latest **Tactile Vault** mockup is the implementation direction. **The Live Lot** remains a preserved design reference, not a second theme. Tactile Vault takes the Live Lot's information hierarchy and adds restrained physical depth:

- Auction Black/charcoal raised housings for major surfaces.
- Foil/signal yellow enamel on the primary Bid control and important live state.
- Warm-white primary text and muted neutral metadata.
- Inset readouts for price, timer, and bid entry, with strong borders and readable text.
- One directional light model: highlight at the top, shadow below.
- No decorative moving background, excessive glow, glossy texture, or shadow-only affordance.

Palette roles: Auction Black `#090907`, Slab Charcoal `#171712`, Foil Yellow `#FFD84D`, Warm Paper `#F4F0E4`, Smoke `#A5A091`, and Signal Coral `#FF9C91`. Semantic paid/error states remain distinguishable through labels as well as color.

Typography has three deliberate roles:

- **Barlow Condensed:** brand, large prices, and selected action labels.
- **Instrument Sans:** controls, body copy, and general interface text.
- **IBM Plex Mono:** timers, lot identifiers, amounts in input fields, and technical labels.

These fonts are loaded through `next/font/google`; system fallbacks preserve usability. The real `public/hobyd-logo.png` replaces the textual mockup wordmark when appropriate.

### Layout and responsive behavior

Desktop uses an asymmetric two-column live room: seller video and activity on the left; current item, price, countdown, and bid controls on the right. Lobby, win, and payment views reuse the same tokens rather than introducing new themes.

At narrow widths, current price, timer, and bid controls precede the video so the primary task is not buried. The standard responsive layout covers mobile; it does not add the excluded special mobile viewer stack. Interactive targets are at least 44px, with the primary Bid control approximately 52px high.

Motion is restrained and informed by Apple fluid-interface principles: immediate pointer-down feedback, short transform/opacity updates, no gratuitous bounce, no input lockout, and no continuous decorative loops. The design respects reduced motion, reduced transparency, increased contrast, visible keyboard focus, and screen-reader status announcements.

## 4. Application architecture

### Stack and server boundaries

- Next.js App Router + TypeScript, deployed to Vercel.
- Tailwind for layout and token-driven utilities, with focused component CSS where layered physical surfaces need it.
- `@supabase/ssr` and `@supabase/supabase-js` for auth, reads, Realtime, and server administration.
- `next-intl` for ID+EN routing and message catalogs.
- `livekit-client` and `livekit-server-sdk` for isolated video.
- `midtrans-client` plus server-side HTTP handling for QRIS and verified notifications.
- Vitest for unit and integration coverage.

Server Components handle initial reads and static composition where practical. Client Components are limited to auth forms, seller item form, LiveKit, Realtime subscriptions, countdown/bid interactions, and payment interactions. Next.js server code never exposes `SUPABASE_SECRET_KEY`, LiveKit secrets, or the Midtrans server key to the browser.

### Routes

Localized UI:

- `/id` and `/en`: lobby; `/` redirects to `/id`.
- `/[locale]/room/[roomId]`: live room, seller controls, video, item, and bidding.
- `/[locale]/win/[itemId]`: authenticated winner result.
- `/[locale]/pay/[orderId]`: authenticated winner checkout.
- `/login`: Supabase email login, preserving the intended destination and locale.

Server endpoints, concrete names within runbook scope:

- `GET /api/rooms` and `GET /api/items?room_id=...`: initial reads where needed.
- `POST /api/rooms/[id]/go-live`: seller-only room activation.
- `POST /api/items`: seller-only image upload and item creation.
- `POST /api/bids`: authenticated close attempt followed by `place_bid` RPC.
- `POST /api/items/[id]/close`: idempotent `close_item` RPC.
- `GET /api/livekit-token?roomId=...`: authenticated publisher/subscriber token.
- `POST /api/orders/[id]/qris`: winner-only create-or-resume sandbox QRIS.
- `POST /api/orders/[id]/expire`: authorized, server-deadline-checked expiry.
- `POST /api/orders/[id]/mock-confirm`: winner-only sandbox fallback to `paid`.
- `POST /api/orders/webhook`: Midtrans notification handler.

No GET endpoint mutates database state. Additional seller relisting reuses `POST /api/items` with a new item ID; it never mutates an expired item back to live.

### Focused UI modules

`SiteHeader`, `LanguageToggle`, `RoomCard`, `SellerItemForm`, `LiveVideo`, `ItemPanel`, `PriceReadout`, `Countdown`, `BidForm`, `BidFeed`, `BidStatus`, `OrderSummary`, and `QrPayment` each have one presentation or interaction responsibility. Shared server modules own authentication/authorization, environment validation, Supabase clients, API error mapping, and external-service configuration.

Typed visual fixtures may support the shell checkpoint only. They live outside production data modules, are clearly labeled in UI during that checkpoint, and are fully removed as each real flow is connected. They never become a parallel backend.

## 5. Data flow

### Authentication and authorization

Supabase email auth creates the session; the frozen database trigger creates the profile from the email prefix. Server helpers call `requireUser()` for protected handlers and `isSeller(email)` for seller mutations. Client-provided user IDs, seller flags, prices, timestamps, or winner IDs are ignored.

### Room and item creation

The lobby reads rooms under RLS. `POST /api/rooms/[id]/go-live` verifies the seller before updating room state. The seller item form submits image, title, and start price as multipart data. The handler validates input and authorization, uploads the image to public-read `item-images`, and inserts the item with `current_price = start_price`, live state, and `ends_at = now() + AUCTION_DURATION_SEC`.

If insertion fails after upload, the handler removes the newly uploaded Storage object. Response errors identify the corrective action without exposing internal credentials or SQL details.

### Bidding and Realtime

The browser sends only `itemId` and integer `amount`. `POST /api/bids` authenticates the session, invokes `close_item` first (a no-op before expiry), then invokes `place_bid` with the authenticated user ID and server-side extension settings.

The RPC owns advisory lock, row lock, item status/deadline checks, amount check, one-bid-per-second-per-user-per-item rate limit, bid insertion, current-price update, and conditional extension. Its structured result maps to a stable API error code. UI translates error codes into ID or EN rather than coupling catalogs to raw server prose.

Initial item/bid data comes from trusted reads. Supabase Realtime subscriptions to `items`, `bids`, and relevant room changes merge authoritative server records into the UI. On reconnect, the client refetches current state rather than extrapolating missed bids.

Countdown is derived from `ends_at`, with server-time alignment and monotonic local elapsed time used only for smoother presentation. The local deadline display is informational; Postgres time determines acceptance and closing.

### Closing and winner lock

When the visible countdown reaches zero, a client calls `POST /api/items/[id]/close`. The bid route also attempts close first, and repeated calls are safe. The advisory/row lock serializes close and bid operations. The RPC picks the highest bid using amount, earliest server timestamp, then ID, marks the item closed, and inserts the unique pending order with `on conflict do nothing`.

The winning user can open the win/pay views. Other users see a closed auction and cannot masquerade as winner by editing route IDs.

### Isolated video

The LiveKit token handler authenticates the user and grants publish rights only to the allowlisted seller; other authenticated users receive subscribe-only rights. Token, permission, network, or camera failure changes only the video panel into a readable fallback. Auction reads, bids, Realtime, and closing continue independently.

### QRIS and order state

`close_item` creates a pending order with the winner and item. The pay route verifies both authentication and ownership. The payable gross amount comes from the closed item's server-side current price, not from the browser.

`POST /api/orders/[id]/qris` uses Core API `payment_type: "qris"`, `transaction_details.order_id = orders.id`, and the trusted gross amount. The charge returns a QR action URL/`qr_string`. A fixed Midtrans order ID prevents intentional duplicate charges. On refresh/retry, the handler checks existing transaction status; if Midtrans reports a duplicate order ID, it recovers the existing transaction ID and corresponding official QR-code action instead of charging again. No provider fields need to be added to the frozen schema.

The payment deadline is `orders.created_at + PAYMENT_WINDOW_SEC`, checked on the server. The expire handler changes only eligible pending orders to `expired`; late client calls cannot expire a paid order. Expired is terminal. Relist creates a fresh item and new deadline.

The webhook verifies Midtrans `signature_key` as SHA-512 of `order_id + status_code + gross_amount + MIDTRANS_SERVER_KEY`, then checks the referenced order, QRIS payment type, and expected amount before writing. `settlement` (and `capture` only with acceptable fraud status) maps to `paid`; `expire` maps to `expired`; `pending` leaves the order pending; irrelevant statuses do not reopen terminal orders. Notifications are safe to repeat.

`mock-confirm` requires the authenticated winner and is an explicit sandbox/demo fallback. It applies the same pending-to-paid transition rule; it is never used by the real webhook.

## 6. Error handling and security

- API responses consistently use `400` for malformed input, `401` for unauthenticated requests, `403` for seller/winner authorization failures, `404` for missing resources, `409` for closed/too-low/state conflicts, `429` for rate limiting, and `502` for upstream service failures.
- Form messages stay near their controls and tell the user how to recover. Loading states cannot become indefinite silent spinners.
- Bid UI suppresses double submission while one request is pending, but RPC validation remains the actual concurrency defense.
- Realtime disconnection is displayed as connection state; reconnection triggers an authoritative refetch.
- Invalid webhook signatures or amount/order mismatches are rejected without writes.
- Only pending orders can transition to paid or expired. Paid, expired, and cancelled are terminal within this MVP.
- Production errors log safe diagnostic context only: route, resource ID where appropriate, upstream status, and error code. Secrets, access tokens, session keys, and env contents are excluded.
- Browser storage is not required for provider QR data or authoritative order state.

## 7. Verification plan

### Vitest and transaction-focused tests

Cover:

- Extension at remaining time `0 <= remaining < 10s`; no extension at exactly ten seconds or later.
- No extension after five extensions; late bids rejected without reopening.
- Strictly greater integer-IDR validation and malformed/unsafe input rejection.
- One bid per second per user per item, without blocking a different eligible bidder.
- Nearly concurrent bids yielding one authoritative current price and deterministic ordering.
- Two close calls creating one winner and one order.
- Seller, bidder, and winner authorization boundaries.
- Pending-to-paid and pending-to-expiry transitions; terminal states cannot change.
- Midtrans signature, order, payment-type, and expected-amount validation.

Route tests may mock external boundaries, but transaction tests exercise the actual RPC/SQL behavior against designated test data, not only a duplicated TypeScript simulation.

### Browser and production acceptance

Check desktop and 360px layouts, no horizontal overflow, complete ID+EN labels, keyboard focus, reduced motion, readable error/status announcements, and 44px minimum targets. Then execute the golden path with one seller and three bidders on production. Confirm that video failure does not block bidding, two close attempts leave one order, invalid bids fail visibly, and all state is correct after refresh/reconnect.

Each checkpoint runs `npx vitest run`, `npx tsc --noEmit`, and `npx next build`.

## 8. Delivery sequence

1. Scaffold Next.js, validate env contract, apply frozen schema/RLS/RPC/realtime/trigger/bucket setup, and deploy the initial page.
2. Build the approved responsive UI shell using temporary typed fixtures.
3. Connect Supabase auth/profile and seller gates.
4. Connect lobby, go-live, seller item creation, and Storage.
5. Implement bids, RPC integration, Realtime, countdown, and anti-sniping. This is the hard gate: do not proceed until multi-client production bidding works.
6. Add isolated LiveKit video.
7. Add idempotent closing, winner lock, win page, and order creation.
8. Add QRIS create-or-resume, verified webhook, mock confirm, expiry, and relist.
9. Complete ID+EN, accessibility/mobile polish, metadata/favicon, golden-path production smoke test, and documentation/DEVLOG updates.

Deploy each checkpoint. Keep changes small and record meaningful decisions or deviations in `DEVLOG.md`. Git mutations require separate explicit confirmation; deployment work is not bundled with an automatic commit.

## 9. Definition of done

The frozen six features work together on production, all required checks pass, no direct client mutations or client-authoritative timestamps remain, mock shell data is gone, both locales work at desktop/mobile sizes, real seller/bidder/payment scenarios pass, and no out-of-scope feature has been introduced.
