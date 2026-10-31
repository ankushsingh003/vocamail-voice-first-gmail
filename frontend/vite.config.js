/**
 * vite.config.js — Frontend Build & Development Server Configuration
 * ===================================================================
 * Think of this file like the traffic director for our React development server.
 * 
 * When developing locally, React runs on http://localhost:5173, while our Python
 * Flask backend runs on http://127.0.0.1:5000.
 * 
 * Instead of dealing with messy cross-origin (CORS) errors or broken cookies,
 * Vite's proxy automatically routes any backend calls (like /api, /login, /logout)
 * directly to Flask behind the scenes.
 */

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Enable the React Fast Refresh plugin so edits appear instantly without reloading
  plugins: [react()],

  server: {
    port: 5173,
    // Automatically forward backend routes to the Python Flask server
    proxy: {
      // Forward all API endpoints (/api/inbox, /api/session, /api/voice)
      "/api": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
      },
      // Forward Google login kickoff
      "/login": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
      },
      // Forward logout endpoint
      "/logout": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
      },
      // Forward Google OAuth redirect callback
      "/oauth": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
      },
    },
  },
});
