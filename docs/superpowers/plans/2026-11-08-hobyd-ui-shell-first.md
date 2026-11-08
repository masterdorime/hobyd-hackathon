# HOBYD UI-Shell-First Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy the six-feature HOBYD live-auction MVP, starting with the approved Tactile Vault UI shell and ending with a production-verified seller → multi-bidder → winner → QRIS flow.

**Architecture:** Next.js App Router renders localized pages and focused client islands. Supabase reads are RLS-protected; every mutation passes through authenticated Route Handlers and the Supabase secret key, with `place_bid`/`close_item` as transactional authorities. LiveKit and Midtrans are isolated server integrations; temporary typed fixtures exist only for the shell checkpoint.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind, next-intl, Supabase Auth/Postgres/Realtime/Storage, LiveKit Cloud, Midtrans Core API Sandbox, Vercel, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-08-hobyd-design.md`

## Global Constraints

- Work only inside the six frozen features plus LiveKit, ID+EN, and responsive UI; no chat/categories/modes/thumbnails/inbox/leaderboards/analytics.
- All database writes use Route Handlers + `SUPABASE_SECRET_KEY`; browser code only receives the publishable Supabase key.
- Bid rules are integer IDR strictly above current price, one bid/user/item/second, extension when `0 <= ends_at-now < 10s`, +10s, maximum five extensions, and no late reopening.
- Route-local values are `MAX_SNIPING_EXTENSIONS=5`, `EXTENSION_WINDOW_SEC=10`, `EXTENSION_ADD_SEC=10`, `AUCTION_DURATION_SEC=120`, `PAYMENT_WINDOW_SEC=300`.
- Preserve frozen tables/RLS/RPC behavior. Any helper needed to derive a deadline with Postgres `now()` is additive, service-role-only, and recorded in `DEVLOG.md`.
- `place_bid` remains one transaction and close is POST-only/idempotent; one item has one order.
- Video failure never disables item reads, bids, Realtime, or close.
- Tactile Vault visual tokens are `#090907`, `#171712`, `#FFD84D`, `#F4F0E4`, `#A5A091`, and `#FF9C91`; Barlow Condensed, Instrument Sans, and IBM Plex Mono use `next/font/google`.
- Every implementation plan also targets the real GitHub repository `https://github.com/masterdorime/hobyd-hackathon.git`; no remote is currently configured.
- Mobile-first is mandatory at every UI checkpoint: test 360px portrait before deploy, keep bid/QR controls reachable, support touch/keyboard, check landscape where available, and test a real mobile device before final acceptance. Desktop remains a separate acceptance target, not a replacement for mobile.
- Fixtures are visibly marked and removed as real flows connect; they never serve as persistent application data.
- Do not branch around missing credentials: copy `.env.example` to `.env.local` and fill real values before Task 3. Initial scaffold/shell may run without secrets.
- Never add/commit `.env.local`, `opencode.json`, `.superpowers/`, `.playwright-mcp/`, observation files, or other secrets. Do not use broad `git add .`.
- Every checkpoint runs `npx vitest run`, `npx tsc --noEmit`, and `npx next build`, then deploys. Commit steps require fresh explicit user confirmation immediately before execution.
- Each task updates `DEVLOG.md` only when it makes a decision/deviation, using one dated line.

## Review Focus

- **Malformed/extreme item and bid input** should produce 400 without writes: non-integer/negative/>Postgres-int IDR, long titles, non-image MIME, and >5MB files. Pinned by `parseItemInput`, `parseBidInput`, and Storage-before/after-call assertions in Tasks 4–5.
- **Simultaneous bids/closes at a deadline** must leave one authoritative price/winner/order, never two orders or a reopened item. Pinned by real-RPC parallel `Promise.all` tests in Tasks 5 and 7.
- **Realtime loss or browser refresh** must refetch authoritative state, not infer missed prices. Pinned by injected channel-lifecycle tests in Task 5 and production reconnect checks in Task 9.
- **Camera/token/network failure** must show a localized video fallback while bid API and form remain operational. Pinned by grant/token-route tests in Task 6 and actual camera-off bid continuity checks in Tasks 6 and 9.
- **Replayed/out-of-order/mismatched payment events** must preserve terminal state and expected amount. Pinned by duplicate webhook, `expire→settlement`, signature, order, payment-type, and gross-amount tests in Task 8.

---

### Task 1: Scaffold, configuration, frozen schema, and initial deploy

