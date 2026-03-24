This file provides guidance to Claude Code (claude.ai/code) and Codex when working with code in this repository.

For full product and technical context, see:
- [`docs/product.md`](docs/product.md) — problem, solution, core loop, differentiation
- [`docs/user_flows.md`](docs/user_flows.md) — sitter and owner flows
- [`docs/mvp_scope.md`](docs/mvp_scope.md) — in/out of scope, success criteria
- [`docs/tech_decisions.md`](docs/tech_decisions.md) — stack rationale, implementation phases, ADRs

---

## Tech Stack

| Layer | Choice |
|---|---|
| Mobile | React Native + Expo |
| Backend | Node.js + Fastify (Railway, port 3001) |
| Database | PostgreSQL via Supabase (managed host only in MVP) |
| Media | Cloudinary (direct upload from mobile) |
| Auth | Firebase Auth — sitters only; owners use share links |
| Owner Feed | Next.js on Vercel (`web/`, port 3002) |

## Architecture

```
mobile/          # React Native + Expo
├── app/         # Expo Router screens
└── src/
    ├── components/
    ├── context/     # AuthContext
    ├── services/    # API client, Firebase auth
    └── utils/

backend/         # Fastify API (Railway)
└── src/
    ├── routes/      # API endpoints
    ├── models/      # Drizzle ORM schema + DB connection
    ├── services/    # Cloudinary, Firebase Admin
    └── utils/       # Auth middleware, validation helpers

web/             # Next.js (Vercel) — owner-facing session feed
└── src/app/s/[shareLink]/page.tsx   # Public, no login required

shared/          # TypeScript types shared across packages
└── types/
```

## Key Patterns

- **Auth**: Firebase email/password for sitters; owners access via share link in browser (no login)
- **Upload**: Mobile uploads directly to Cloudinary via signed preset → calls backend to store URL in DB
- **Owner feed**: Share link opens `web/` Next.js page — works in any browser, no app required
- **State**: React Query for server state, React Context for auth state
- **Styling**: NativeWind (Tailwind for React Native)

## Development Commands

```bash
npm run setup        # Install all dependencies
npm run dev          # Start backend + mobile + web concurrently

cd backend && npm run dev          # Fastify (port 3001)
cd mobile  && expo start --ios     # Expo on iOS simulator
cd web     && npm run dev          # Next.js (port 3002)

npm run db:migrate   # Apply Drizzle migrations
npm run db:seed      # Seed test data
npm run db:reset     # Reset local DB
```

## Local Dev Notes

- **Backend env loading**: `backend` now loads `.env` directly with `dotenv/config`, so local scripts and `npm run dev` should work without manually running `source .env`
- **LAN testing from Expo Go / Simulator**: when testing on a phone or simulator, `EXPO_PUBLIC_API_URL` in `mobile/.env` should point to your Mac's LAN IP (for example `http://192.168.x.x:3001`), not `http://localhost:3001`
- **Backend host binding**: the Fastify server binds to `0.0.0.0` by default for local development so mobile clients on the same network can reach it
- **Firebase prerequisite**: Firebase Authentication must be enabled with the `Email/Password` provider before sitter sign-in/sign-up can succeed
- **Current mobile navigation caveat**: the app currently uses a stable `Slot`-based Expo Router shell with a custom bottom tab bar because native `Stack` / `Tabs` still crash on `RNSSafeAreaView` / `RNSScreen` in Expo Go. The earlier dev-only auto-login and auto-session helpers have been removed; revisit native navigators later, likely with a dev build or a deeper `react-native-screens` fix.
- **Contextual capture flow**: The camera is no longer a tab — capture is launched from within a session (Instagram-style: capture → compose with optional caption → send). The bottom nav has 2 tabs: Sessions and Profile. Capture screen is at `mobile/app/sessions/[id]/capture.tsx`.
- **Current camera caveat**: Expo Go on iPhone does not expose the embedded `expo-camera` view reliably in this project, so the capture screen auto-launches the system camera as a fallback. Treat the embedded in-app camera as a future enhancement unless the project later adopts a paid Apple Developer + dev-build workflow.

## Environment Variables

```bash
# backend/.env
DATABASE_URL=postgresql://...
CLOUDINARY_URL=cloudinary://...
CLOUDINARY_API_SECRET=...
FIREBASE_ADMIN_KEY=...

# mobile/.env
EXPO_PUBLIC_API_URL=http://localhost:3001
EXPO_PUBLIC_OWNER_FEED_URL=http://localhost:3002
EXPO_PUBLIC_FIREBASE_CONFIG=...
EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=...
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=...

# web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3001
```
