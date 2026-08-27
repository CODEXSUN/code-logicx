import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { resolve } from "node:path";

const mobileDir = import.meta.dirname;
const repositoryDir = resolve(mobileDir, "../../..");

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, repositoryDir, "");
  const apiUrl = requiredMobileApiUrl(env.VITE_MOBILE_API_URL);

  return {
    build: {
      chunkSizeWarningLimit: 1_600,
      emptyOutDir: true,
      outDir: "../../../dist/mobile/web",
      reportCompressedSize: false
    },
    cacheDir: "../../../node_modules/.vite/codelogicx-mobile",
    envDir: repositoryDir,
    publicDir: "../../platform/web/public",
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? "development"),
      "import.meta.env.VITE_MOBILE_API_URL": JSON.stringify(apiUrl)
    },
    plugins: [react()]
  };
});

function requiredMobileApiUrl(value: string | undefined) {
  if (!value?.trim()) throw new Error("VITE_MOBILE_API_URL is required for the mobile app.");
  const url = new URL(value.trim());
  if (url.protocol !== "https:" && !isLocalDevelopmentUrl(url)) {
    throw new Error("VITE_MOBILE_API_URL must use HTTPS outside local development.");
  }
  return url.toString().replace(/\/$/u, "");
}

function isLocalDevelopmentUrl(url: URL) {
  return url.hostname === "127.0.0.1" || url.hostname === "10.0.2.2" || url.hostname === "localhost";
}