**Files:**
- Create: `package.json`, `package-lock.json`, `tsconfig.json`, `next-env.d.ts`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `lib/server/config.ts`, `supabase/schema.sql`, `supabase/seed.sql`, `vitest.config.ts`, `tests/config.test.ts`.
- Modify: `.gitignore`, `README.md`.
- Preserve: existing `app/favicon.ico`, `public/hobyd-logo.png`, and `public/qris-sandbox.png`.

**Interfaces:**
- Consumes: the existing `.env.example` and all SQL blocks in `docs/02-data-model-and-env.md`.
- Produces: `getAuctionConfig(): { maxSnipingExtensions: 5; extensionWindowSec: 10; extensionAddSec: 10; auctionDurationSec: 120; paymentWindowSec: 300 }`; `getRequiredEnv(name: string): string`; database schema and one deterministic demo room for later tasks.

- [ ] **Step 1: Scaffold into an empty temporary directory and preserve root assets**

Run `npx create-next-app@latest C:\Users\TRISTAN\AppData\Local\Temp\opencode\hobyd-next-scaffold --ts --tailwind --app --no-src-dir --eslint --use-npm --yes`. Copy only generated package/config/source boilerplate into the repo; do not replace `.gitignore`, existing README, favicon, HOBYD logo, or QR asset. Remove Create Next App sample content/icons.

- [ ] **Step 2: Install the frozen dependencies**

Run `npm install`, then `npm install @supabase/ssr @supabase/supabase-js livekit-client livekit-server-sdk next-intl midtrans-client`, then `npm install -D vitest`. Add scripts `dev`, `build`, `start`, `lint`, `test` (`vitest run`), and `typecheck` (`tsc --noEmit`).

- [ ] **Step 3: Write failing configuration tests**

Create `tests/config.test.ts` expecting the five exact default values in Global Constraints, rejection of zero/negative/non-integer overrides, `getRequiredEnv('HOBYD_TEST')` returning a set value, and the same function throwing for an empty name.

```ts
it('uses the frozen auction defaults', () => {
  expect(getAuctionConfig()).toEqual({
    maxSnipingExtensions: 5,
    extensionWindowSec: 10,
    extensionAddSec: 10,
    auctionDurationSec: 120,
    paymentWindowSec: 300,
  });
});
```

- [ ] **Step 4: Run the tests and verify the expected failure**

Run `npx vitest run tests/config.test.ts`. Expected: module `lib/server/config` not found.

- [ ] **Step 5: Implement minimal environment parsing**

Create `lib/server/config.ts` with `getRequiredEnv` and `getAuctionConfig()`. Parse only process env on the server, apply exact defaults, validate safe positive integers, and never return/log secret values.

- [ ] **Step 6: Verify config and scaffold**

Run `npx vitest run tests/config.test.ts`, then `npx tsc --noEmit`, then `npx next build`. Expected: all pass.

- [ ] **Step 7: Apply frozen database and demo room setup**

Copy every SQL block from the data-model doc verbatim into `supabase/schema.sql`. Add `supabase/seed.sql` that inserts only room UUID `00000000-0000-4000-8000-000000000001`, title `Pokémon TCG Night Auction`, seller name `Demo Seller`, status `lobby`, with `on conflict do nothing`. Apply both through Supabase SQL Editor; verify tables, RLS policies, functions, Realtime publication, `item-images` public-read bucket, and email auth without printing keys.

- [ ] **Step 8: Publish the initial page to the supplied GitHub repository and record status**

After explicit confirmation, add remote `https://github.com/masterdorime/hobyd-hackathon.git` (none is currently configured), stage only scaffold/config/schema/README files plus the approved spec and this plan, and commit `chore: scaffold + schema + empty deploy`; never stage the secret-bearing local config. After separate explicit push confirmation, run `git push -u origin HEAD`. Import that existing GitHub repository into Vercel, run `npx vercel --prod --yes` (complete `npx vercel login` interactively if required), and confirm the production URL returns the scaffold page. Record only the public repository/deployment URLs in README; do not commit env or Vercel metadata.

### Task 2: Localized design foundation and full fixture-backed UI shell

**Files:**
- Create: `i18n/routing.ts`, `i18n/navigation.ts`, `i18n/request.ts`, `messages/id.json`, `messages/en.json`, `middleware.ts`, `app/[locale]/layout.tsx`, `app/[locale]/page.tsx`, `app/[locale]/room/[roomId]/page.tsx`, `app/[locale]/win/[itemId]/page.tsx`, `app/[locale]/pay/[orderId]/page.tsx`, `components/site-header.tsx`, `components/language-toggle.tsx`, `components/room-card.tsx`, `components/live-video.tsx`, `components/item-panel.tsx`, `components/bid-form.tsx`, `components/bid-feed.tsx`, `components/countdown.tsx`, `components/order-summary.tsx`, `components/qr-payment.tsx`, `components/seller-item-form.tsx`, `lib/types.ts`, `lib/format.ts`, `lib/demo-data.ts`, `tests/i18n.test.ts`, `tests/format.test.ts`.
- Modify: `next.config.ts`, `app/layout.tsx`, `app/globals.css`, `app/page.tsx`.

