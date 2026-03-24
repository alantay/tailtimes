# TailTimes – Milestone 1 (MVP Core) Implementation Plan

## Context

TailTimes is a mobile-first app for pet sitters to share session updates with owners. Milestone 1 delivers the core loop: sitter logs in → creates a session → uploads photos/videos → shares a link with the owner → owner views a private feed (no login required).

The backend infrastructure (Fastify, DB schema, Cloudinary, Firebase Admin) is ~70% built. All mobile screens are stubs. The goal of this milestone is to wire everything together into a working end-to-end product.

## Ordered Delivery Plan

The checklist below is easiest to execute in dependency order:

1. **Data foundation**
   Generate and commit the initial Drizzle migration, add safe local reset/seed scripts, and confirm the schema can be applied repeatably. This unblocks every backend route and every mobile query.
2. **Backend domain APIs**
   Implement sitter, session, update, and owner-feed routes with shared validation helpers and route registration in `server.ts`.
3. **Shared contracts**
   Extract request/response types into `shared/` so backend, mobile, and web all speak the same data shape.
4. **Mobile platform setup**
   Add the API client, Firebase auth, auth context, and route guards so the mobile app can authenticate and talk to the backend safely.
5. **Primary sitter flow**
   Build auth screens, session creation/list/detail, and the capture/upload path in the Expo app.
6. **Owner consumption flow**
   Finish the public owner feed in `web/` and wire mobile share actions to the browser URL format documented in `product.md`.
7. **End-to-end verification**
   Smoke test the full sitter → upload → owner-view loop against the MVP success criteria.

## Immediate Next Task

The next technical task is **Shared contracts and deep-link owner access**. The public web owner feed and the in-app session timeline are now visually polished enough for real MVP use, so the next clean-up step is extracting owner/session/update response types into `shared/` and then deciding whether `tailtimes://s/:shareLink` should open a lightweight owner view inside the app or continue deferring to the browser-only flow.

---

## Critical Files

### Backend

- `backend/src/server.ts` – Route registration missing
- `backend/src/models/schema.ts` – Schema exists, migrations not yet generated
- `backend/src/models/db.ts` – DB connection setup
- `backend/src/routes/uploads.ts` – Upload route exists but not registered
- `backend/src/services/auth.ts` – Firebase Admin auth service
- `backend/src/services/cloudinary.ts` – Cloudinary service

### Mobile

- `mobile/app/_layout.tsx` – Root layout, needs auth state
- `mobile/app/(tabs)/_layout.tsx` – Tab bar (2 tabs: Sessions, Profile)
- `mobile/app/(tabs)/index.tsx` – Sessions list with quick-capture icons
- `mobile/app/(tabs)/profile.tsx` – Sitter profile
- `mobile/app/sessions/[id]/index.tsx` – Session detail with capture button
- `mobile/app/sessions/[id]/capture.tsx` – Instagram-style contextual capture screen

---

## Implementation Checklist

### 1. Backend – Database Migrations

- [x] Run `npm run db:generate` to generate Drizzle migration files from `schema.ts`
- [x] Run `npm run db:migrate` to apply migrations to the database
- [x] Verify all four tables exist: `sitters`, `sessions`, `updates`, `session_stats`
- [x] Create `backend/src/scripts/seed-db.ts` with sample sitter + session + updates for testing
- [x] Wire seed script to `npm run db:seed` in `backend/package.json`

### 2. Backend – Sitter Routes

Create `backend/src/routes/sitters.ts`:

- [x] `POST /api/sitters` – Create sitter profile on first login
  - Auth: required (`authenticateUser` middleware)
  - Body: `{ name, email, bio?, phone?, location? }`
  - Logic: Upsert by `firebaseUid` (idempotent for re-registration)
  - Returns: sitter record
- [x] `GET /api/sitters/me` – Get own profile
  - Auth: required
  - Returns: full sitter record
