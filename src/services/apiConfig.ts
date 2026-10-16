// Use the same backend origin for JSON requests and top-level OAuth navigation.
// An explicitly empty value supports an HTTPS same-origin deployment (and tests).
export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ??
  (import.meta.env.DEV ? "https://localhost:7190" : "")
)
  .trim()
  .replace(/\/+$/, "")

if (API_BASE_URL) {
  const url = new URL(API_BASE_URL)
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
  if (
    !(
      url.protocol === "https:" ||
      (import.meta.env.DEV && loopback && url.protocol === "http:")
    ) ||
    url.origin !== API_BASE_URL ||
    url.username ||
    url.password
  ) {
    throw new Error(
      "Configure VITE_API_BASE_URL as an HTTPS backend origin (HTTP loopback is allowed only in development).",
    )
  }
}

export function apiUrl(endpoint: string): string {
  return `${API_BASE_URL}${
    endpoint.startsWith("/") ? endpoint : `/${endpoint}`
  }`
}

export function apiOrigin(): string {
  return new URL(API_BASE_URL || window.location.origin).origin
}