**Interfaces:**
- Consumes: frozen route names and visual spec.
- Produces: `routing.locales = ['id','en']`, `routing.defaultLocale = 'id'`; localized navigation helpers; `Room`, `Item`, `Bid`, `Order`, `Profile` types matching snake_case DB fields; `formatIdr(value: number): string`; fixture-backed pages later replaced incrementally.

- [ ] **Step 1: Write failing catalog and formatter tests**

`tests/i18n.test.ts` must recursively assert identical message keys in ID/EN and nonempty strings. `tests/format.test.ts` must assert `formatIdr(2450000) === 'Rp2.450.000'` and rejection of unsafe/non-integer input.

```ts
it('formats integer rupiah with Indonesian separators', () => {
  expect(formatIdr(2450000)).toBe('Rp2.450.000');
  expect(() => formatIdr(2.5)).toThrow();
});
```

- [ ] **Step 2: Run tests and verify missing-module failure**

Run `npx vitest run tests/i18n.test.ts tests/format.test.ts`. Expected: catalog/formatter imports fail.

- [ ] **Step 3: Configure next-intl and route validation**

Use `defineRouting`, `createNavigation`, and `getRequestConfig` with `hasLocale`; configure the plugin at `./i18n/request.ts`. Root `/` redirects to `/id`. The localized layout uses `NextIntlClientProvider`, real metadata/favicon, the three `next/font/google` roles, and `notFound()` for unsupported locales. Middleware excludes `_next`, `api`, and static assets while retaining the login route.

- [ ] **Step 4: Define DB-facing types and translation-backed fixtures**

Implement `lib/types.ts` using exact frozen field/status names. Keep the deterministic room ID in `lib/demo-data.ts`; use valid UUIDs for fixture item/order and mark each fixture page `UI PREVIEW` until its real flow lands. Keep message keys for all static copy and API error codes in both catalogs.

- [ ] **Step 5: Build Tactile Vault visual primitives and all shell pages**

Implement the palette, raised housing, inset readouts, enamel Bid pressed state, focus rings, and reduced-motion/transparency/contrast fallbacks in `app/globals.css`. Compose lobby, live room, winner, and payment pages from focused components. LiveKit and seller form are static/fallback UI at this checkpoint; fixture Bid does not mutate data or pretend to call a server.

- [ ] **Step 6: Add mobile/accessibility behavior and verify tests/build**

Mobile order places auction controls before video; primary hit areas are 44–52px, IDR/countdown numerals are tabular, form labels and live regions are present, and the real logo is used. Run all tests, TypeScript, and production build; all pass.

- [ ] **Step 7: Browser-check and deploy the shell**

At 360px and desktop, verify no horizontal overflow and compare hierarchy with `tactile-vault-v6` (not as a second theme). Verify `/id`, `/en`, unknown locale behavior, winner/payment preview routes, keyboard focus, and reduced motion. Deploy, record checkpoint, then after explicit confirmation commit `feat: localized tactile vault ui shell` with only task files.

### Task 3: Supabase clients, email auth, and seller/winner authorization

**Files:**
- Create: `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/admin.ts`, `lib/server/auth.ts`, `lib/server/http.ts`, `app/login/page.tsx`, `components/login-form.tsx`, `tests/auth.test.ts`, `tests/http.test.ts`.
- Modify: `middleware.ts`, `.env.example` only if a name needs clarification, `components/site-header.tsx`.

**Interfaces:**
- Consumes: `getRequiredEnv`, catalogs, and shell.
- Produces: `createClient()` browser client; async `createServerSupabase()`; `createAdminClient()`; `requireUser(): Promise<User>`; `requireSeller(): Promise<User>`; `isSellerEmail(email: string | null | undefined): boolean`; `apiError(code, status): NextResponse` and stable API error codes.

- [ ] **Step 1: Provision private env without exposing it**

Copy `.env.example` to `.env.local` and fill all real service config plus one seller and three test bidder credentials where applicable. Add the same values to Vercel Production through dashboard/CLI secure input. Verify required names by presence only; never print them.

- [ ] **Step 2: Write failing seller and HTTP tests**

