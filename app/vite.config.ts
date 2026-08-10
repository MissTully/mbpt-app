import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // content/ and cases/ live outside the app root; they are the versioned
  // data the application consumes (ARC-MBPT-001 section 4.8).
  server: {
    fs: { allow: [".."] },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
