# Framely

<div align="center">
  <img src="/public/framely_logo.png" alt="Framely Logo" width="200" />
  <p>A modern, responsive Netflix clone built with React, TypeScript, and Tailwind CSS.</p>
</div>

## 🚀 Features

- **Browse & Discovery**: Explore a vast library of movies and TV shows powered by TMDB.
- **Search**: Instantly find your favorite content.
- **My List**: Save movies and shows to your personal watch list.
- **Responsive Design**: Seamless experience across mobile, tablet, and desktop devices.
- **Modern UI**: Smooth animations and transitions using Framer Motion.

## 🛠️ Tech Stack

**Frontend:**
- React 19
- TypeScript
- Tailwind CSS
- Framer Motion
- Zustand (State Management)
- Vite

**Backend:**
- Node.js
- Express
- Proxy Server (Secure TMDB API handling)

## 🏁 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm

### Installation

1. **Clone the repository** (if you haven't already)
2. **Install dependencies**:
   ```bash
   npm install
   ```

### Configuration

1. **Backend Environment**:
   Create a `.env` file in the `server` directory:
   ```bash
   cd server
   cp .env.example .env
   ```
   Edit `server/.env` and add your TMDB API Key:
   ```env
   TMDB_API_KEY=your_api_key_here
   PORT=3001
   ```

### Running the App

Run both the frontend and backend concurrently:

```bash
npm run dev:all
```

- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3001

## 📂 Project Structure

- `/components` - Reusable UI components
- `/pages` - Application route pages
- `/server` - Backend proxy server
- `/store` - Global state management
- `/services` - API integration
- `/hooks` - Custom React hooks

## 🔒 Security

This application uses a **backend proxy server** to securely handle TMDB API requests. The API key is never exposed to the client-side code.

---

Built with ❤️ by Nikunj Mathur
