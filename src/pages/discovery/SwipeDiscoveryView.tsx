import { useEffect } from "react"
import { useSearchParams } from "react-router"
import type { DiscoveryMode } from "../../types/discovery"
import LiveDiscoveryView from "./LiveDiscoveryView"
import LiveTeammatesDiscoveryView from "./LiveTeammatesDiscoveryView"

interface SwipeDiscoveryViewProps {
  initialMode?: DiscoveryMode
  onNavigateToMessages?: (recipientName?: string) => void
  onNotify?: (message: string) => void
}

export default function SwipeDiscoveryView(props: SwipeDiscoveryViewProps) {
  const [params, setParams] = useSearchParams()
  const mode = params.get("mode")
  const teammates = ["teammates", "candidates", "leader"].includes(mode ?? "") || (!mode && props.initialMode === "leader")
  useEffect(() => {
    if (params.has("demo")) {
      const next = new URLSearchParams(params)
      next.delete("demo")
      setParams(next, { replace: true })
    }
  }, [params, setParams])
  return teammates ? <LiveTeammatesDiscoveryView /> : <LiveDiscoveryView />
}
