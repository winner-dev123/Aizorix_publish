import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/server/**/*.test.ts"],
    globals: false,
    setupFiles: ["dotenv/config"],
    // Integration tests share a real Postgres under Serializable isolation;
    // running them in parallel triggers SSI write-conflicts. Single-file
    // sequencing makes the suite deterministic.
    fileParallelism: false,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