Assert `isSellerEmail` is case-insensitive/whitespace-tolerant, rejects undefined and non-allowlisted emails, and does not include empty allowlist entries. Assert failures produce `401 UNAUTHORIZED`, `403 FORBIDDEN`, `400 INVALID_INPUT`, `404 NOT_FOUND`, `409 CLOSED/TOO_LOW`, `429 RATE_LIMITED`, and `502 UPSTREAM_ERROR` JSON with no secret payload.

```ts
it('matches only normalized allowlisted seller emails', () => {
  process.env.SELLER_ALLOWLIST = 'seller@example.com, second@example.com';
  expect(isSellerEmail(' SELLER@example.com ')).toBe(true);
  expect(isSellerEmail('bidder@example.com')).toBe(false);
  expect(isSellerEmail(undefined)).toBe(false);
});
```

- [ ] **Step 3: Run tests, then implement helpers**

Verify missing auth/http modules first. Implement `isSellerEmail` from `SELLER_ALLOWLIST`, typed API response helpers, and server authorization exceptions mapped by the response helpers without trusting body IDs.

- [ ] **Step 4: Implement three separated Supabase clients and session refresh**

Browser/server clients use the publishable key; admin alone imports `SUPABASE_SECRET_KEY`. `requireUser()` calls `auth.getUser()` server-side. Update middleware so refreshed Supabase cookies and next-intl response cookies are both preserved; no direct table writes appear in browser code.

- [ ] **Step 5: Implement password login and profile display**

`LoginForm` calls `signInWithPassword` and redirects to a validated internal intended path/locale. Header displays the server-loaded profile/name and logout control for signed-in users. Unauthenticated bidding still requires route verification; shell preview remains publicly readable.

- [ ] **Step 6: Verify and deploy auth**

Run focused tests then all checks. Manually confirm seller and each bidder can log in, an invalid login gets localized inline feedback, and direct unauthorized write tests are denied. Deploy, then after explicit confirmation commit `feat: supabase auth + seller gate` with only task files.

### Task 4: Lobby, go-live, seller item creation, and Storage

**Files:**
- Create: `lib/server/rooms.ts`, `lib/server/items.ts`, `lib/validation/item.ts`, `app/api/rooms/route.ts`, `app/api/rooms/[id]/go-live/route.ts`, `app/api/items/route.ts`, `tests/item-validation.test.ts`, `tests/items-api.test.ts`.
- Modify: `supabase/schema.sql`, `app/[locale]/page.tsx`, `app/[locale]/room/[roomId]/page.tsx`, `components/seller-item-form.tsx`, `DEVLOG.md`.

**Interfaces:**
- Consumes: `requireSeller`, admin client, API helpers, deterministic seed room.
- Produces: `parseItemInput(form: FormData): { roomId: string; title: string; startPrice: number; image: File }`; `listRooms()`, `listItems(roomId)`, `getRoom(roomId)`; service-role-only `create_live_item` RPC that derives `ends_at` using Postgres `now()`; real lobby and create-item flow.

- [ ] **Step 1: Write failing item input and API boundary tests**

Validate trimmed title length 1–120, room UUID, IDR safe integer `1..2147483647`, and JPEG/PNG/WebP images up to 5MB. API tests assert anonymous →401, non-seller→403, malformed form→400, and that validation failure performs no Storage/DB call.

```ts
it('accepts only a complete valid seller item form', () => {
  const form = new FormData();
  form.set('roomId', '00000000-0000-4000-8000-000000000001');
  form.set('title', 'Charizard Base Set');
  form.set('startPrice', '2500000');
  form.set('image', new File(['image'], 'card.png', { type: 'image/png' }));
  expect(parseItemInput(form)).toMatchObject({
    roomId: '00000000-0000-4000-8000-000000000001',
    title: 'Charizard Base Set',
    startPrice: 2500000,
  });
});
```

- [ ] **Step 2: Verify failures then implement validation and read routes**

Run focused tests and confirm missing validation/routes. Implement `parseItemInput`, `GET /api/rooms`, `GET /api/items?room_id=...`, and typed data modules with explicit query errors rather than silent empty-state confusion.

- [ ] **Step 3: Add an additive server-time item-creation RPC**

Without changing existing frozen functions/tables, add `create_live_item(p_room_id uuid,p_title text,p_img_url text,p_start_price int,p_duration_secs int) returns items` to schema SQL. Make it `security definer set search_path=public`, validate IDs/title/price/duration and live room, insert `status='live'` and `ends_at=now()+make_interval(secs=>p_duration_secs)`, revoke public/anon/authenticated execution, grant only service_role. Record why Postgres-derived creation time needs this helper in DEVLOG.

- [ ] **Step 4: Implement go-live and atomic-from-client-perspective item handler**