- [x] `PATCH /api/sitters/me` – Update own profile
  - Auth: required
  - Body: any subset of `{ name, bio, phone, location, profileImage }`
  - Returns: updated sitter record
- [x] `GET /api/sitters/:id` – Get public sitter profile
  - Auth: none
  - Returns: `{ name, bio, location, profileImage }`

### 3. Backend – Session Routes

Create `backend/src/routes/sessions.ts`:

- [x] `POST /api/sessions` – Create a new boarding session
  - Auth: required
  - Body: `{ petName, petType, ownerName, ownerContact?, startDate, endDate?, notes? }`
  - Logic: Generate unique `shareLink` (UUID or nanoid), create `session_stats` row
  - Returns: full session record including `shareLink`
- [x] `GET /api/sessions` – List own sessions
  - Auth: required
  - Returns: sessions array ordered by `createdAt` desc
- [x] `GET /api/sessions/:id` – Get own session detail
  - Auth: required
  - Returns: session + updates
- [x] `PATCH /api/sessions/:id` – Update session (end date, notes)
  - Auth: required, must own session
  - Body: any subset of `{ endDate, notes, isActive }`
- [x] `DELETE /api/sessions/:id` – Soft delete (set `isActive = false`)
  - Auth: required, must own session

### 4. Backend – Update Routes

Create `backend/src/routes/session-updates.ts`:

- [x] `POST /api/sessions/:id/updates` – Upload a photo/video update
  - Auth: required, must own session
  - Body: direct-upload metadata + `{ caption? }`
  - Logic: Store the Cloudinary result in `updates`, increment `session_stats`, and return a thumbnail URL
  - Returns: `{ id, mediaUrl, thumbnailUrl, type, caption, createdAt }`
- [x] `GET /api/sessions/:id/updates` – List updates for own session
  - Auth: required
  - Returns: updates array ordered by `createdAt` desc
- [x] `DELETE /api/sessions/:sessionId/updates/:updateId` – Delete an update
  - Auth: required, must own session
  - Logic: Delete from Cloudinary via `CloudinaryService.deleteMedia()`, remove DB row, decrement stats

### 5. Backend – Owner (Public) Routes

Create `backend/src/routes/owner.ts`:

- [x] `GET /api/share/:shareLink` – Public session feed for owner
  - Auth: none
  - Logic: Look up session by `shareLink`, only return if `isActive = true`
  - Returns: `{ session: { petName, petType, ownerName, startDate, endDate }, updates: [...], sitter: { name, profileImage } }`
  - Note: Never expose `ownerContact`, `sitterFirebaseUid`, or internal IDs in this response

### 6. Backend – Register All Routes in server.ts

- [x] Import and register all route modules in `backend/src/server.ts` using `fastify.register()`
- [x] Register `uploads.ts`, `sitters.ts`, `sessions.ts`, `session-updates.ts`, `owner.ts`
- [x] Add a global error handler for Zod validation errors (return 400 with field errors)
- [x] Add request logging for all routes in development

### 7. Backend – Input Validation

- [x] Add Zod schemas for all route body/param validation
- [x] Create `backend/src/utils/validate.ts` helper to wrap Zod parsing and throw Fastify 400 errors

### 8. Mobile – API Client

Create `mobile/src/services/api.ts`:

- [x] Base API client using `fetch` with `EXPO_PUBLIC_API_URL` base URL
- [x] Auto-attach Firebase ID token as `Authorization: Bearer <token>` header for authenticated requests
- [x] Typed response helpers: `apiGet<T>`, `apiPost<T>`, `apiPatch<T>`, `apiDelete<T>`
- [x] Error handling: parse server error responses and surface message to UI

### 9. Mobile – Firebase Auth

