# 🍽️ TastyTrail

A beautiful meal discovery app built with React Native & Expo. Browse thousands of recipes, save your favorites, and get daily meal inspiration.

## ✨ Features

- **🔍 Discover Meals** — Browse by category (Chicken, Dessert, Vegetarian, Pasta, etc.)
- **🔎 Search** — Find any meal by name instantly
- **❤️ Save Favorites** — Save meals to your personal collection (synced to cloud)
- **🔔 Daily Reminders** — Get a notification at noon for meal inspiration
- **🔐 Google Auth** — Secure sign-in with Google via Clerk
- **📱 Smooth Animations** — Premium UI with staggered fade-in animations

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| **React Native** (0.81) | Cross-platform mobile framework |
| **Expo** (SDK 54) | Build tooling & native modules |
| **Expo Router** | File-based navigation |
| **NativeWind** | Tailwind CSS for React Native |
| **Clerk** | Authentication (Google SSO) |
| **Convex** | Backend database (saved meals) |
| **Reanimated** | Smooth animations |
| **Zustand** | Client state management |
| **TheMealDB API** | Recipe data source |

## 📂 Project Structure

```
TastyTrail/
├── app/                  # Screens (file-based routing)
│   ├── index.tsx         # Home screen
│   ├── _layout.tsx       # Root layout + providers
│   ├── sso-callback.tsx  # OAuth callback
│   ├── auth/
│   │   └── sign-in.tsx   # Google sign-in
│   └── (tabs)/
│       ├── _layout.tsx   # Tab bar config
│       ├── index.tsx     # Discover meals
│       ├── saved.tsx     # Saved meals
│       └── profile.tsx   # User profile
├── constant/             # Theme colors, shadows, categories
├── convex/               # Backend schema & mutations
├── lib/                  # Auth, cache, notifications
├── services/             # API calls (TheMealDB)
├── store/                # Zustand state
└── types/                # TypeScript types
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI
- Clerk account (for auth)
- Convex account (for backend)

### Setup

1. **Clone the repo**
   ```bash
   git clone https://github.com/abdulhaque2005/TastyTrail.git
   cd TastyTrail
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Fill in your Clerk and Convex keys in `.env`

4. **Start the Convex backend**
   ```bash
   npx convex dev
   ```

5. **Start the app**
   ```bash
   npx expo start
   ```

## 📱 Screenshots

> Coming soon — Run the app to see the beautiful UI!

## 📄 License

This project is for educational and personal use.

---

Built with ❤️ by [Abdul Haque](https://github.com/abdulhaque2005)
