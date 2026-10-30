import { useEffect, useState } from "react"

export type DeadlineMode = "7" | "14" | "30" | "custom"

export function vietnamDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now)
  const part = (type: string) => parts.find(value => value.type === type)!.value
  return `${part("year")}-${part("month")}-${part("day")}`
}

export function addCalendarDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10)
}

export function validFutureDate(date: string, today = vietnamDate()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date <= today || date >= "9999-12-31") return false
  try { return addCalendarDays(date, 0) === date } catch { return false }
}

export function formatClosingDate(date?: string): string {
  if (!date) return "Unavailable"
  const [year, month, day] = date.split("-").map(Number)
  return new Intl.DateTimeFormat("en", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, day)))
}

export function useVietnamToday(): string {
  const [today, setToday] = useState(vietnamDate)
  useEffect(() => {
    const id = window.setInterval(() => setToday(vietnamDate()), 30_000)
    const refresh = () => setToday(vietnamDate())
    window.addEventListener("focus", refresh)
    return () => { clearInterval(id); window.removeEventListener("focus", refresh) }
  }, [])
  return today
}
