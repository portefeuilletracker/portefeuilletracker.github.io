import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// This repo (portefeuilletracker.github.io) is a user/org GitHub Pages
// site, served from the domain root — not a project subfolder. So the
// base path is always "/". If you ever move this app into a regular
// project repo (served at https://<user>.github.io/<repo>/), change
// this back to `/${REPO_NAME}/` for production builds.
export default defineConfig({
  plugins: [react()],
  base: "/",
});
