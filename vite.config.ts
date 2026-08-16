import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// When deployed to GitHub Pages at https://<user>.github.io/<repo>/
// the base path must match the repo name. Set REPO_NAME to your repo,
// or leave as "/" if you deploy to a custom domain or user/org page
// (i.e. a repo named <user>.github.io).
const REPO_NAME = "investment-tracker";

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === "build" ? `/${REPO_NAME}/` : "/",
}));
