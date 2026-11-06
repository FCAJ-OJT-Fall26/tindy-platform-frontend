export function projectGithubError(value?: string | null): string | null {
  if (!value?.trim()) return null
  const text = value.trim()
  try {
    const url = new URL(text)
    if (text.length <= 1000 && !/[\s\\]/.test(text) && url.protocol === "https:" &&
      url.hostname.toLowerCase() === "github.com" && !url.port && !url.username && !url.password &&
      !url.search && !url.hash && /^\/[A-Za-z0-9_.-]+(\/[A-Za-z0-9_.-]+)?\/?$/.test(url.pathname)) return null
  } catch {}
  return "Enter an HTTPS github.com repository or organization link (up to 1000 characters)."
}

export function safeProjectGithubUrl(value?: string | null): string | null {
  return value?.trim() && !projectGithubError(value) ? value.trim() : null
}
