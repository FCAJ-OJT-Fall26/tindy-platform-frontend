import { useEffect, useId, useRef, useState } from "react"
import { Link, useNavigate } from "react-router"
import { Search, X, ArrowUpRight } from "lucide-react"
import { Avatar } from "../ui"
import { searchMembers, type MemberSearchResponse } from "../../services/members.service"
import "./member-search.css"

export default function MemberSearch() {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [retry, setRetry] = useState(0)
  const [state, setState] = useState<{ query: string; data: MemberSearchResponse | null; error: boolean; loading: boolean }>({ query: "", data: null, error: false, loading: false })
  const root = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const resultsId = useId()
  const navigate = useNavigate()
  const text = query.trim()
  const eligible = open && text.length >= 2
  const current = state.query === text
  const data = current && eligible ? state.data : null
  const loading = eligible && (!current || state.loading)
  const failed = eligible && current && state.error

  useEffect(() => {
    if (!eligible) return
    const controller = new AbortController()
    setState({ query: text, data: null, error: false, loading: true })
    const timer = window.setTimeout(() => {
      searchMembers(text, controller.signal).then(data => {
        if (!controller.signal.aborted) setState({ query: text, data, error: false, loading: false })
      }).catch(() => {
        if (!controller.signal.aborted) setState({ query: text, data: null, error: true, loading: false })
      })
    }, 300)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [text, eligible, retry])

  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("pointerdown", outside)
    return () => document.removeEventListener("pointerdown", outside)
  }, [open])

  return <div className="member-search" ref={root} onKeyDown={event => {
    if (event.key === "Escape") { input.current?.focus(); setOpen(false) }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      const links = Array.from(root.current?.querySelectorAll<HTMLAnchorElement>(".member-search-result") ?? [])
      if (!links.length) return
      event.preventDefault()
      const index = links.indexOf(document.activeElement as HTMLAnchorElement)
      if (event.key === "ArrowDown") links[(index + 1) % links.length]?.focus()
      else if (index <= 0) input.current?.focus()
      else links[index - 1]?.focus()
    }
  }} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false)
  }}>
    <form className="member-search-form" role="search" aria-label="Member search" onSubmit={event => {
      event.preventDefault()
      if (data?.items.length && !loading && !failed) navigate("/users/" + data.items[0].user_id)
      else setOpen(true)
    }}>
      <Search size={17} aria-hidden="true" />
      <input ref={input} type="search" aria-label="Search members" placeholder="Search members…" maxLength={100}
        value={query} aria-controls={open ? resultsId : undefined} aria-expanded={open}
        autoComplete="off" onClick={() => setOpen(true)} onFocus={() => setOpen(true)} onChange={event => { setQuery(event.target.value); setOpen(true) }} />
      {query && <button type="button" aria-label="Clear member search" onClick={() => { setQuery(""); input.current?.focus() }}><X size={15} /></button>}
    </form>
    {open && <div className="member-search-results" id={resultsId} aria-label="Member search results">
      <div className="member-search-caption">Find a member</div>
      {!eligible && <p role="status">Enter at least 2 characters of a name or username.</p>}
      {loading && <p role="status">Searching members…</p>}
      {failed && <p role="alert">Could not search members. <button type="button" onClick={() => setRetry(value => value + 1)}>Retry</button></p>}
      {!loading && !failed && data && <>
        {!data.items.length && <p role="status">No members found. Try another name or username.</p>}
        <ul>{data.items.map(member => <li key={member.user_id}>
          <Link className="member-search-result" to={"/users/" + member.user_id}>
            <Avatar name={member.display_name} color="neutral" />
            <span><strong>{member.display_name}</strong>
              {member.username && <small>@{member.username}</small>}
              {(member.headline || member.university) && <small>{member.headline || member.university}</small>}
            </span><ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        </li>)}</ul>
        {data.has_more && <p>More matches available. Keep typing to narrow your search.</p>}
      </>}
    </div>}
  </div>
}
