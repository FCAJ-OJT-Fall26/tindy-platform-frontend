import { useEffect, useState, useCallback } from "react"
import { useSearchParams } from "react-router"
import { RefreshCw } from "lucide-react"
import type { DiscoveryMode } from "../../types/discovery"
import DiscoverySegmentedControl from "../../components/discovery/DiscoverySegmentedControl"
import LiveDiscoveryView from "./LiveDiscoveryView"
import LiveTeammatesDiscoveryView from "./LiveTeammatesDiscoveryView"
import "./live-discovery.css"

interface SwipeDiscoveryViewProps {
  initialMode?: DiscoveryMode
  onNavigateToMessages?: (recipientName?: string) => void
  onNotify?: (message: string) => void
}

export default function SwipeDiscoveryView(props: SwipeDiscoveryViewProps) {
  const [params, setParams] = useSearchParams()
  const mode = params.get("mode")
  const isTeammates =
    ["teammates", "candidates", "leader"].includes(mode ?? "") ||
    (!mode && props.initialMode === "leader")

  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [isSpinning, setIsSpinning] = useState(false)

  useEffect(() => {
    if (params.has("demo")) {
      const next = new URLSearchParams(params)
      next.delete("demo")
      setParams(next, { replace: true })
    }
  }, [params, setParams])

  const handleModeChange = useCallback(
    (val: string) => {
      const next = new URLSearchParams(params)
      if (val === "teammates" || val === "leader") {
        next.set("mode", "teammates")
      } else {
        next.delete("mode")
      }
      setParams(next)
    },
    [params, setParams],
  )

  const handleRefresh = useCallback(() => {
    setIsSpinning(true)
    setRefreshTrigger((v) => v + 1)
    setTimeout(() => setIsSpinning(false), 700)
  }, [])

  return (
    <div className="live-discovery">
      <header className="live-discovery__header">
        <div className="live-discovery__header-text">
          <span className="live-discovery__pill">INTERACTIVE MATCHING STACK</span>
          <h1
            className="live-discovery__title-transition"
            key={isTeammates ? "teammates-h1" : "projects-h1"}
          >
            {isTeammates
              ? "Discover Teammates That Fit Your Team"
              : "Discover Projects That Fit You"}
          </h1>
          <p
            className="live-discovery__desc-transition"
            key={isTeammates ? "teammates-p" : "projects-p"}
          >
            {isTeammates
              ? "Review eligible members for a position you lead. Skip, shortlist, or send an invitation."
              : "Discover your next team. Skip, save, or explore a position before you apply."}
          </p>
        </div>
        <div className="live-discovery__header-actions">
          <DiscoverySegmentedControl
            value={isTeammates ? "teammates" : "projects"}
            options={[
              { value: "projects", label: "Find Projects" },
              { value: "teammates", label: "Find Teammates" },
            ]}
            ariaLabel="Discovery Mode Switcher"
            onChange={handleModeChange}
          />
          <button
            className="live-discovery__refresh"
            onClick={handleRefresh}
            aria-label="Refresh discovery feed"
          >
            <RefreshCw
              size={14}
              className={isSpinning ? "spin-animate" : ""}
            />
            Refresh
          </button>
        </div>
      </header>

      <div
        className="discovery-mode-view-transition"
        key={isTeammates ? "mode-view-teammates" : "mode-view-projects"}
      >
        {isTeammates ? (
          <LiveTeammatesDiscoveryView
            hideHeader
            refreshTrigger={refreshTrigger}
          />
        ) : (
          <LiveDiscoveryView
            hideHeader
            refreshTrigger={refreshTrigger}
          />
        )}
      </div>
    </div>
  )
}
