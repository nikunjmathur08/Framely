<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1bntnBBLLy6oMbcvlKMnWqimO3mfvaJnm

## 🔒 Security Notice

This application uses a **backend proxy server** to securely handle TMDB API requests. The API key is never exposed to the client-side code, protecting it from unauthorized access via browser developer tools.

## Run Locally

**Prerequisites:** Node.js (v16 or higher)

### 1. Install dependencies
```bash
npm install
```

### 2. Configure Backend API Key
Create a `.env` file in the `server` directory:
```bash
cd server
cp .env.example .env
```

Edit `server/.env` and add your TMDB API key:
```
TMDB_API_KEY=your_tmdb_api_key_here
PORT=3001
```

### 3. Run the Application
You can run both the frontend and backend together:
```bash
npm run dev:all
```

Or run them separately:
```bash
# Terminal 1 - Backend server (port 3001)
npm run dev:server

# Terminal 2 - Frontend server (port 5173)
npm run dev
```

### 4. Access the App
Open your browser and navigate to: `http://localhost:5173`

## 📡 Architecture

This application uses a **server-side proxy architecture** to handle all TMDB API requests:

- **Frontend (Vite + React)**: Runs on `http://localhost:5173`
- **Backend (Express)**: Runs on `http://localhost:3001`
  - ✅ Proxies all TMDB API requests
  - ✅ Keeps API key secure server-side  
  - ✅ **ISP Blocking Protection**: Automatic mock data fallback
  - ✅ Network optimization (IPv4-only, connection pooling)
  - ✅ Aggregated data fetching for better performance

### Why Server-Side?

1. **Security**: TMDB API key never exposed in browser
2. **ISP Blocking**: If ISPs block TMDB, backend serves mock data
3. **Performance**: Single aggregated request instead of 40+ separate calls
4. **Reliability**: Centralized error handling and retry logic

For detailed architecture documentation, see [`architecture.md`](file:///.gemini/antigravity/brain/9c626a2b-10f6-4333-baa3-51ff34804523/architecture.md)
  
## 🛠️ Troubleshooting

### API requests failing
- Ensure the backend server is running (`npm run dev:server`)
- Check that `server/.env` contains a valid TMDB API key
- Verify the backend is accessible at `http://localhost:3001/api/health`

### Port already in use
If ports 5173 or 3001 are already in use, you can change them:
- Frontend: Edit `vite.config.ts` (server.port)
- Backend: Edit `server/.env` (PORT variable)

### CORS errors
The backend is configured to allow CORS from all origins during development. If you encounter CORS issues, ensure both servers are running.