`go-live` authorizes seller and updates only the intended room. `POST /api/items` validates seller/form, uploads `${user.id}/${crypto.randomUUID()}.${allowlistedExt}`, calls `create_live_item` with the server duration, and removes the uploaded object if RPC fails. Return typed `Item`; accept no client `ends_at`, price, seller, or status.

- [ ] **Step 5: Replace lobby/create fixtures and validate upload rollback**

Lobby and room pages read real records. Seller form uses `FormData`, accepts the three MIME types, reports localized pending/error/success, and shows the returned item. Mock Storage/RPC failure in `items-api.test.ts` and assert delete/remove is called exactly once; a successful path must not call rollback.

- [ ] **Step 6: Run checks and production acceptance**

Apply updated schema. Run all tests/type/build; create an item as seller, reject the same action from bidder, verify public image and server-derived deadline, then deploy. After explicit confirmation commit `feat: rooms + seller item create` with only task files.

### Task 5: Atomic bids, anti-sniping, Realtime, and reconnect refetch

**Files:**
- Create: `lib/validation/bid.ts`, `lib/server/auction.ts`, `lib/client/auction-api.ts`, `lib/client/auction-realtime.ts`, `hooks/use-auction.ts`, `app/api/bids/route.ts`, `app/api/items/[id]/close/route.ts`, `tests/bid-validation.test.ts`, `tests/bids-api.test.ts`, `tests/auction-rpc.integration.test.ts`, `tests/auction-realtime.test.ts`, `supabase/tests/auction-boundaries.sql`.
- Modify: `app/[locale]/room/[roomId]/page.tsx`, `components/item-panel.tsx`, `components/bid-form.tsx`, `components/bid-feed.tsx`, `components/countdown.tsx`, `lib/types.ts`.

**Interfaces:**
- Consumes: real item page, auth/RPC clients, config, frozen `place_bid` and `close_item`.
- Produces: `parseBidInput(value: unknown): { itemId: string; amount: number }`; `getAuctionSnapshot(roomId): Promise<{ item: Item | null; bids: Bid[] }>`; `AuctionRealtimeController` with injected snapshot/channel callbacks for deterministic lifecycle tests; `useAuction({ roomId, initialItem, initialBids })` returning item/bids/connection state plus `placeBid(amount)` and `closeItem()`.

- [ ] **Step 1: Write failing request validation and route mapping tests**

Accept UUID item ID and integer IDR `1..2147483647`; reject decimals, strings with junk, exponent/unsafe values, and extra authority fields. Mock RPC results for `invalid`, `closed`, `too_low`, and `rate_limited`, asserting 400/409/409/429 respectively and verifying the handler calls `close_item` before `place_bid` with authenticated—not body—bidder ID.

```ts
it('accepts only a UUID and strictly positive Postgres integer amount', () => {
  expect(parseBidInput({ itemId: VALID_ITEM_ID, amount: 2450001 }))
    .toEqual({ itemId: VALID_ITEM_ID, amount: 2450001 });
  expect(() => parseBidInput({ itemId: VALID_ITEM_ID, amount: 2.5 })).toThrow();
  expect(() => parseBidInput({ itemId: VALID_ITEM_ID, amount: 2147483648 })).toThrow();
});
```

- [ ] **Step 2: Verify failures, then implement validator and bid handler**

Run the focused tests first. Implement only the parsed ID/amount payload, `requireUser`, close attempt, then `place_bid` with `p_max_extensions=5`, `p_window_secs=10`, and `p_add_secs=10` from server config. Return the RPC bid/extension result without doing second-chance client logic.

- [ ] **Step 3: Pin real RPC behavior with integration fixtures**

Using designated test users/data only, cover an accepted extension with deadline +5s, an extension after +10s as a non-exact timing check, no extension after cap 5, rejection after deadline, rate limit within one second, and parallel bids producing exactly one accepted state transition when both target the same old price. Put the exact-boundary SQL in `supabase/tests/auction-boundaries.sql`: set `ends_at = now() + interval '10 seconds'` and call `place_bid` immediately in the same SQL transaction/statement time so `now()` is identical, expecting no extension. Run designated integration tests through `RUN_SUPABASE_INTEGRATION=1`; never report skipped integration or unrun SQL checks as passing production verification. Close tests belong to Task 7.

- [ ] **Step 4: Write failing subscription lifecycle tests**

In `tests/auction-realtime.test.ts`, drive `AuctionRealtimeController` with fake channel callbacks and no React renderer: item update merges by ID, bid insert deduplicates by ID, `CHANNEL_ERROR` sets disconnected state, and subsequent `SUBSCRIBED` refetches latest snapshot exactly once without speculative price arithmetic. Verify channel removal on disposal.