- [x] Install `firebase` package: `npx expo install firebase`
- [x] Create `mobile/src/services/firebase.ts` – initialize Firebase app from `EXPO_PUBLIC_FIREBASE_CONFIG`
- [x] Create `mobile/src/services/auth.ts`:
  - `signInWithEmail(email, password)`
  - `signUpWithEmail(email, password)`
  - `signOut()`
  - `getCurrentUser()` – returns Firebase `User | null`
  - `getIdToken()` – returns current user's JWT
- [x] Create auth context in `mobile/src/context/AuthContext.tsx`:
  - `AuthProvider` wraps app, listens to `onAuthStateChanged`
  - Exposes `{ user, sitterProfile, isLoading, signIn, signUp, signOut }`
  - On first login, calls `POST /api/sitters` to create sitter profile
- [x] Wrap root layout in `AuthProvider`

### 10. Mobile – Auth Screens

Create `mobile/app/(auth)/` directory with Expo Router:

- [x] `mobile/app/(auth)/_layout.tsx` – Stack layout for auth screens
- [x] `mobile/app/(auth)/login.tsx` – Email/password login form
  - Fields: email, password
  - Action: `signInWithEmail()` → redirect to `/(tabs)`
  - Link to sign-up
- [x] `mobile/app/(auth)/signup.tsx` – Sign-up form
  - Fields: name, email, password
  - Action: `signUpWithEmail()` + `POST /api/sitters` → redirect to `/(tabs)`
- [x] Update `mobile/app/_layout.tsx` – redirect unauthenticated users to `/(auth)/login`

### 11. Mobile – Sessions Screen (Tab 1: Home)

`mobile/app/(tabs)/index.tsx`:

- [x] Fetch sessions from `GET /api/sessions` using React Query (`useQuery`)
- [x] Display list of sessions with: pet name, pet type, owner name, start/end dates, update count
- [x] Empty state: "No sessions yet" with CTA button
- [x] Compact "New session" button in list header (replaces old FAB)
- [x] Quick-capture camera icon on each active session card → opens `sessions/[id]/capture`
- [x] Tap session card → navigate to session detail
- [x] Simulator validation: sessions list renders after Firebase auth succeeds

Create `mobile/app/sessions/new.tsx`:

- [x] Form: pet name (required), pet type (picker: dog/cat/other), owner name, start date
- [x] Submit → `POST /api/sessions` → navigate to session detail
- [x] Validation: require pet name and start date
- [x] Simulator validation: session creation succeeds against the live backend API

### 12. Mobile – Session Detail (`sessions/[id]/index.tsx`)

- [x] Fetch session detail from `GET /api/sessions/:id`
- [x] Show session header: pet name, pet type, dates
- [x] Prominent "Capture update" button at top (active sessions only)
- [x] Compact owner link section: inline URL + native Share button
- [x] Compact session snapshot: single row with date range + update count
- [x] Scrollable updates timeline (photos/videos with captions)

### 13. Mobile – Contextual Capture (`sessions/[id]/capture.tsx`)

Instagram-style capture flow, launched from session detail or home screen:

- [x] Session context pill at top: "{petName} for {ownerName}"
- [x] 3 states: Capture → Compose → Uploading
- [x] Auto-launches system camera on Expo Go (fallback from embedded camera)
- [x] Compose screen: photo/video preview + expandable caption input + "Send to {ownerName}" button
- [x] "Retake" secondary button to go back to capture
- [x] On success: `router.back()` pops to session detail (no alert dialog)
- [x] Image picker fallback: "Choose from library" button
- [x] Uses `uploadSessionMedia` from `mobile/src/services/media.ts`

### 14. Mobile – Profile Screen (Tab 2: Profile)

`mobile/app/(tabs)/profile.tsx`:

- [x] Fetch `GET /api/sitters/me` and display profile
- [x] Editable fields: name, bio, location, phone
- [x] Profile photo: tap to pick from library → upload to Cloudinary → `PATCH /api/sitters/me`
- [x] Sign out button

### 15. Mobile – Owner Feed (Web/Deep Link View)

