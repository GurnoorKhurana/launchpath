// Pins vitest to this package — without it, vitest climbs to a stray
// vite.config.ts in the user's Documents folder and crashes.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { environment: "node" },
});