- [ ] **Step 5: Implement auction snapshot, lifecycle controller, and client hook**

Fetch latest active item and latest 20 server-ordered bids. `AuctionRealtimeController` owns item/bid deduplication, connection transitions, refetch-on-reconnect, and disposal; `useAuction` only adapts it to React state. Pass `ends_at`-derived remaining time to presentation without using client timestamps in requests. Countdown calls `closeItem()` once at zero; BidForm remains operable if video is unavailable.

- [ ] **Step 6: Replace bidding fixtures and verify full build**

Wire structured error codes to localized messages, pending button state, price/feed animation transforms/opacity, extension indicator, and accessible live regions. Run all tests/type/build; no fixture bid interaction remains.

- [ ] **Step 7: Execute bid hard gate in production**

Deploy. With one seller and three bidders confirm synchronized price/feed, reject lower bid, show last-10s +10s to cap five, and prevent late bids. Do not proceed if this fails; limit fixes to this flow. After explicit confirmation commit `feat: server-authoritative bids + anti-sniping` with only task files.

### Task 6: Isolated LiveKit publisher/subscriber video

**Files:**
- Create: `lib/server/livekit-grants.ts`, `app/api/livekit-token/route.ts`, `lib/client/livekit-api.ts`, `tests/livekit-grants.test.ts`, `tests/livekit-token-api.test.ts`.
- Modify: `components/live-video.tsx`, `app/[locale]/room/[roomId]/page.tsx`.

**Interfaces:**
- Consumes: `requireUser`, `isSellerEmail`, frozen env contract.
- Produces: `videoGrantFor(roomId: string, seller: boolean): VideoGrant` (`roomJoin:true`, named room, `canPublish:seller`, `canSubscribe:true`); GET token response `{ token, serverUrl }`; `<LiveVideo roomId seller />` with independent status fallback.

- [ ] **Step 1: Write failing grant and token-route tests**

Assert seller can publish, bidder cannot, both can subscribe only to requested room, unknown/empty room is rejected, anonymous token request→401, bidder identity always comes from `getUser()`, and token upstream/config failure maps to 502/500 without a token leak. Do not add a DOM test dependency; prove the media fallback and bid continuity in the real browser acceptance step.

```ts
it('keeps bidder video subscribe-only', () => {
  expect(videoGrantFor('room-001', false)).toEqual({
    room: 'room-001', roomJoin: true, canPublish: false, canSubscribe: true,
  });
});
```

- [ ] **Step 2: Verify failures, then implement token handler and grant helper**

Use `AccessToken(apiKey, apiSecret, { identity: user.id, name: profile.name })`, `addGrant(videoGrantFor(...))`, and awaited `toJwt()`. Token requires login and never trusts seller/identity in query body. GET performs no DB mutation.

- [ ] **Step 3: Implement browser room lifecycle with raw livekit-client**

Connect `Room` to returned server URL/token. Seller enables local camera; viewer subscribes and attaches remote tracks to media elements. Cleanup detaches tracks and disconnects on unmount. All media errors update only local video state and preserve surrounding auction components.

- [ ] **Step 4: Verify production publisher/subscriber behavior**

Run all checks. Use seller + one bidder to confirm publish/view, then disable seller camera/tab and confirm bid requests and feed updates continue. Deploy; after explicit confirmation commit `feat: isolated livekit video` with only task files.

### Task 7: Idempotent close, winner lock, and order creation

**Files:**
- Create: `lib/server/orders.ts`, `tests/close-rpc.integration.test.ts`, `tests/winner-access.test.ts`.
- Modify: `app/[locale]/win/[itemId]/page.tsx`, `app/api/items/[id]/close/route.ts`, `hooks/use-auction.ts`, `lib/types.ts` only if order typing needs completion.

**Interfaces:**
- Consumes: existing close route/RPC and authenticated user.
- Produces: `getOrderForWinner(orderId, userId)`, `getOrderByItemForWinner(itemId,userId)`; closed auction UI routes winner to win page and never displays checkout to another user.

- [ ] **Step 1: Add failing real close integration and winner-access tests**

Seed one bid then call `close_item` twice in parallel: expect one closed item, highest winner, one pending order. Repeat with zero bids: closed item, null winner, zero orders. Verify close before/equal deadline no-ops, late close works, bid-after-close stays rejected, loser gets 403 from winner read, and repeated close never duplicates order.

```ts
it('serializes concurrent closes into one order', async () => {
  await Promise.all([closeItem(item.id), closeItem(item.id)]);
  expect(await orderCountForItem(item.id)).toBe(1);
  expect((await readItem(item.id)).winner).toBe(highestBidder.id);
});
```