Create `mobile/app/s/[shareLink].tsx` (Expo Router handles deep link `tailtimes://s/:shareLink`):

- [ ] Fetch `GET /api/share/:shareLink`
- [ ] Show session info: pet name, sitter name, sitter profile image, date range
- [ ] Scrollable feed of updates (photos/videos) in chronological order
- [ ] No login required – publicly accessible
- [ ] Photo tap → full-screen lightbox
- [ ] Video tap → play inline
- [ ] "Powered by TailTimes" footer (subtle branding)

### 16. Shared Types

Create `shared/types/index.ts`:

- [x] `Sitter` – mirrors DB sitters table (minus firebaseUid)
- [x] `Session` – mirrors DB sessions table
- [x] `Update` – mirrors DB updates table
- [x] `SessionWithUpdates` – Session + updates[]
- [x] `PublicSessionFeed` – owner-safe response type from `GET /api/share/:shareLink`
- [x] `CreateSessionInput`, `CreateUpdateInput`, etc. – request body types
- [x] Set up `shared/package.json` with `"name": "@tailtimes/shared"`
- [x] Reference from backend and mobile `package.json` as a local workspace dependency
  - [x] Mobile and web now consume the shared types through TypeScript path aliases
  - [x] Backend route responses now map explicitly into the shared API contracts

### 17. End-to-End Testing & Verification

- [x] Start backend: `cd backend && npm run dev` – confirm `/health` returns 200
- [x] Run DB seed: `npm run db:seed` – verify seed data in DB
- [x] Test auth: Firebase Email/Password enabled; sitter auth now succeeds and creates sitter rows through `POST /api/sitters`
- [x] Test session creation: `POST /api/sessions` with valid token → verify `shareLink` generated
- [ ] Test upload: multipart `POST /api/sessions/:id/updates` → verify Cloudinary URL in response
- [x] Test public feed: `GET /api/share/:shareLink` (no auth) → verify update list returned
- [x] Start mobile: `cd mobile && expo start --ios`
- [~] Walk through core sitter flow in simulator:
  - [x] auth screen renders
  - [x] sign-in path succeeds after Firebase Auth setup
  - [x] sessions list loads from the backend (with quick-capture icons on active sessions)
  - [x] session creation succeeds
  - [x] session detail renders (with prominent capture button + compact share link)
  - [x] contextual capture screen opens from session detail with correct pet context
  - [x] capture/upload UI wired and bundled successfully
- [ ] Verify upload completes in under 3 seconds on WiFi (core success metric)

### 18. Current Temporary Workarounds

- [x] Backend now loads `.env` directly via `dotenv/config`, so local dev no longer depends on `source .env` shell parsing
- [x] Backend binds to `0.0.0.0` by default, which allows Expo Go / simulator traffic from the local network
- [x] Mobile auth/session validation was completed in the iOS Simulator before removing the earlier dev-only shortcuts for demo auth and demo session creation
- [x] Root/auth/tabs layouts currently use `Slot` instead of native Expo Router `Stack` / `Tabs` because Expo Go is still crashing on `RNSSafeAreaView` / `RNSScreen`
- [x] The dev-only auto-login and auto-session creation helpers have now been removed
- [x] Tabs currently use a stable custom bottom navigation shell while the Expo Go native-screen mismatch remains unresolved
- [x] Expo Go on iPhone currently uses the stable system-camera fallback because the embedded `expo-camera` view does not mount reliably there without a more native build workflow

---

## Key Constraints to Respect

- **No auth for owners** – `GET /api/share/:shareLink` must never require a token
- **Minimize friction** – contextual capture (from session detail) must be the default experience, not a generic camera tab
- **Upload < 3 seconds** – use Cloudinary's existing `uploadMedia()` with streaming; do not buffer entire file in memory first
- **Idempotent sitter creation** – `POST /api/sitters` must upsert so re-installing the app doesn't break anything
