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

The next technical task is **Mobile navigation stabilization and cleanup**. The sitter flow is now validated in the iOS Simulator through auth, session list, session creation, and session detail, but the Expo Router native `Stack` / `Tabs` navigators are still crashing on native screen components in Expo Go. The temporary `Slot`-based layouts and dev-only auto-validation helpers should be removed once the native navigator/runtime mismatch is resolved cleanly.

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
- `mobile/app/(tabs)/_layout.tsx` – Tab bar (3 tabs: Sessions, Capture, Profile)
- `mobile/app/(tabs)/index.tsx` – Sessions list (stub)
- `mobile/app/(tabs)/camera.tsx` – Camera capture (stub)
- `mobile/app/(tabs)/profile.tsx` – Sitter profile (stub)

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
- [x] `GET /api/sitters/:id` – Get public sitter profile (for portfolio)
  - Auth: none
  - Returns: `{ name, bio, location, profileImage, publicSessionCount }`

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
- [x] `PATCH /api/sessions/:id` – Update session (end date, notes, isPublic)
  - Auth: required, must own session
  - Body: any subset of `{ endDate, notes, isPublic, isActive }`
- [x] `DELETE /api/sessions/:id` – Soft delete (set `isActive = false`)
  - Auth: required, must own session

### 4. Backend – Update Routes

Create `backend/src/routes/session-updates.ts`:

- [x] `POST /api/sessions/:id/updates` – Upload a photo/video update
  - Auth: required, must own session
  - Body: direct-upload metadata + `{ caption?, isPublic? }`
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

Replace stub in `mobile/app/(tabs)/index.tsx`:

- [x] Fetch sessions from `GET /api/sessions` using React Query (`useQuery`)
- [x] Display list of sessions with: pet name, pet type icon, start date, update count
- [x] Empty state: "No sessions yet – start one!" with CTA button
- [x] Tap session → navigate to `mobile/app/sessions/[id].tsx`
- [x] FAB (floating action button) → navigate to `mobile/app/sessions/new.tsx`
- [x] Simulator validation: sessions list renders after Firebase auth succeeds

Create `mobile/app/sessions/new.tsx`:

- [x] Form: pet name (required), pet type (picker: dog/cat/other), owner name, start date
- [x] Submit → `POST /api/sessions` → navigate to session detail
- [x] Validation: require pet name and start date
- [x] Simulator validation: session creation succeeds against the live backend API

Create `mobile/app/sessions/[id].tsx`:

- [x] Fetch session detail from `GET /api/sessions/:id`
- [x] Show session header: pet name, dates, update count
- [x] Scrollable feed of updates (photos/videos)
- [x] Share button: opens the native share sheet with `https://tailtimes.app/s/<shareLink>`
- [x] Simulator validation: session detail renders after successful creation
- [ ] FAB → navigate to camera tab pre-loaded with this sessionId

### 12. Mobile – Camera / Upload Screen (Tab 2: Capture)

Replace stub in `mobile/app/(tabs)/camera.tsx`:

- [ ] Session selector at top (dropdown to choose active session) — pre-fill if navigating from a session
- [ ] Camera view using `expo-camera` (`CameraView` component)
  - [ ] Toggle front/back camera
  - [ ] Capture photo (tap shutter) or video (hold shutter, max 60s)
- [ ] After capture: preview screen with options:
  - [ ] Retake
  - [ ] Add optional caption (text input)
  - [ ] Toggle "Add to portfolio" (`isPublic` flag)
  - [ ] Upload button → `POST /api/sessions/:id/updates`
- [ ] Upload progress indicator (show % or spinner)
- [ ] On success: brief success toast, reset to camera ready state
- [ ] Image picker fallback: "choose from library" button using `expo-image-picker`

### 13. Mobile – Profile Screen (Tab 3: Profile)

Replace stub in `mobile/app/(tabs)/profile.tsx`:

- [x] Fetch `GET /api/sitters/me` and display profile
- [ ] Editable fields: name, bio, location
- [ ] Profile photo: tap to pick from library → upload to Cloudinary → `PATCH /api/sitters/me`
- [x] Sign out button
- [ ] Display count of public sessions (portfolio size)

### 14. Mobile – Owner Feed (Web/Deep Link View)

Create `mobile/app/s/[shareLink].tsx` (Expo Router handles deep link `tailtimes://s/:shareLink`):

- [ ] Fetch `GET /api/share/:shareLink`
- [ ] Show session info: pet name, sitter name, sitter profile image, date range
- [ ] Scrollable feed of updates (photos/videos) in chronological order
- [ ] No login required – publicly accessible
- [ ] Photo tap → full-screen lightbox
- [ ] Video tap → play inline
- [ ] "Powered by TailTimes" footer (subtle branding)

### 15. Shared Types

Create `shared/types/index.ts`:

- [ ] `Sitter` – mirrors DB sitters table (minus firebaseUid)
- [ ] `Session` – mirrors DB sessions table
- [ ] `Update` – mirrors DB updates table
- [ ] `SessionWithUpdates` – Session + updates[]
- [ ] `PublicSessionFeed` – owner-safe response type from `GET /api/share/:shareLink`
- [ ] `CreateSessionInput`, `CreateUpdateInput`, etc. – request body types
- [ ] Set up `shared/package.json` with `"name": "@tailtimes/shared"`
- [ ] Reference from backend and mobile `package.json` as a local workspace dependency

### 16. End-to-End Testing & Verification

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
  - [x] sessions list loads from the backend
  - [x] session creation succeeds
  - [x] session detail renders
  - [ ] capture/upload still pending
- [ ] Verify upload completes in under 3 seconds on WiFi (core success metric)

### 17. Current Temporary Workarounds

- [x] Backend now loads `.env` directly via `dotenv/config`, so local dev no longer depends on `source .env` shell parsing
- [x] Backend binds to `0.0.0.0` by default, which allows Expo Go / simulator traffic from the local network
- [x] Mobile auth/session validation was completed in the iOS Simulator using dev-only shortcuts for demo auth and demo session creation
- [x] Root/auth/tabs layouts currently use `Slot` instead of native Expo Router `Stack` / `Tabs` because Expo Go is still crashing on `RNSSafeAreaView` / `RNSScreen`
- [ ] Remove the dev-only validation helpers after the native navigator runtime is stabilized

---

## Key Constraints to Respect

- **No auth for owners** – `GET /api/share/:shareLink` must never require a token
- **Default private** – `isPublic` defaults to `false` on sessions and updates
- **Minimize friction** – camera screen must be the default capture experience, not image picker
- **Upload < 3 seconds** – use Cloudinary's existing `uploadMedia()` with streaming; do not buffer entire file in memory first
- **Idempotent sitter creation** – `POST /api/sitters` must upsert so re-installing the app doesn't break anything
