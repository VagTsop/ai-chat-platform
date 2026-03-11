# AI Chat Platform

Full-stack AI chat platform with multiple AI personas, real-time streaming responses, conversation management, markdown rendering, and admin analytics.

## Live Demo

**Frontend:** https://ai-chat-platform-alpha.vercel.app
**Backend:** Hosted on Railway

### Demo Accounts
- `alex@demo.com` / `password123`
- `sarah@demo.com` / `password123`

## Tech Stack

- **Frontend:** React, TypeScript, Tailwind CSS, Vite
- **Backend:** Node.js, Express, TypeScript, SQLite (better-sqlite3)
- **Auth:** JWT with Bearer tokens
- **Streaming:** Server-Sent Events (SSE)

## Features

- Multiple AI personas with distinct personalities
- Real-time streaming responses via SSE
- Conversation management (create, rename, delete)
- Markdown rendering with syntax highlighting
- Admin analytics dashboard
- Dark/Light mode
- Responsive design
- JWT authentication

## Project Structure

```
packages/
├── backend/          # Express API server
│   └── src/
│       ├── db/       # SQLite connection & schema
│       ├── middleware/# Auth middleware
│       ├── routes/   # API routes
│       └── index.ts  # Server entry point
└── frontend/         # React + Vite app
    └── src/
        ├── api/      # API client
        ├── components/# UI components
        ├── pages/    # Page components
        └── stores/   # Zustand state management
```

## Getting Started

```bash
# Install dependencies
npm install
cd packages/backend && npm install
cd ../frontend && npm install

# Start development (from root)
npm run dev
```

Backend runs on `http://localhost:3002`, frontend on `http://localhost:5173`.

## Deployment

- **Frontend:** Vercel (static build)
- **Backend:** Railway (Node.js)
