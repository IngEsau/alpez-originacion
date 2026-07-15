import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  define: mode === "test"
    ? {
        "import.meta.env.VITE_USE_REAL_API": JSON.stringify("false"),
        "import.meta.env.VITE_API_FALLBACK_TO_MOCK": JSON.stringify("true"),
      }
    : undefined,
}));
