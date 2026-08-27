import type { CapacitorConfig } from "@capacitor/cli";

const apiUrl = requiredMobileApiUrl(process.env.VITE_MOBILE_API_URL);
const localApiUrl = apiUrl.protocol === "http:";

const config: CapacitorConfig = {
  appId: "com.codexsun.codelogicx",
  appName: "CodeLogicX",
  webDir: "../../../dist/mobile/web",
  backgroundColor: "#09090b",
  plugins: {
    CapacitorHttp: { enabled: true },
    SplashScreen: {
      backgroundColor: "#09090bff",
      launchAutoHide: true,
      showSpinner: false
    },
    StatusBar: { backgroundColor: "#09090b", style: "LIGHT" }
  },
  ...(localApiUrl ? { server: { androidScheme: "http", cleartext: true } } : {})
};

export default config;

function requiredMobileApiUrl(value: string | undefined) {
  if (!value?.trim()) throw new Error("VITE_MOBILE_API_URL is required for the mobile app.");
  const url = new URL(value.trim());
  const localHost = ["10.0.2.2", "127.0.0.1", "localhost"].includes(url.hostname);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && localHost)) {
    throw new Error("VITE_MOBILE_API_URL must use HTTPS outside local development.");
  }
  return url;
}
