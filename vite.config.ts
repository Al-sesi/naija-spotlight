import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()].filter(Boolean),
  resolve: {
    // IMPORTANT: Force the app to use env-driven backend config (Vercel/prod URL),
    // while keeping the auto-generated client file untouched.
    alias: [
      {
        find: "@/integrations/supabase/client",
        replacement: path.resolve(__dirname, "./src/integrations/supabase/client-runtime.ts"),
      },
      {
        find: "@",
        replacement: path.resolve(__dirname, "./src"),
      },
    ],
  },
}));

