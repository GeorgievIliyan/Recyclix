![Recyclix Banner](./public/banner.png)

# ♻️ Recyclix

> Recycle, find, earn

A modern Next.js application designed to gamify and incentivize recycling through smart bins, task completion, and community engagement.

---

## 📋 Table of Contents

- [✨ Features](#-features)
- [🚀 Quick Start](#-quick-start)
- [🛠 Tech Stack](#-tech-stack)
- [📁 Project Structure](#-project-structure)
- [🔧 Configuration](#-configuration)
- [📚 Learn More](#-learn-more)
- [🚀 Deployment](#-deployment)
- [📝 License](#-license)

## ✨ Features

- 🎮 **Gamification System** - Earn badges and climb leaderboards
- 🗺️ **Interactive Map** - Locate and track nearby recycling bins
- 📷 **AI-Powered Recognition** - Classify recyclables using AI
- 👥 **User Dashboard** - Track progress, rewards, and achievements
- 🏆 **Rewards Program** - Claim points and redeem badges
- 🤖 **Smart Bins** - IoT integration for bin management
- 🔐 **Secure Authentication** - User registration and login system
- 📊 **Analytics** - Track recycling impact and statistics (for managers)


## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm, yarn, pnpm, or bun

## 🔧 Configuration

### Environment Variables

Rename the `.env.example` file in the root directory:

```j
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Gemini AI
NEXT_PUBLIC_GEMINI_API_KEY=your_api_key

# Other configs
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Installation

1. Clone the repository:
    ```bash
    git clone https://github.com/GeorgievIliyan/Recyclix.git
    cd Recyclix
    ```

2. Install dependencies:
    ```bash
    npm install
    # or
    yarn install
    # or
    pnpm install
    # or
    bun install
    ```

3. Set up environment variables:
    ```bash
    cp .env.example .env.local
    ```

4. Run the development server:
    ```bash
    npm run dev
    ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

---

## 🛠 Tech Stack

| Category | Technology |
|----------|-----------|
| **Framework** | [Next.js](https://nextjs.org) |
| **Language** | TypeScript |
| **Styling** | Tailwing CSS|
| **UI Components** | ShadCN |
| **AI/ML** | Google Gemini API |
| **Database** | Supabase |
| **Authentication** | Supbase auth |
| **Linting** | ESLint |
| **Commit Linting** | Commitlint |

---

## 📁 Project Structure

```BASH
Recyclix/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   ├── app/                      # Application pages
│   ├── auth/                     # Authentication pages
│   ├── bin/                      # Bin-related pages
│   └── admin/                    # Admin panel
├── components/                   # React components
│   ├── gamification-ui/          # Gamification features
│   ├── map-ui/                   # Map components
│   ├── homepage/                 # Homepage sections
│   ├── ui/                       # Reusable UI components
│   └── other/                    # Misc components
├── hooks/                        # Custom React hooks
├── lib/                          # Utility functions & helpers
├── public/                       # Static assets
└── config files                  # tsconfig, eslint, etc.
```


## 📚 Learn More

- 📖 [Next.js Documentation](https://nextjs.org/docs) - Learn about Next.js features and API
- 🎓 [Learn Next.js](https://nextjs.org/learn) - Interactive Next.js tutorial
- 🗂️ [App Router Documentation](https://nextjs.org/docs/app)
- 🎨 [Geist Font](https://vercel.com/font) - Modern font by Vercel for optimized typography

## 📝 License

This project is licensed under the GNU=GPL 3 License - see the [LICENSE](LICENSE) file for details.

---
  
<div align="center">

Made with love ♻️ by the Recyclix founder

[Star us on GitHub](#) • [Report an Issue](#) • [Request a Feature](#)

</div>