- [ ] **Step 2: Verify failures, then finish close/read implementation**

Run integration tests first where environment is provisioned. Keep all mutation inside the existing RPC, but ensure route/auth responses distinguish not found, unauthorized, no-op, and closed. Implement ownership-filtered server reads and localized winner/no-winner UI.

- [ ] **Step 3: Wire one-shot elapsed close and winner navigation**

Countdown expiration may call close from many clients; hook deduplicates only its own visible request and handles `noop` without manufacturing a winner. On closed state, winner sees item-won action; other users remain on closed auction. Never derive winner client-side.

- [ ] **Step 4: Run full acceptance and deploy**

Run tests/type/build then production double-close and loser-access checks. Deploy; after explicit confirmation commit `feat: idempotent closer + winner lock` with only task files.

### Task 8: Sandbox QRIS, verified webhook, expiry, and relist

**Files:**
- Create: `lib/midtrans-notification.ts`, `lib/server/midtrans.ts`, `app/api/orders/[id]/qris/route.ts`, `app/api/orders/[id]/expire/route.ts`, `app/api/orders/[id]/mock-confirm/route.ts`, `app/api/orders/webhook/route.ts`, `lib/server/order-transitions.ts`, `tests/midtrans-notification.test.ts`, `tests/qris-api.test.ts`, `tests/order-transitions.test.ts`.
- Modify: `lib/server/items.ts`, `app/[locale]/pay/[orderId]/page.tsx`, `components/qr-payment.tsx`, `components/seller-item-form.tsx`, `README.md`, `DEVLOG.md`.

**Interfaces:**
- Consumes: winner order reads, closed item current price, Midtrans sandbox keys, seller/winner authorization.
- Produces: `verifyMidtransSignature(payload, serverKey): boolean`; `mapMidtransStatus(payload): 'paid'|'expired'|'pending'|'ignore'`; QR create/resume `{ qrUrl: string; status: Order['status'] }`; pending-only order transitions; `getRelistSourceForSeller(itemId)`; seller relist creates a new item.

- [ ] **Step 1: Write failing signature and status tests**

For `order_id='order-123'`, `status_code='200'`, `gross_amount='2450000.00'`, key=`Mid-server-test`, expected SHA-512 is `3c7ff171dcd440609be21559d8435f6543dda8f710a35255fdebab41a59337c7fe04bd71b28df4670a755eb206fb6dc0bd66634fb1ed7332793dec6d35c8223e`. Add altered signature/payload, settlement, expire, pending, deny, capture fraud accept/challenge, and malformed body cases. Signature comparison uses constant-time buffers of equal declared hash length without leaking expected values.

```ts
it('accepts the exact provider signature and rejects mutation', () => {
  expect(verifyMidtransSignature(validNotification, 'Mid-server-test')).toBe(true);
  expect(verifyMidtransSignature(
    { ...validNotification, gross_amount: '1.00' }, 'Mid-server-test',
  )).toBe(false);
});
```

- [ ] **Step 2: Verify failures, then implement signature and transition mapping**

Implement payload type guards, normalized but byte-accurate concatenation of provider string fields, signature verification, and mapping from Task Spec. Deny/unknown statuses leave pending; only settlement and fraud-accepted capture become paid; expire becomes expired.

- [ ] **Step 3: Write failing QR create/resume and ownership tests**

Assert non-winner→403, amount always comes from closed item, charge-request `gross_amount` is the exact integer IDR while webhook comparison accepts Midtrans's decimal string, charge body has `payment_type:'qris'` and fixed database order ID, a fresh charge includes `custom_expiry: { expiry_duration: 300, unit: 'second' }`, and `generate-qr-code` action returns QR URL. Missing action→502. Mock Midtrans duplicate order 409 then successful transaction status; assert recovery uses existing transaction ID/QR action and performs at most one attempted charge. A delayed first charge receives remaining server seconds, not a fresh five minutes; remaining <20s returns 409 without a charge because Midtrans rejects that threshold, while only the real server deadline may mark the order expired.

- [ ] **Step 4: Implement Core API create-or-resume and payment UI**

Configure `midtrans-client` CoreApi in sandbox mode. A new charge carries `custom_expiry` with integer remaining seconds/`unit:'second'` (exactly 300 for an immediately created order). Refresh checks status first; missing transaction creates charge, duplicate recovers rather than recharges. Payment page shows a responsive QR image or an actionable failure, trusted amount, server-derived five-minute countdown, pending/paid/expired labels, and mock-confirm fallback. Provider secrets/QR resume logic stay server-only.

