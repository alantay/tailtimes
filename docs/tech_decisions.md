# Tech Decisions

## Mobile Frontend

**React Native with Expo**
- Camera-first experience for pet photos/videos
- Cross-platform (iOS + Android) from single codebase
- 30-40% faster development vs native
- Strong ecosystem for media handling
- Expo Router for navigation
- NativeWind (Tailwind CSS for React Native)

## Backend

**Node.js with Fastify**
- Fastest Node.js framework for API handling
- JSON Schema validation
- Plugin architecture for extensions

**PostgreSQL with Supabase**
- ACID compliance for data integrity
- JSON support for flexible metadata (Cloudinary response stored as JSONB)
- Future AI support via pgvector
- Managed hosting removes ops overhead

> **MVP note:** Supabase is used as a managed Postgres host only. The backend connects via the standard `postgres` driver (Drizzle ORM). Supabase-specific features — Row-Level Security and Realtime subscriptions — are deferred to Phase 2.

**`session_stats` table:** A denormalised counter table (`total_updates`, `total_photos`, `total_videos`, `last_update_at`) maintained on each upload. Avoids expensive `COUNT` queries when rendering session lists.

## Media Storage

**Cloudinary**
- Direct upload from mobile using signed upload presets (no server round-trip)
- Automatic mobile optimisation and compression
- Real-time image/video transformations via URL params
- AI-powered features (Phase 3)
- Global CDN for fast delivery

**Upload flow (MVP):**
1. Mobile requests a signed upload signature from backend (`GET /api/media/sign`)
2. Mobile uploads file directly to Cloudinary
3. On success, mobile calls `POST /api/media` with the Cloudinary URL + metadata
4. Backend stores URL in `updates` table and increments `session_stats`

## Authentication

**Firebase Auth**
- 50K free MAUs (highest free tier); $0.00325/MAU thereafter
- Fastest auth flows (50-150ms)
- Perfect for mobile-first apps
- Sitters-only authentication (owners use share links)
- MVP: email/password only; Google/Apple sign-in deferred to Phase 2

## Hosting

**Railway (Backend)**
- Fastest deployment experience
- No cold starts (critical for API response time)
- Usage-based pricing
- Great for MVP iteration speed

**Vercel (Owner Feed Web App)**
- Hosts the `web/` Next.js app — the owner-facing session feed
- Owner share link resolves to `https://tailtimes.app/s/<shareLink>` — opens in any browser, no app required
- Global edge performance for fast load times
- Seamless deployment from GitHub

## Why this stack?

### Prioritizes Core Requirements
- **<3 second uploads**: Direct Cloudinary upload from mobile bypasses server entirely
- **Mobile-first**: React Native with native camera access
- **No owner login**: Firebase Auth for sitters only; owners access via link in browser
- **AI features**: Cloudinary AI for smart captions etc. (Phase 3)

### Development Velocity
- React Native: 30-40% faster than native development
- Expo: Rapid prototyping and testing
- Fastify: High-performance API with minimal setup
- Railway: Deploy in minutes, not hours

### Cost Efficiency
- Firebase Auth: 50K free MAUs vs competitors' 7K-10K; $0.00325/MAU thereafter
- Supabase: Affordable managed Postgres
- Railway: Usage-based pricing for MVP phase
- Cloudinary: Free tier covers initial development

### Scalability Path
- All services scale horizontally
- Can migrate to custom infrastructure later
- Mobile app works offline (Phase 2)

## Alternative Considered

**Flutter + FastAPI + MongoDB + Auth0**
- Better UI performance vs React Native
- Python backend for future AI features
- Document storage for flexible schema
- Enterprise-grade auth

**Rejected because:**
- Smaller developer pool (Dart vs JavaScript)
- Slower initial development
- Higher auth costs ($0.07/MAU vs $0.00325/MAU for Firebase)
- More complex setup for MVP

## Implementation Phases

### Phase 1: MVP Core
1. React Native app with contextual capture (Instagram-style flow per session)
2. Direct Cloudinary upload from mobile (signed preset)
3. Fastify backend: sitter, session, update, and owner-feed routes
4. Firebase Auth for sitters (email/password)
5. Next.js owner feed page on Vercel (`web/app/s/[shareLink]`)
6. Shared TypeScript types across backend, mobile, and web
7. 2-tab navigation (Sessions + Profile) with contextual capture from session detail

### Phase 2: Polish & Scale
1. Supabase Realtime subscriptions (owner feed live updates)
2. Row-Level Security on Postgres
3. Offline support with sync
5. Google / Apple sign-in
6. Upload progress and retry handling

### Phase 3: Growth Features
1. AI-powered captions
2. Analytics dashboard
4. Push notifications

## Success Metrics

**Technical:**
- Upload time < 3 seconds on WiFi (measured end-to-end)
- 99.9% uptime for owner feed
- Owner feed first load < 2 seconds

**Business:**
- Will sitters use daily instead of WhatsApp?
- Do owners prefer TailTimes links over chat spam?
- Do owners share the feed link with friends?

## Future Considerations

### When to Consider Changes

**Native Development**: If performance becomes critical (>100K DAU)
**Custom Infrastructure**: If costs exceed $10K/month
**Microservices**: If team grows beyond 10 engineers
**AI Backend**: When implementing smart features (captioning, recommendations)

### Monitoring & Alerts
- Upload success rates
- API response times
- Database query performance
- Media storage costs
- User authentication metrics
