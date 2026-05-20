import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/server/**/*.test.ts"],
    globals: false,
    setupFiles: ["dotenv/config"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