- [ ] **Step 5: Write failing webhook/expiry/terminal-state tests**

Assert bad signature/order/payment-type/gross amount → no write; duplicate valid notifications perform one effective transition; `pending→paid` sets server `paid_at`; valid pending→expire{300}s succeeds; early expire no-ops; `paid` cannot expire and `expired` cannot become paid via late settlement or mock confirm. Apply updates with `.eq('status','pending')` and inspect returned rows to serialize transitions atomically at the row level.

- [ ] **Step 6: Implement webhook, expire, mock-confirm, and relist**

Webhook parses raw JSON once, verifies provider authenticity plus local order/item amount, applies pending-only transition, and is idempotent. Expire verifies server deadline and winner/seller authorization. Mock confirm requires winner and pending status. Add `getRelistSourceForSeller(itemId)` to `lib/server/items.ts`: it requires seller authorization and uses the admin client to return an editable title/image/start-price source only when the item's order is expired; public order RLS stays unchanged. Seller relist uses that source but calls `create_live_item` for a new UUID/timeslot; expired item history stays untouched.

- [ ] **Step 7: Run production payment acceptance**

Set the real notification URL to `https://<app>.vercel.app/api/orders/webhook`. Run all checks and test valid QR creation, refresh with no duplicate charge, invalid webhook rejection, paid confirmation, five-minute expiration, late-event protection, and relist. Use mock-confirm only as the documented sandbox fallback. Deploy; after explicit confirmation commit `feat: sandbox qris checkout + webhook` with only task files.

### Task 9: Final fixture purge, hardening, localization, and golden-path verification

**Files:**
- Modify: `README.md`, `DEVLOG.md`, `app/layout.tsx`, `app/globals.css`, `messages/id.json`, `messages/en.json`, remaining pages/components that still contain fixture/fallback preview markers.
- Create: `docs/SETUP.md`, `scripts/check-demo.mjs` only if a read-only smoke check reduces manual repetition, `tests/message-keys.test.ts` only if the Task 2 test does not already cover all final keys.
- Delete: `lib/demo-data.ts` only after every import is replaced; keep the two preserved visual mockup HTML files under ignored `.superpowers/`, outside the application.

**Interfaces:**
- Consumes: all earlier real flows.
- Produces: complete setup/deployment documentation and reproducible final production acceptance; no fixture-data imports or UI-preview labels.

- [ ] **Step 1: Assert no shell data or accidental authority remains**

Search for `demo-data`, `UI PREVIEW`, direct client `from(...).insert/update/delete`, client `created_at/ends_at`, raw secrets, and out-of-scope labels. Add a static configuration test or grep check that fails if fixture imports or direct browser table mutations remain; remove violations without altering tested RPC behavior.

- [ ] **Step 2: Complete style, metadata, accessibility, and bilingual polish**

Verify logo/favicon/HOBYD title, no Create Next App residue, all server error codes localized, no horizontal overflow at 360px, keyboard navigation/focus, reduced motion/transparency, increased contrast, and visible connection/payment states. Run catalog, unit, integration, type, lint, and production build checks.

- [ ] **Step 3: Finish setup and development records**

Document fresh Supabase SQL/seed/bucket/auth steps, LiveKit Cloud setup, Midtrans sandbox webhook URL, all env names without values, Vercel deployment, local commands, seller+three-bidder account preparation, and emergency mock-confirm/refresh escape paths. Record UI-shell-first and additive server-time item RPC decisions in DEVLOG if not already present.

- [ ] **Step 4: Reset designated demo data and execute the complete production golden path**

Use only `supabase/seed.sql` room plus one seller and three pre-created bidders; remove old active items/pending orders through an intentional server/admin cleanup, not ad hoc browser writes. Execute all timestamps and assertions in `docs/03-demo-scenario.md`: Go Live, item, three-client synchronization, exact extension evidence/cap, winner lock, one order after double close, QR/refresh, paid or mock-confirm, expired relist, and video-off bid continuity. Check `/id` and `/en` on desktop/mobile and save backup screenshots.

- [ ] **Step 5: Final deploy and completion evidence**

Run `npx vitest run`, `npx tsc --noEmit`, `npx next build` immediately before deployment, deploy production, and rerun the smoke path on that exact deployment. Fill live URL, architecture summary, demo evidence, and test results in README. After explicit confirmation, stage only intended release files and commit `chore: freeze demo + final verification`; do not create a tag or release without separate explicit user approval.

---

## Execution Note

Tasks are sequential because each produces interfaces and production guarantees consumed by the next. Do not start LiveKit/order/payment work to compensate for a failing bid gate, and do not polish around skipped integration tests or missing credentials.
