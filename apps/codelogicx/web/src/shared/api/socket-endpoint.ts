export function socketEndpoint() {
  const apiUrl = import.meta.env.VITE_PLATFORM_API_URL.replace(/\/+$/u, "");
  return new URL(apiUrl || "/", window.location.origin).origin;
}
