import { useCallback, useEffect, useRef, useState } from "react"
import useRemoteResource from "./useRemoteResource"
import { getAttachments } from "../services/profileMedia.service"

export default function useCertificateAttachments(
  scope: string,
  certificateId: string,
  userId: string | undefined,
  quotaChanged: () => void,
  revision = 0,
) {
  const load = useCallback(
    (signal: AbortSignal) => getAttachments(certificateId, userId, signal),
    [certificateId, userId, revision],
  )
  const resource = useRemoteResource(scope, load)
  const [visible, setVisible] = useState(!document.hidden)
  const [expired, setExpired] = useState(false)
  const started = useRef<number | null>(null)
  const previousStatuses = useRef(new Map<string, string>())
  const processing =
    resource.data?.some((item) => item.status === "processing") ?? false
  useEffect(() => {
    const changed = () => setVisible(!document.hidden)
    document.addEventListener("visibilitychange", changed)
    return () => document.removeEventListener("visibilitychange", changed)
  }, [])
  useEffect(() => {
    if (resource.data && !resource.error) {
      const next = new Map(
        resource.data.map((item) => [item.attachment_id, item.status]),
      )
      if (
        [...previousStatuses.current].some(
          ([id, status]) =>
            status === "processing" && next.get(id) !== "processing",
        )
      )
        quotaChanged()
      previousStatuses.current = next
    }
    if (!processing) {
      started.current = null
      setExpired(false)
    }
  }, [processing, resource.data, resource.error, quotaChanged])
  useEffect(() => {
    if (!processing || expired || resource.error) return
    started.current ??= Date.now()
    const remaining = 120_000 - (Date.now() - started.current)
    if (remaining <= 0) {
      setExpired(true)
      return
    }
    if (!visible || resource.loading) return
    // Schedule the next request only after the previous GET has settled.
    const timer = window.setTimeout(
      () => {
        if (Date.now() - started.current! >= 120_000) setExpired(true)
        else resource.reload()
      },
      Math.min(5_000, remaining),
    )
    return () => window.clearTimeout(timer)
  }, [
    processing,
    expired,
    visible,
    resource.loading,
    resource.error,
    resource.data,
    resource.reload,
  ])
  const checkAgain = () => {
    started.current = Date.now()
    setExpired(false)
    resource.reload()
    quotaChanged()
  }
  return { ...resource, processing, expired, checkAgain }
}
