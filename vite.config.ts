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
    // IMPORTANT: Force the app to use env-driven backend config,
    // while keeping the auto-generated client file untouched.
    alias: [
      // Override the generated client import to use Lovable Cloud env vars
      {
        find: "@/integrations/supabase/client",
        replacement: path.resolve(__dirname, "./src/integrations/supabase/client.cloud.ts"),
      },
      {
        find: "@",
        replacement: path.resolve(__dirname, "./src"),
      },
    ],
  },
}));

