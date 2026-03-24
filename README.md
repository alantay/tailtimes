# TailTimes

**Making it effortless for sitters to share updates without the spam.**

TailTimes is a mobile-first app for pet sitters to share real-time updates during boarding sessions. Updates are shared via private links with pet owners — no login required, no WhatsApp clutter.

## 🎯 Core Features

- **📸 Instant Upload**: <3 second photo/video uploads from mobile
- **🔗 Private Sessions**: Shareable links for owners (no account needed) 
- **📱 Mobile-First**: Camera-first experience optimized for sitters
- **⚡ Real-time**: Live updates sync instantly to owner feeds

## 🚀 Tech Stack

- **Mobile**: React Native with Expo
- **Backend**: Node.js with Fastify
- **Database**: PostgreSQL with Supabase
- **Media**: Cloudinary for optimization & CDN
- **Auth**: Firebase Auth (sitters only)
- **Hosting**: Railway (API) + Vercel (web)

## 📁 Project Structure

```
tailtimes/
├── mobile/          # React Native app (Expo)
├── backend/         # Fastify API server
├── shared/          # Shared types & utilities
├── docs/            # Product & tech documentation
└── README.md
```

## 🛠 Development Setup

### Prerequisites
- Node.js 20+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- PostgreSQL (local or cloud)

### Quick Start

```bash
# Clone and install
git clone <repo-url>
cd tailtimes
npm run setup

# Start development servers
npm run dev

# Or start individually
npm run dev:mobile   # Expo development server
npm run dev:backend  # Fastify API server
```

### Environment Variables

Copy the example files and fill in your credentials:

```bash
cp mobile/.env.example mobile/.env
cp backend/.env.example backend/.env
```

**Backend (.env)**
```
DATABASE_URL=postgresql://user:pass@localhost:5432/tailtimes
CLOUDINARY_URL=cloudinary://key:secret@cloud_name
FIREBASE_ADMIN_KEY={"type":"service_account"...}
PORT=3001
```

**Mobile (.env)**
```
EXPO_PUBLIC_API_URL=http://localhost:3001
EXPO_PUBLIC_FIREBASE_CONFIG={"apiKey":"..."}
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
```

### Database Setup

```bash
# Generate and run migrations
cd backend
npm run db:generate
npm run db:migrate

# Seed with test data
npm run db:seed
```

## 📱 Mobile Development

```bash
cd mobile

# Start Expo development server
expo start

# Run on devices
expo start --ios     # iOS Simulator
expo start --android # Android Emulator
expo start --web     # Web browser
```

## 🔧 Backend Development

```bash
cd backend

# Start with hot reload
npm run dev

# Database operations
npm run db:studio    # Open Drizzle Studio
npm run db:reset     # Reset database
npm run db:seed      # Add test data

# Testing & Quality
npm test
npm run lint
```

## 🚀 Deployment

### Backend (Railway)
```bash
# Connect to Railway
railway login
railway link

# Deploy
git push origin main  # Auto-deploys via Railway GitHub integration
```

### Mobile (Expo)
```bash
cd mobile

# Build for stores
expo build:ios
expo build:android

# Over-the-air updates
expo publish
```

## 📊 Key Metrics

**Technical Goals:**
- Upload time: <3 seconds
- API response: <500ms
- Uptime: 99.9%
- Real-time latency: <1 second

**Business Goals:**
- Daily sitter usage vs WhatsApp
- Owner preference for TailTimes links
- Owner feed sharing with friends

## 🎨 Design Principles

1. **Friction-Free Uploads** - Camera-first, minimal taps
2. **Privacy by Default** - All sessions private unless explicitly shared
3. **Mobile-Optimized** - Designed for busy sitters on phones
4. **No Owner Login** - Link-based access keeps barriers low

## 📚 Documentation

- [Product Overview](./docs/product.md) - Features, users, and goals
- [Tech Decisions](./docs/tech_decisions.md) - Architecture choices and rationale
- [CLAUDE.md](./CLAUDE.md) - Development context for AI assistants

## 🤝 Contributing

```bash
# Development workflow
git checkout -b feature/your-feature
# Make changes
npm run lint          # Check code quality
npm test             # Run tests
git commit -m "Add feature"
git push origin feature/your-feature
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

**"Will sitters actually use TailTimes daily instead of WhatsApp?"**  
*All decisions should prioritize answering this question.*
