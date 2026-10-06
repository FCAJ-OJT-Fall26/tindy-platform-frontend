// import { useState, type ReactNode } from "react"
// import {
//   Link,
//   useLocation,
//   useNavigate,
//   useParams,
//   useSearchParams,
// } from "react-router"
// import {
//   ArrowDown,
//   ArrowLeft,
//   ArrowRight,
//   ArrowUpRight,
//   Bell,
//   Bookmark,
//   Check,
//   CheckCheck,
//   ChevronDown,
//   Clock,
//   Code2,
//   ExternalLink,
//   FileText,
//   FolderKanban,
//   GraduationCap,
//   Info,
//   Layers,
//   LogOut,
//   Mail,
//   MessageSquare,
//   MoreHorizontal,
//   Paperclip,
//   Plus,
//   Search,
//   Send,
//   Settings,
//   ShieldCheck,
//   SlidersHorizontal,
//   Sparkles,
//   Target,
//   TriangleAlert,
//   Upload,
//   Users,
//   X,
// } from "lucide-react"
// import {
//   Avatar,
//   Badge,
//   Brand,
//   Button,
//   Chips,
//   EmptyState,
//   MatchExplanation,
//   Modal,
//   PageHeader,
//   ProjectCard,
//   Score,
//   Skeleton,
// } from "./components/ui"
// import {
//   factors,
//   initialCandidates,
//   initialProfile,
//   initialProjects,
//   score,
//   type Profile,
//   type Project,
// } from "./data"
// import { useTindy } from "./store"

// function useExplanation(
//   evidence?: Pick<Profile, "skills" | "role" | "hours" | "experience">,
// ) {
//   const [project, setProject] = useState<Project | null>(null)
//   const [learning, setLearning] = useState(false)
//   return {
//     open: setProject,
//     element: project && (
//       <Modal
//         drawer
//         title={learning ? "Learning suggestions" : "Match explanation"}
//         onClose={() => {
//           setProject(null)
//           setLearning(false)
//         }}
//       >
//         {learning ? (
//           <>
//             <div className="insight-label">
//               <GraduationCap size={16} /> NEXT STEPS
//             </div>
//             <h2>A little learning goes a long way.</h2>
//             <p className="muted">
//               Build on the skills you already have. These are suggestions, not
//               prerequisites to applying.
//             </p>
//             {project.gap.map((skill) => (
//               <div className="learning-card" key={skill}>
//                 <span className="icon-tile amber">
//                   <Code2 size={19} />
//                 </span>
//                 <div>
//                   <h3>{skill}</h3>
//                   <p>
//                     Start with the fundamentals, then try a small feature in a
//                     practice project.
//                   </p>
//                   <a
//                     className="text-link"
//                     href={`https://www.google.com/search?q=${encodeURIComponent(skill + " official documentation tutorial")}`}
//                     target="_blank"
//                     rel="noreferrer"
//                   >
//                     Find learning resources <ExternalLink size={13} />
//                   </a>
//                 </div>
//               </div>
//             ))}
//             <Button variant="secondary" onClick={() => setLearning(false)}>
//               Back to match analysis
//             </Button>
//           </>
//         ) : (
//           <>
//             <MatchExplanation
//               // project={project}
//               evidence={evidence}
//               full
//               onLearn={() => setLearning(true)}
//             />
//             <Link
//               className="btn btn-primary full"
//               to={`/project/${project.id}`}
//               onClick={() => setProject(null)}
//             >
//               View project <ArrowRight size={16} />
//             </Link>
//           </>
//         )}
//       </Modal>
//     ),
//   }
// }
// function Cards({ projects, status }: {
//   projects: Project[]
//   status?: string
// }) {
//   const { saved, toggleSave } = useTindy()
//   const explanation = useExplanation()
//   return (
//     <>
//       <div className="project-grid">
//         {projects.map((project) => (
//           <ProjectCard
//             key={project.id}
//             project={project}
//             saved={saved.includes(project.id)}
//             onSave={() => toggleSave(project.id)}
//             onExplain={() => explanation.open(project)}
//             status={status}
//           />
//         ))}
//       </div>
//       {explanation.element}
//     </>
//   )
// }
// function SectionHeading({
//   title,
//   description,
//   action,
// }: {
//   title: string
//   description?: string
//   action?: ReactNode
// }) {
//   return (
//     <div className="section-heading">
//       <div>
//         <h2>{title}</h2>
//         {description && <p>{description}</p>}
//       </div>
//       {action}
//     </div>
//   )
// }
// function Stat({
//   label,
//   value,
//   detail,
//   icon,
//   tone = "indigo",
// }: {
//   label: string
//   value: ReactNode
//   detail: string
//   icon: ReactNode
//   tone?: string
// }) {
//   return (
//     <article className="stat-card">
//       <div className="stat-card-top">
//         <span>{label}</span>
//         <span className={`stat-icon ${tone}`}>{icon}</span>
//       </div>
//       <strong className="stat-value">{value}</strong>
//       <small>{detail}</small>
//     </article>
//   )
// }

// export function Dashboard() {
//   const { profile, projects, saved, active, mode, skipped } = useTindy()
//   const [tab, setTab] = useState("For you")
//   if (mode === "Project Leader") return <LeaderDashboard />
//   const available = projects
//     .filter((project) => !skipped.includes(project.id))
//     .sort((first, second) =>
//       tab === "New arrivals"
//         ? second.created - first.created
//         : score(second) - score(first),
//     )
//   return (
//     <>
//       <PageHeader
//         eyebrow="YOUR FCAJ WORKSPACE"
//         title={`Good morning, ${profile.name.split(" ")[0]}`}
//         description="Here are projects that match your skills and interests."
//         action={
//           <Link className="btn btn-secondary" to="/discover">
//             Explore projects <ArrowUpRight size={16} />
//           </Link>
//         }
//       />
//       <section className="stats-grid">
//         <Stat
//           label="Recommended projects"
//           value={available.length}
//           detail="Based on your skills & interests"
//           icon={<Sparkles size={19} />}
//         />
//         <Stat
//           label="Saved projects"
//           value={saved.length.toString().padStart(2, "0")}
//           detail="Good ideas to come back to"
//           icon={<Bookmark size={19} />}
//           tone="teal"
//         />
//         <Stat
//           label="Active projects"
//           value={active.length.toString().padStart(2, "0")}
//           detail="You’re building something great"
//           icon={<FolderKanban size={19} />}
//           tone="sky"
//         />
//         <Stat
//           label="Profile strength"
//           value={
//             <>
//               85<span>%</span>
//             </>
//           }
//           detail="Add a certificate to stand out"
//           icon={<ShieldCheck size={19} />}
//           tone="green"
//         />
//       </section>
//       <div className="opportunity-banner">
//         <div className="banner-icon">
//           <Layers size={24} />
//         </div>
//         <div>
//           <Badge tone="blue">
//             <Sparkles size={11} />
//             SMARTER CONNECTIONS
//           </Badge>
//           <h2>Your next great project starts with the right fit.</h2>
//           <p>Discover where your skills matter — and who you can build with.</p>
//         </div>
//         <Link to="/discover">
//           Find my next project <ArrowRight size={17} />
//         </Link>
//       </div>
//       <div className="dashboard-columns">
//         <section>
//           <SectionHeading
//             title="Recommended for you"
//             description="Real opportunities. Matched to what you bring."
//             action={
//               <Link className="text-link" to="/discover">
//                 View all projects <ArrowUpRight size={14} />
//               </Link>
//             }
//           />
//           <div className="recommend-toolbar">
//             <div className="tabs">
//               {["For you", "New arrivals"].map((item) => (
//                 <button
//                   className={tab === item ? "active" : ""}
//                   onClick={() => setTab(item)}
//                   key={item}
//                 >
//                   {item === "For you" && <Sparkles size={13} />} {item}
//                 </button>
//               ))}
//             </div>
//             <span className="subtle-caption">
//               <ShieldCheck size={12} />
//               Explainable matches
//             </span>
//           </div>
//           {available.length ? (
//             <Cards projects={available.slice(0, 4)} />
//           ) : (
//             <EmptyState
//               title="No projects match your profile yet."
//               description="Add your skills and interests to discover more possibilities."
//               action={
//                 <Link to="/profile" className="btn btn-primary">
//                   Improve my profile
//                 </Link>
//               }
//             />
//           )}
//         </section>
//         <aside className="context-column">
//           <section className="profile-strength panel">
//             <div className="section-heading">
//               <h3>Your profile, your potential</h3>
//               <span className="icon-tile small teal">
//                 <UserIcon />
//               </span>
//             </div>
//             <p>A little more detail makes better matches.</p>
//             <div className="strength-number">
//               <strong>
//                 85<span>%</span>
//               </strong>
//               <Badge tone="success">Looking good</Badge>
//             </div>
//             <div className="progress">
//               <span style={{ width: "85%" }} />
//             </div>
//             <ul className="profile-checklist">
//               <li>
//                 <Check size={14} />
//                 Basic information
//               </li>
//               <li>
//                 <Check size={14} />
//                 Skills & preferred roles
//               </li>
//               <li>
//                 <Check size={14} />
//                 Project experience
//               </li>
//               <li className="pending">
//                 <Plus size={14} />
//                 Add a certificate
//               </li>
//             </ul>
//             <Link className="btn btn-secondary full" to="/profile">
//               Complete my profile <ArrowRight size={14} />
//             </Link>
//           </section>
//           <section className="panel next-steps">
//             <h3>Your next steps</h3>
//             <Link
//               className="next-step"
//               to="/messages?conversation=Minh%20Nguyen"
//             >
//               <Avatar name="Minh Nguyen" color="teal" />
//               <div>
//                 <strong>A conversation worth having</strong>
//                 <p>Minh invited you to chat about CloudDesk.</p>
//                 <span>
//                   View conversation <ArrowUpRight size={12} />
//                 </span>
//               </div>
//             </Link>
//             <Link className="next-step" to="/projects?tab=Invited">
//               <span className="icon-tile amber">
//                 <Mail size={18} />
//               </span>
//               <div>
//                 <strong>You have a team invitation</strong>
//                 <p>AI Customer Support System is ready for you.</p>
//                 <span>
//                   Review invitation <ArrowUpRight size={12} />
//                 </span>
//               </div>
//             </Link>
//           </section>
//           <div className="community-footnote">
//             <span className="fcaj-symbol">
//               F<span>↗</span>
//             </span>
//             <div>
//               <strong>Built for the FCAJ community</strong>
//               <p>Learn by building. Grow together.</p>
//             </div>
//           </div>
//         </aside>
//       </div>
//     </>
//   )
// }
// function UserIcon() {
//   return <GraduationCap size={17} />
// }

// export function Discover() {
//   const { projects, skipped } = useTindy()
//   const [query, setQuery] = useState("")
//   const [sort, setSort] = useState("Best Match")
//   const [view, setView] = useState("grid")
//   const [filters, setFilters] = useState<Record<string, string>>({})
//   const [showAll, setShowAll] = useState(false)
//   const controls = [
//     {
//       name: "Role",
//       options: [
//         "Backend Developer",
//         "Frontend Developer",
//         "Full-stack Developer",
//         "AI Engineer",
//         "Cloud Engineer",
//       ],
//     },
//     {
//       name: "Technology",
//       options: [...new Set(projects.flatMap((project) => project.skills))],
//     },
//     {
//       name: "Project Type",
//       options: [
//         "AI & Machine Learning",
//         "Cloud & DevOps",
//         "Web Application",
//         "Open Source",
//         "Social Impact",
//       ],
//     },
//     {
//       name: "Availability",
//       options: ["Up to 8 hrs/week", "Up to 10 hrs/week", "12+ hrs/week"],
//     },
//     { name: "Duration", options: ["1 month", "2 months", "3 months"] },
//     { name: "Difficulty", options: ["Beginner-friendly", "Intermediate"] },
//     {
//       name: "Match Score",
//       options: ["90% and above", "80% and above", "70% and above"],
//     },
//   ]
//   const filtered = projects
//     .filter(
//       (project) =>
//         !skipped.includes(project.id) &&
//         `${project.name} ${project.description} ${project.skills.join(" ")} ${project.role}`
//           .toLowerCase()
//           .includes(query.toLowerCase()) &&
//         (!filters.Role || project.role === filters.Role) &&
//         (!filters.Technology || project.skills.includes(filters.Technology)) &&
//         (!filters["Project Type"] ||
//           project.type === filters["Project Type"]) &&
//         (!filters.Availability ||
//           (filters.Availability === "Up to 8 hrs/week"
//             ? project.hours <= 8
//             : filters.Availability === "Up to 10 hrs/week"
//               ? project.hours <= 10
//               : project.hours >= 12)) &&
//         (!filters.Duration || project.duration === filters.Duration) &&
//         (!filters.Difficulty || project.difficulty === filters.Difficulty) &&
//         (!filters["Match Score"] ||
//           score(project) >= parseInt(filters["Match Score"])),
//     )
//     .sort((first, second) =>
//       sort === "Newest"
//         ? second.created - first.created
//         : sort === "Closing Soon"
//           ? first.closing - second.closing
//           : score(second) - score(first),
//     )
//   const count = Object.values(filters).filter(Boolean).length
//   return (
//     <>
//       <PageHeader
//         eyebrow="FIND YOUR NEXT CHAPTER"
//         title="Discover projects"
//         description="Find projects that match your skills, interests, and goals."
//         action={
//           <Link className="btn btn-secondary" to="/profile">
//             <Settings size={15} />
//             Matching preferences
//           </Link>
//         }
//       />
//       <div className="discovery-search">
//         <Search size={21} />
//         <input
//           aria-label="Search projects"
//           value={query}
//           onChange={(event) => setQuery(event.target.value)}
//           placeholder="Search projects, skills, technologies…"
//         />
//         <kbd>Search</kbd>
//       </div>
//       <div className="discovery-filters">
//         <div className="filters-row">
//           {controls.slice(0, showAll ? 7 : 4).map((control) => (
//             <label
//               className={`filter-select ${
//                 filters[control.name] ? "has-value" : ""
//               }`}
//               key={control.name}
//             >
//               <select
//                 aria-label={control.name}
//                 value={filters[control.name] || ""}
//                 onChange={(event) =>
//                   setFilters({ ...filters, [control.name]: event.target.value })
//                 }
//               >
//                 <option value="">{control.name}</option>
//                 {control.options.map((option) => (
//                   <option key={option}>{option}</option>
//                 ))}
//               </select>
//             </label>
//           ))}
//           <Button variant="secondary" onClick={() => setShowAll(!showAll)}>
//             <SlidersHorizontal size={14} />
//             {showAll ? "Fewer filters" : "All filters"}
//             {count > 0 && <Badge>{count}</Badge>}
//           </Button>
//           {count > 0 && (
//             <button className="text-link" onClick={() => setFilters({})}>
//               Clear filters <X size={12} />
//             </button>
//           )}
//         </div>
//       </div>
//       <div className="discovery-insight">
//         <Sparkles size={15} />
//         <span>
//           Matched to <strong>your profile</strong>, not just your keywords.
//         </span>
//         <Link to="/profile">
//           Improve your recommendations <ArrowRight size={13} />
//         </Link>
//       </div>
//       <div className="results-toolbar">
//         <div>
//           <strong>{filtered.length} projects</strong>
//           <span> to build something meaningful</span>
//         </div>
//         <div className="results-options">
//           <label>
//             Sort by{" "}
//             <select
//               value={sort}
//               onChange={(event) => setSort(event.target.value)}
//             >
//               <option>Best Match</option>
//               <option>Newest</option>
//               <option>Most Relevant</option>
//               <option>Closing Soon</option>
//             </select>
//           </label>
//           <div className="view-toggle">
//             <button
//               aria-label="Grid view"
//               className={view === "grid" ? "active" : ""}
//               onClick={() => setView("grid")}
//             >
//               <Layers size={16} />
//             </button>
//             <button
//               aria-label="List view"
//               className={view === "list" ? "active" : ""}
//               onClick={() => setView("list")}
//             >
//               <MenuLines />
//             </button>
//           </div>
//         </div>
//       </div>
//       <div className={`discovery-projects ${view}`}>
//         {filtered.length ? (
//           <Cards projects={filtered} />
//         ) : (
//           <EmptyState
//             title="No projects found"
//             description="Try another keyword or clear your filters. Your next project might be one click away."
//             action={
//               <Button
//                 onClick={() => {
//                   setQuery("")
//                   setFilters({})
//                 }}
//               >
//                 Reset search
//               </Button>
//             }
//           />
//         )}
//       </div>
//       <div className="discovery-bottom">
//         <ShieldCheck size={15} />
//         <span>
//           Every match has a reason. Explore the explanation before you decide.
//         </span>
//       </div>
//     </>
//   )
// }
// function MenuLines() {
//   return <SlidersHorizontal size={16} />
// }

// export function ProjectDetail() {
//   const { id } = useParams()
//   const {
//     projects,
//     saved,
//     toggleSave,
//     interested,
//     setInterested,
//     setSkipped,
//     notify,
//     active,
//   } = useTindy()
//   const project = projects.find((item) => item.id === id)
//   const explanation = useExplanation()
//   const [interestModal, setInterestModal] = useState(false)
//   if (!project) return <NotFound />
//   const sent = interested.includes(project.id)
//   return (
//     <>
//       <Link className="back-link" to="/discover">
//         <ArrowLeft size={14} />
//         Back to projects
//       </Link>
//       <div className="project-detail-header">
//         <div>
//           <div className="project-detail-brand">
//             <span className={`project-mark big ${project.color}`}>
//               {project.initials}
//             </span>
//             <Badge tone="success">
//               <span className="online-dot" />
//               Recruiting
//             </Badge>
//             <span className="muted">{project.type}</span>
//           </div>
//           <h1>{project.name}</h1>
//           <p>{project.description}</p>
//           <div className="leader-line">
//             <Avatar name={project.leader} color={project.color} />
//             <span>
//               Led by <strong>{project.leader}</strong>
//             </span>
//             <b>·</b>
//             <Users size={14} />
//             {project.team} / {project.capacity} members
//           </div>
//         </div>
//         <div className="detail-header-actions">
//           <Button disabled={sent} onClick={() => setInterestModal(true)}>
//             {sent ? (
//               <>
//                 <Check size={16} />
//                 Interest sent
//               </>
//             ) : (
//               <>
//                 Interested <ArrowRight size={16} />
//               </>
//             )}
//           </Button>
//           <Button variant="secondary" onClick={() => toggleSave(project.id)}>
//             <Bookmark
//               size={16}
//               fill={saved.includes(project.id) ? "currentColor" : "none"}
//             />
//             {saved.includes(project.id) ? "Saved" : "Save"}
//           </Button>
//           <button
//             className="text-link neutral"
//             onClick={() => {
//               setSkipped((old) => [...old, project.id])
//               notify("Project skipped — removed from recommendations")
//               window.history.back()
//             }}
//           >
//             Skip for now
//           </button>
//           {sent && <small>Waiting for project leader</small>}
//         </div>
//       </div>
//       <div className="detail-layout">
//         <div className="detail-main">
//           <section className="panel">
//             <h2>About the project</h2>
//             <p>
//               {project.description} We’re a team of FCAJ students turning a
//               shared idea into a real, deployable product. You’ll work closely
//               with other developers, contribute to technical decisions, and
//               build something you’re proud to put in your portfolio.
//             </p>
//             <h3>Project goals</h3>
//             <ul className="goal-list">
//               {project.goals.map((goal) => (
//                 <li key={goal}>
//                   <span>
//                     <Check size={13} />
//                   </span>
//                   {goal}
//                 </li>
//               ))}
//             </ul>
//             <h3>Technology stack</h3>
//             <Chips items={project.skills} />
//           </section>
//           <section className="panel">
//             <SectionHeading
//               title="Open positions"
//               action={<Badge>{project.capacity - project.team} openings</Badge>}
//             />
//             {[
//               project.role,
//               project.role === "Frontend Developer"
//                 ? "Backend Developer"
//                 : "Frontend Developer",
//             ].map((role, index) => (
//               <div className="position-card" key={role}>
//                 <div className="section-heading">
//                   <h3>{role}</h3>
//                   <Badge tone="blue">1 position</Badge>
//                 </div>
//                 <p>
//                   Help build our next release with an ambitious, supportive
//                   team.
//                 </p>
//                 <Chips
//                   items={
//                     index
//                       ? ["React", "TypeScript", "Git"]
//                       : project.requiredSkills || project.skills.slice(0, 3)
//                   }
//                 />
//                 <div className="position-meta">
//                   <span>
//                     <Clock size={13} />
//                     {project.hours} hrs/week
//                   </span>
//                   <span>{project.difficulty}</span>
//                 </div>
//                 <small>
//                   Nice to have: {project.gap.join(", ")} · Collaborative
//                   development
//                 </small>
//               </div>
//             ))}
//           </section>
//           <section className="panel">
//             <SectionHeading
//               title="Current team"
//               action={
//                 <span className="muted">
//                   {project.team}/{project.capacity} members
//                 </span>
//               }
//             />
//             {[project.leader, "An Hoang", "Linh Tran"]
//               .slice(0, project.team)
//               .map((name, index) => (
//                 <div className="team-person" key={name}>
//                   <Avatar
//                     name={name}
//                     color={index ? "neutral" : project.color}
//                   />
//                   <div>
//                     <strong>{name}</strong>
//                     <p>
//                       {index === 0
//                         ? "Project leader · Backend"
//                         : index === 1
//                           ? "AI Engineer · Python, RAG"
//                           : "Frontend Developer · React"}
//                     </p>
//                   </div>
//                   <Badge tone={index === 0 ? "blue" : ""}>
//                     {index === 0 ? "LEADER" : "MEMBER"}
//                   </Badge>
//                 </div>
//               ))}
//           </section>
//         </div>
//         <aside>
//           <section className="panel detail-match">
//             <div className="insight-label">
//               <Sparkles size={14} /> AI RECOMMENDED
//             </div>
//             <Score project={project} />
//             <div className="quick-matches">
//               <p>
//                 <Check size={14} />
//                 Your technical skills align
//               </p>
//               <p>
//                 <Check size={14} />
//                 Relevant project experience
//               </p>
//               <p>
//                 <Clock size={14} />
//                 {project.hours <= 10
//                   ? "Fits your weekly availability"
//                   : "May need extra weekly availability"}
//               </p>
//             </div>
//             <Button
//               variant="secondary"
//               className="full"
//               onClick={() => explanation.open(project)}
//             >
//               Why this matches you <ArrowRight size={14} />
//             </Button>
//             <small className="evidence-caption">
//               Weighted factors. Transparent reasoning.
//             </small>
//           </section>
//           <section className="panel commitment-panel">
//             <h3>At a glance</h3>
//             <div>
//               <Clock size={17} />
//               <span>
//                 Commitment<strong>{project.hours} hours / week</strong>
//               </span>
//             </div>
//             <div>
//               <FolderKanban size={17} />
//               <span>
//                 Duration<strong>{project.duration}</strong>
//               </span>
//             </div>
//             <div>
//               <GraduationCap size={17} />
//               <span>
//                 Experience<strong>{project.difficulty}</strong>
//               </span>
//             </div>
//             <div>
//               <Users size={17} />
//               <span>
//                 Community<strong>First Cloud AI Journey</strong>
//               </span>
//             </div>
//             <p>Recruitment closes in {project.closing} days</p>
//           </section>
//           {active.includes(project.id) && (
//             <Link className="btn btn-primary full" to="/team">
//               Open team workspace
//             </Link>
//           )}
//         </aside>
//       </div>
//       {explanation.element}
//       {interestModal && (
//         <Modal title="Project interest" onClose={() => setInterestModal(false)}>
//           <span className="icon-tile teal">
//             <FolderKanban size={23} />
//           </span>
//           <h2>Interested in this project?</h2>
//           <p>
//             The project leader will be able to review your profile, skills, and
//             availability. Your interest starts a conversation — it’s not a
//             commitment.
//           </p>
//           <div className="interest-preview">
//             <Avatar name={project.leader} color={project.color} />
//             <div>
//               <strong>{project.name}</strong>
//               <small>{project.leader} · Project leader</small>
//             </div>
//           </div>
//           <div className="modal-actions">
//             <Button variant="secondary" onClick={() => setInterestModal(false)}>
//               Cancel
//             </Button>
//             <Button
//               onClick={() => {
//                 setInterested((old) => [...new Set([...old, project.id])])
//                 setInterestModal(false)
//                 notify("Interest sent · Waiting for project leader")
//               }}
//             >
//               Send interest <ArrowRight size={16} />
//             </Button>
//           </div>
//         </Modal>
//       )}
//     </>
//   )
// }

// export function MyProjects() {
//   const {
//     projects,
//     interested,
//     saved,
//     invited,
//     active,
//     completed,
//     setInvited,
//     setActive,
//     notify,
//   } = useTindy()
//   const location = useLocation()
//   const [params, setParams] = useSearchParams()
//   const tab =
//     params.get("tab") ||
//     (location.pathname === "/saved"
//       ? "Saved"
//       : location.pathname === "/interests"
//         ? "Interested"
//         : "Active")
//   const [invitation, setInvitation] = useState<Project | null>(null)
//   const statuses: Record<string, string[]> = {
//     Interested: interested,
//     Saved: saved,
//     Invited: invited,
//     Active: active,
//     Completed: completed,
//   }
//   const selected = projects.filter((project) =>
//     statuses[tab]?.includes(project.id),
//   )
//   return (
//     <>
//       <PageHeader
//         title={
//           location.pathname === "/interests" ? "My interests" : "My projects"
//         }
//         description="From the first spark of interest to the projects you ship."
//         action={
//           <Link to="/discover" className="btn btn-secondary">
//             Discover projects <ArrowUpRight size={15} />
//           </Link>
//         }
//       />
//       <div className="status-tabs">
//         {Object.entries(statuses).map(([status, ids]) => (
//           <button
//             key={status}
//             onClick={() => setParams({ tab: status })}
//             className={tab === status ? "active" : ""}
//           >
//             {status}
//             <span>{ids.length}</span>
//           </button>
//         ))}
//       </div>
//       {selected.length ? (
//         <>
//           {tab === "Invited" && (
//             <div className="info-banner">
//               <Mail size={18} />
//               <span>
//                 A team is ready to welcome you. Review the invitation to see the
//                 role and commitment.
//               </span>
//             </div>
//           )}
//           <Cards
//             projects={selected}
//             status={
//               tab === "Interested"
//                 ? "Interest sent · Waiting for project leader"
//                 : tab === "Active"
//                   ? "You’re on the team"
//                   : tab === "Completed"
//                     ? "Project completed"
//                     : undefined
//             }
//           />
//           {tab === "Invited" &&
//             selected.map((project) => (
//               <div className="invitation-bar" key={project.id}>
//                 <span>
//                   <strong>{project.leader}</strong> invited you to{" "}
//                   <strong>{project.name}</strong>
//                 </span>
//                 <Button onClick={() => setInvitation(project)}>
//                   Review invitation
//                 </Button>
//               </div>
//             ))}
//         </>
//       ) : (
//         <EmptyState
//           title={
//             tab === "Saved"
//               ? "You haven't saved any projects yet."
//               : tab === "Interested"
//                 ? "Your next project is out there."
//                 : `No ${tab.toLowerCase()} projects yet.`
//           }
//           description={
//             tab === "Saved"
//               ? "Save a project that catches your eye. You can always come back to it."
//               : "Discover projects that fit your skills and take the next step."
//           }
//           action={
//             <Link to="/discover" className="btn btn-primary">
//               Discover projects <ArrowRight size={15} />
//             </Link>
//           }
//         />
//       )}{" "}
//       {invitation && (
//         <Modal title="Team invitation" onClose={() => setInvitation(null)}>
//           <Badge tone="success">YOU’RE INVITED</Badge>
//           <h2>Build with {invitation.name}</h2>
//           <p>
//             {invitation.leader} invited you to join as a {invitation.role}.
//           </p>
//           <div className="invitation-terms">
//             <span>
//               <Clock size={16} />
//               {invitation.hours} hours/week
//             </span>
//             <span>
//               <FolderKanban size={16} />
//               {invitation.duration}
//             </span>
//             <span>
//               <Users size={16} />
//               {invitation.team} current teammates
//             </span>
//           </div>
//           <div className="modal-actions">
//             <Button
//               variant="secondary"
//               onClick={() => {
//                 setInvited((old) =>
//                   old.filter((item) => item !== invitation.id),
//                 )
//                 setInvitation(null)
//                 notify("Invitation declined")
//               }}
//             >
//               Decline
//             </Button>
//             <Button
//               onClick={() => {
//                 setActive((old) => [...new Set([...old, invitation.id])])
//                 setInvited((old) =>
//                   old.filter((item) => item !== invitation.id),
//                 )
//                 setInvitation(null)
//                 notify("Welcome to the team!")
//                 setParams({ tab: "Active" })
//               }}
//             >
//               Accept & join team <Check size={15} />
//             </Button>
//           </div>
//         </Modal>
//       )}
//     </>
//   )
// }

// export function ProfileScreen() {
//   const { profile, setProfile, notify } = useTindy()
//   const [edit, setEdit] = useState(false)
//   const [draft, setDraft] = useState(profile)
//   const [file, setFile] = useState("AWS Cloud Practitioner.pdf")
//   const [photo, setPhoto] = useState("")
//   const [experience, setExperience] = useState(false)
//   const [skill, setSkill] = useState("")
//   const field = (
//     label: string,
//     key: keyof Omit<Profile, "skills">,
//     multiline = false,
//   ) => (
//     <label className="field">
//       {label}
//       {multiline ? (
//         <textarea
//           rows={3}
//           value={draft[key]}
//           onChange={(event) =>
//             setDraft({ ...draft, [key]: event.target.value })
//           }
//         />
//       ) : (
//         <input
//           value={draft[key]}
//           onChange={(event) =>
//             setDraft({ ...draft, [key]: event.target.value })
//           }
//         />
//       )}
//     </label>
//   )
//   return (
//     <>
//       <PageHeader
//         title="Your professional profile"
//         description="Your skills, your story, and what you want to build next."
//         action={
//           <div className="header-buttons">
//             <Button
//               variant="secondary"
//               onClick={() => {
//                 setEdit(false)
//                 notify("Profile preview is showing")
//               }}
//             >
//               <ExternalLink size={15} />
//               Preview profile
//             </Button>
//             <Button
//               onClick={() => {
//                 setDraft(profile)
//                 setEdit(!edit)
//               }}
//             >
//               {edit ? "Cancel editing" : "Edit profile"}
//               <Settings size={15} />
//             </Button>
//           </div>
//         }
//       />
//       <div className="profile-cover">
//         <div className="cover-line" />
//         <span>FCAJ / BUILT TO BUILD</span>
//       </div>
//       <div className="profile-identity">
//         <div className="profile-avatar-wrap">
//           {photo ? (
//             <img className="profile-photo" src={photo} alt="Your profile" />
//           ) : (
//             <Avatar name={profile.name} size="xl" color="neutral" />
//           )}
//           {edit && (
//             <label className="photo-upload">
//               <Upload size={13} />
//               <input
//                 hidden
//                 type="file"
//                 accept="image/*"
//                 onChange={(event) => {
//                   const uploaded = event.target.files?.[0]
//                   if (uploaded) {
//                     const reader = new FileReader()
//                     reader.onload = () => setPhoto(String(reader.result))
//                     reader.readAsDataURL(uploaded)
//                   }
//                 }}
//               />
//             </label>
//           )}
//         </div>
//         <div>
//           <h2>
//             {profile.name}
//             <Badge tone="blue">
//               <ShieldCheck size={12} />
//               FCAJ MEMBER
//             </Badge>
//           </h2>
//           <p>
//             <GraduationCap size={15} />
//             {profile.university}
//             <b>·</b>
//             {profile.role}
//           </p>
//           <div className="profile-links">
//             <a
//               href={`https://${profile.github.replace(/^https?:\/\//, "")}`}
//               target="_blank"
//               rel="noreferrer"
//             >
//               <Code2 size={14} />
//               GitHub <ArrowUpRight size={12} />
//             </a>
//             <a
//               href={`https://${profile.portfolio.replace(/^https?:\/\//, "")}`}
//               target="_blank"
//               rel="noreferrer"
//             >
//               <ExternalLink size={14} />
//               Portfolio
//             </a>
//           </div>
//         </div>
//         <div className="availability-badge">
//           <span className="online-dot" />
//           Open to projects<small>{profile.hours} hours/week</small>
//         </div>
//       </div>
//       {edit ? (
//         <form
//           className="panel profile-edit"
//           onSubmit={(event) => {
//             event.preventDefault()
//             setProfile(draft)
//             setEdit(false)
//             notify("Profile updated · Ready for better matches")
//           }}
//         >
//           <h2>Make it yours</h2>
//           <div className="form-grid">
//             {field("Full name", "name")}
//             {field("University / community", "university")}
//             {field("Preferred role", "role")}
//             {field("Weekly availability (hours)", "hours")}
//             {field("GitHub URL", "github")}
//             {field("Portfolio URL", "portfolio")}
//           </div>
//           {field("Profile summary", "summary", true)}
//           {field("Professional interests", "interests")}
//           {field("Project experience", "experience", true)}
//           {field("Learning goals", "goals", true)}
//           {field("Technologies I want to learn", "technologies")}
//           <h3>Technical skills</h3>
//           <div className="editable-chips">
//             {draft.skills.map((item) => (
//               <span key={item}>
//                 {item}
//                 <button
//                   type="button"
//                   aria-label={`Remove ${item}`}
//                   onClick={() =>
//                     setDraft({
//                       ...draft,
//                       skills: draft.skills.filter((value) => value !== item),
//                     })
//                   }
//                 >
//                   <X size={12} />
//                 </button>
//               </span>
//             ))}
//           </div>
//           <div className="inline-input">
//             <input
//               placeholder="Add a skill"
//               value={skill}
//               onChange={(event) => setSkill(event.target.value)}
//             />
//             <Button
//               type="button"
//               variant="secondary"
//               onClick={() => {
//                 if (skill.trim()) {
//                   setDraft({
//                     ...draft,
//                     skills: [...new Set([...draft.skills, skill.trim()])],
//                   })
//                   setSkill("")
//                 }
//               }}
//             >
//               Add
//             </Button>
//           </div>
//           <Button>
//             Save profile <Check size={16} />
//           </Button>
//         </form>
//       ) : (
//         <div className="profile-layout">
//           <div>
//             <section className="panel">
//               <SectionHeading
//                 title="About"
//                 action={
//                   <Badge tone="blue">
//                     <Sparkles size={12} />
//                     AI ASSISTED
//                   </Badge>
//                 }
//               />
//               <p>{profile.summary}</p>
//               <h3>Technical skills</h3>
//               <Chips items={profile.skills} />
//               <h3>Professional interests</h3>
//               <Chips
//                 items={profile.interests.split(",").map((item) => item.trim())}
//               />
//             </section>
//             <section className="panel">
//               <SectionHeading
//                 title="Previous projects"
//                 action={
//                   <button
//                     className="text-link"
//                     onClick={() => setExperience(true)}
//                   >
//                     <Plus size={14} />
//                     Add experience
//                   </button>
//                 }
//               />
//               <div className="experience-card">
//                 <span className="project-mark indigo">RC</span>
//                 <div>
//                   <h3>RAG Knowledge Chatbot</h3>
//                   <p>{profile.experience}</p>
//                   <Chips items={[".NET", "RAG", "AWS", "PostgreSQL"]} />
//                 </div>
//               </div>
//               <div className="experience-card">
//                 <span className="project-mark teal">TM</span>
//                 <div>
//                   <h3>Ticket Management System</h3>
//                   <p>
//                     Designed a REST API, role-based access, and a responsive
//                     issue tracking interface.
//                   </p>
//                   <Chips items={["React", ".NET", "REST API"]} />
//                 </div>
//               </div>
//             </section>
//             <section className="panel">
//               <SectionHeading title="Learning goals" />
//               <p>{profile.goals}</p>
//               <h3>Technologies I want to learn</h3>
//               <Chips
//                 items={profile.technologies
//                   .split(",")
//                   .map((item) => item.trim())}
//               />
//             </section>
//           </div>
//           <aside>
//             <section className="panel">
//               <h3>At a glance</h3>
//               <dl className="profile-facts">
//                 <dt>Preferred role</dt>
//                 <dd>{profile.role}</dd>
//                 <dt>Weekly availability</dt>
//                 <dd>{profile.hours} hours / week</dd>
//                 <dt>Project interests</dt>
//                 <dd>AI applications · Cloud · Open source</dd>
//                 <dt>Community</dt>
//                 <dd>First Cloud AI Journey</dd>
//               </dl>
//               <Link className="btn btn-secondary full" to="/ai">
//                 <Sparkles size={14} />
//                 Build with AI
//               </Link>
//             </section>
//             <section className="panel">
//               <h3>Certificates & evidence</h3>
//               <div className="certificate">
//                 <ShieldCheck size={22} />
//                 <div>
//                   <strong>{file}</strong>
//                   <small>Uploaded evidence</small>
//                 </div>
//               </div>
//               <label className="file-drop">
//                 <Upload size={21} />
//                 <strong>Upload certificate or CV</strong>
//                 <small>PDF, PNG, JPG</small>
//                 <input
//                   type="file"
//                   accept=".pdf,.png,.jpg,.jpeg"
//                   onChange={(event) => {
//                     const uploaded = event.target.files?.[0]
//                     if (uploaded) {
//                       setFile(uploaded.name)
//                       notify(
//                         "Evidence selected · Prototype stores filename only",
//                       )
//                     }
//                   }}
//                 />
//               </label>
//             </section>
//           </aside>
//         </div>
//       )}
//       {experience && (
//         <Modal
//           title="Add project experience"
//           onClose={() => setExperience(false)}
//         >
//           <h2>Show what you’ve built</h2>
//           <form
//             onSubmit={(event) => {
//               event.preventDefault()
//               const data = new FormData(event.currentTarget)
//               setProfile({
//                 ...profile,
//                 experience: profile.experience + " " + data.get("description"),
//               })
//               setExperience(false)
//               notify("Project experience added to profile")
//             }}
//           >
//             {["Project name", "Your role", "Project URL"].map((label) => (
//               <label className="field" key={label}>
//                 {label}
//                 <input required />
//               </label>
//             ))}
//             <label className="field">
//               What did you build?
//               <textarea name="description" required rows={4} />
//             </label>
//             <Button>Add project experience</Button>
//           </form>
//         </Modal>
//       )}
//     </>
//   )
// }

// export function AIStudio() {
//   const { profile, setProfile, notify } = useTindy()
//   const [tab, setTab] = useState("Profile builder")
//   const [skills, setSkills] = useState(profile.skills.join(", "))
//   const [projects, setProjects] = useState(profile.experience)
//   const [interests, setInterests] = useState(profile.interests)
//   const [experience, setExperience] = useState(
//     "Student developer · FCAJ community",
//   )
//   const [summary, setSummary] = useState("")
//   const [source, setSource] = useState("Project description")
//   const [raw, setRaw] = useState("")
//   const [file, setFile] = useState("")
//   const [detected, setDetected] = useState(false)
//   const [selected, setSelected] = useState<string[]>([])
//   const detectedSkills = [
//     { category: "Backend", items: ["ASP.NET Core", "REST API", "JWT"] },
//     { category: "Database", items: ["PostgreSQL", "Redis"] },
//     { category: "Cloud", items: ["AWS S3"] },
//   ]
//   const generate = () => {
//     setSummary(
//       `${profile.role} with practical experience in ${skills.split(",").slice(0, 4).join(",").trim()}. ${projects.trim()} Interested in ${interests.toLowerCase()} and ready to contribute to a collaborative FCAJ project. ${experience.trim()}.`,
//     )
//     notify("Demo summary generated · Review and edit before accepting")
//   }
//   return (
//     <>
//       <PageHeader
//         eyebrow="THOUGHTFUL AI. HUMAN DECISIONS."
//         title="Build your profile with AI"
//         description="A starting point for your story — always reviewed and confirmed by you."
//       />
//       <div className="status-tabs">
//         {["Profile builder", "Skill extraction"].map((item) => (
//           <button
//             key={item}
//             className={tab === item ? "active" : ""}
//             onClick={() => setTab(item)}
//           >
//             {item === "Profile builder" ? (
//               <Sparkles size={15} />
//             ) : (
//               <FileText size={15} />
//             )}{" "}
//             {item}
//           </button>
//         ))}
//       </div>
//       {tab === "Profile builder" ? (
//         <div className="ai-layout">
//           <section className="panel">
//             <h2>Start with what you know</h2>
//             <p>No perfect sentences needed. A few details are enough.</p>
//             {[
//               {
//                 label: "Skills",
//                 value: skills,
//                 set: setSkills,
//                 placeholder: ".NET, AWS, React, PostgreSQL",
//               },
//               {
//                 label: "Projects",
//                 value: projects,
//                 set: setProjects,
//                 placeholder: "RAG chatbot, ticket management system",
//               },
//               {
//                 label: "Interests",
//                 value: interests,
//                 set: setInterests,
//                 placeholder: "Backend, cloud, AI",
//               },
//               {
//                 label: "Experience",
//                 value: experience,
//                 set: setExperience,
//                 placeholder: "What have you worked on?",
//               },
//             ].map((item) => (
//               <label className="field" key={item.label}>
//                 {item.label}
//                 <textarea
//                   rows={2}
//                   value={item.value}
//                   onChange={(event) => item.set(event.target.value)}
//                   placeholder={item.placeholder}
//                 />
//               </label>
//             ))}
//             <Button
//               onClick={generate}
//               disabled={!skills.trim() || !projects.trim()}
//             >
//               <Sparkles size={16} />
//               Generate profile
//             </Button>
//           </section>
//           <section className="panel generated-panel">
//             <Badge tone="blue">
//               <Sparkles size={12} />
//               AI GENERATED SUMMARY
//             </Badge>
//             {summary ? (
//               <>
//                 <h2>Your experience, well expressed.</h2>
//                 <label className="field">
//                   Review and edit
//                   <textarea
//                     rows={10}
//                     value={summary}
//                     onChange={(event) => setSummary(event.target.value)}
//                   />
//                 </label>
//                 <div className="header-buttons">
//                   <Button
//                     onClick={() => {
//                       setProfile({ ...profile, summary })
//                       notify("Summary accepted and added to your profile")
//                     }}
//                   >
//                     <Check size={15} />
//                     Accept summary
//                   </Button>
//                   <Button variant="secondary" onClick={generate}>
//                     Regenerate
//                   </Button>
//                 </div>
//                 <p className="helper-text">
//                   Nothing is published until you accept it.
//                 </p>
//               </>
//             ) : (
//               <EmptyState
//                 title="Your story takes shape here"
//                 description="Generate a first draft, then make it sound like you."
//               />
//             )}
//             <div className="trust-note">
//               <ShieldCheck size={16} />
//               <span>
//                 AI can help with the words. You’re always in control of the
//                 story. This prototype uses a local template, not a live model.
//               </span>
//             </div>
//           </section>
//         </div>
//       ) : (
//         <div className="ai-layout">
//           <section className="panel">
//             <h2>Let your work speak for you</h2>
//             <p>Extract skills from evidence you already have.</p>
//             <label className="field">
//               Evidence source
//               <select
//                 value={source}
//                 onChange={(event) => setSource(event.target.value)}
//               >
//                 {[
//                   "Project description",
//                   "GitHub README",
//                   "CV",
//                   "Certificate",
//                 ].map((item) => (
//                   <option key={item}>{item}</option>
//                 ))}
//               </select>
//             </label>
//             <label className="field">
//               {source === "GitHub README"
//                 ? "Paste your README"
//                 : "Paste your evidence"}
//               <textarea
//                 rows={9}
//                 value={raw}
//                 onChange={(event) => setRaw(event.target.value)}
//                 placeholder="Describe your project or paste the content of your document…"
//               />
//             </label>
//             <label className="file-drop">
//               <Upload size={21} />
//               <strong>{file || "Or select a document"}</strong>
//               <small>PDF, TXT, PNG, JPG</small>
//               <input
//                 type="file"
//                 onChange={(event) =>
//                   setFile(event.target.files?.[0]?.name || "")
//                 }
//               />
//             </label>
//             <Button
//               disabled={!raw.trim() && !file}
//               onClick={() => {
//                 setDetected(true)
//                 setSelected(detectedSkills.flatMap((group) => group.items))
//               }}
//             >
//               Extract skills <Sparkles size={15} />
//             </Button>
//           </section>
//           <section className="panel">
//             {detected ? (
//               <>
//                 <Badge tone="blue">DEMO DETECTION RESULTS</Badge>
//                 <h2>Skills detected</h2>
//                 <p>
//                   Review these illustrative results. Only confirmed skills are
//                   added.
//                 </p>
//                 {detectedSkills.map((group) => (
//                   <div className="detected-group" key={group.category}>
//                     <h3>{group.category}</h3>
//                     {group.items.map((item, index) => (
//                       <label className="detected-skill" key={item}>
//                         <input
//                           type="checkbox"
//                           checked={selected.includes(item)}
//                           onChange={(event) =>
//                             setSelected(
//                               event.target.checked
//                                 ? [...selected, item]
//                                 : selected.filter((skill) => skill !== item),
//                             )
//                           }
//                         />
//                         <span>
//                           <strong>{item}</strong>
//                           <small>{group.category}</small>
//                         </span>
//                         <Badge tone={index === 2 ? "warning" : "success"}>
//                           {index === 2 ? "Review" : "High confidence"}
//                         </Badge>
//                       </label>
//                     ))}
//                   </div>
//                 ))}
//                 <Button
//                   disabled={!selected.length}
//                   onClick={() => {
//                     setProfile({
//                       ...profile,
//                       skills: [...new Set([...profile.skills, ...selected])],
//                     })
//                     notify(
//                       `${selected.length} confirmed skills added to your profile`,
//                     )
//                     setDetected(false)
//                   }}
//                 >
//                   <Plus size={15} />
//                   Add selected skills ({selected.length})
//                 </Button>
//               </>
//             ) : (
//               <EmptyState
//                 title="Discover the skills in your work"
//                 description="Start with a README, a certificate, or a project description. You confirm what belongs on your profile."
//               />
//             )}
//           </section>
//         </div>
//       )}
//     </>
//   )
// }

// export function Auth() {
//   const location = useLocation()
//   const navigate = useNavigate()
//   const { setMode, setProfile, profile } = useTindy()
//   const register = location.pathname === "/register"
//   const [forgot, setForgot] = useState(false)
//   const [notice, setNotice] = useState("")
//   return (
//     <div className="auth-page">
//       <aside className="auth-story">
//         <Brand />
//         <div className="auth-story-copy">
//           <div className="eyebrow">FIRST CLOUD AI JOURNEY</div>
//           <h1>
//             Find the right project.
//             <br />
//             Build the right team.
//           </h1>
//           <p>
//             Your skills have a place. Discover meaningful projects and the
//             people to build them with.
//           </p>
//           <div className="auth-feature">
//             <span>
//               <Target size={20} />
//             </span>
//             <div>
//               <strong>Opportunities that fit you</strong>
//               <p>Matched to your skills, interests, and ambitions.</p>
//             </div>
//           </div>
//           <div className="auth-feature">
//             <span>
//               <ShieldCheck size={20} />
//             </span>
//             <div>
//               <strong>Understand every recommendation</strong>
//               <p>Clear explanations. Evidence-based connections.</p>
//             </div>
//           </div>
//           <div className="auth-feature">
//             <span>
//               <Users size={20} />
//             </span>
//             <div>
//               <strong>A community built to build</strong>
//               <p>Connect with students on the same journey.</p>
//             </div>
//           </div>
//         </div>
//         <div className="auth-community">
//           <div className="avatar-stack">
//             <Avatar name="Minh Nguyen" color="teal" />
//             <Avatar name="Linh Tran" color="rose" />
//             <Avatar name="An Hoang" color="amber" />
//           </div>
//           <span>Made for the FCAJ student community</span>
//         </div>
//       </aside>
//       <div className="auth-form-area">
//         <Link className="auth-back" to="/">
//           Explore the demo <ArrowUpRight size={14} />
//         </Link>
//         <section className="auth-form">
//           <Badge tone="blue">YOUR NEXT CHAPTER</Badge>
//           <h1>
//             {forgot
//               ? "Reset your password"
//               : register
//                 ? "Let’s build something great."
//                 : "Welcome back."}
//           </h1>
//           <p>
//             {forgot
//               ? "Enter your email to request a reset link."
//               : register
//                 ? "Join your community. Find your next project."
//                 : "Your next great project is waiting."}
//           </p>
//           <form
//             onSubmit={(event) => {
//               event.preventDefault()
//               if (forgot) {
//                 setNotice(
//                   "Demo only: no reset email has been sent. Authentication is not connected.",
//                 )
//                 return
//               }
//               const data = new FormData(event.currentTarget)
//               setMode(String(data.get("mode") || "Student"))
//               if (register) {
//                 setProfile({
//                   ...profile,
//                   name: String(data.get("name")),
//                   email: String(data.get("email")),
//                 })
//                 navigate("/onboarding")
//               } else
//                 navigate(
//                   data.get("mode") === "Project Leader" ? "/leader" : "/",
//                 )
//             }}
//           >
//             {register && (
//               <label className="field">
//                 Full name
//                 <input
//                   required
//                   name="name"
//                   placeholder="Your full name"
//                   autoComplete="name"
//                 />
//               </label>
//             )}
//             <label className="field">
//               Email address
//               <input
//                 required
//                 name="email"
//                 type="email"
//                 placeholder="you@university.edu"
//                 autoComplete="email"
//               />
//             </label>
//             {!forgot && (
//               <>
//                 <label className="field">
//                   Password
//                   <input
//                     required
//                     minLength={8}
//                     name="password"
//                     type="password"
//                     placeholder="At least 8 characters"
//                     autoComplete={
//                       register ? "new-password" : "current-password"
//                     }
//                   />
//                 </label>
//                 <label className="field">
//                   I’m joining as
//                   <select name="mode">
//                     <option>Student</option>
//                     <option>Project Leader</option>
//                   </select>
//                 </label>
//                 {!register && (
//                   <button
//                     type="button"
//                     className="text-link forgot-link"
//                     onClick={() => setForgot(true)}
//                   >
//                     Forgot password?
//                   </button>
//                 )}
//                 {register && (
//                   <label className="terms">
//                     <input required type="checkbox" />I agree to the community
//                     guidelines and respectful collaboration.
//                   </label>
//                 )}
//               </>
//             )}
//             <Button className="full">
//               {forgot
//                 ? "Request reset link"
//                 : register
//                   ? "Create account"
//                   : "Sign in"}
//               <ArrowRight size={16} />
//             </Button>
//           </form>
//           {notice && <div className="info-banner">{notice}</div>}
//           {forgot ? (
//             <button
//               className="text-link auth-switch"
//               onClick={() => {
//                 setForgot(false)
//                 setNotice("")
//               }}
//             >
//               Back to sign in
//             </button>
//           ) : (
//             <p className="auth-switch">
//               {register ? "Already have an account?" : "New to Tindy?"}{" "}
//               <Link to={register ? "/login" : "/register"}>
//                 {register ? "Sign in" : "Create an account"}
//               </Link>
//             </p>
//           )}
//           <div className="trust-note">
//             <Info size={14} />
//             <span>
//               Interactive prototype. Sign-in is simulated; no passwords are
//               stored. Amazon Cognito is not connected.
//             </span>
//           </div>
//         </section>
//       </div>
//     </div>
//   )
// }

// export function Onboarding() {
//   const { profile, setProfile } = useTindy()
//   const navigate = useNavigate()
//   const [step, setStep] = useState(0)
//   const [draft, setDraft] = useState(profile)
//   const [done, setDone] = useState(false)
//   const steps = [
//     "Basic information",
//     "Technical skills",
//     "Preferred roles",
//     "Interests",
//     "Availability",
//     "Projects & experience",
//     "GitHub / portfolio",
//     "AI profile summary",
//   ]
//   const update = (key: keyof Omit<Profile, "skills">, value: string) =>
//     setDraft({ ...draft, [key]: value })
//   const input = (
//     label: string,
//     key: keyof Omit<Profile, "skills">,
//     multiline = false,
//   ) => (
//     <label className="field">
//       {label}
//       {multiline ? (
//         <textarea
//           rows={5}
//           value={draft[key]}
//           onChange={(event) => update(key, event.target.value)}
//           required
//         />
//       ) : (
//         <input
//           value={draft[key]}
//           onChange={(event) => update(key, event.target.value)}
//           required
//         />
//       )}
//     </label>
//   )
//   return (
//     <div className="onboarding">
//       <header>
//         <Brand />
//         <span>YOUR FCAJ JOURNEY</span>
//         <Link className="text-link" to="/">
//           Save & finish later <ArrowUpRight size={13} />
//         </Link>
//       </header>
//       <div className="onboarding-layout">
//         <aside>
//           <div className="eyebrow">A STRONG START</div>
//           <h2>
//             A profile that opens
//             <br />
//             the right doors.
//           </h2>
//           <p>
//             Tell us a little about yourself. We’ll help you find where you fit.
//           </p>
//           <ol>
//             {steps.map((name, index) => (
//               <li
//                 className={
//                   index === step ? "active" : index < step ? "complete" : ""
//                 }
//                 key={name}
//               >
//                 <span>{index < step ? <Check size={14} /> : index + 1}</span>
//                 {name}
//               </li>
//             ))}
//           </ol>
//         </aside>
//         <section className="onboarding-panel">
//           {done ? (
//             <div className="onboarding-done">
//               <span className="done-check">
//                 <Check size={30} />
//               </span>
//               <h1>Your Tindy profile is ready.</h1>
//               <p>
//                 Find projects that match you. Meet the people you’ll build with.
//               </p>
//               <Chips items={draft.skills} />
//               <Button onClick={() => navigate("/discover")}>
//                 Discover projects <ArrowRight size={17} />
//               </Button>
//             </div>
//           ) : (
//             <>
//               <div className="step-caption">
//                 STEP {step + 1} OF 8{" "}
//                 <span>{Math.round(((step + 1) / 8) * 100)}%</span>
//               </div>
//               <div className="progress">
//                 <span style={{ width: `${((step + 1) / 8) * 100}%` }} />
//               </div>
//               <h1>{steps[step]}</h1>
//               <p className="muted">
//                 {
//                   [
//                     "Let’s start with the basics.",
//                     "What tools do you feel comfortable working with?",
//                     "What would you like to contribute to a team?",
//                     "What kind of work gets you curious?",
//                     "Find a project that fits your schedule.",
//                     "Your experience matters — including class and side projects.",
//                     "Give your work a place to shine.",
//                     "Review your story. Make it sound like you.",
//                   ][step]
//                 }
//               </p>
//               <form
//                 onSubmit={(event) => {
//                   event.preventDefault()
//                   setProfile(draft)
//                   if (step === 7) setDone(true)
//                   else {
//                     if (step === 6)
//                       setDraft({
//                         ...draft,
//                         summary: `${draft.role} studying at ${draft.university}, with skills in ${draft.skills.slice(0, 4).join(", ")}. ${draft.experience} Interested in ${draft.interests.toLowerCase()} and available ${draft.hours} hours per week.`,
//                       })
//                     setStep(step + 1)
//                   }
//                 }}
//               >
//                 <div className="onboarding-fields">
//                   {step === 0 && (
//                     <>
//                       {input("Full name", "name")}
//                       {input("University / community", "university")}
//                     </>
//                   )}
//                   {step === 1 && (
//                     <>
//                       <label className="field">
//                         Technical skills (comma separated)
//                         <textarea
//                           rows={3}
//                           required
//                           value={draft.skills.join(", ")}
//                           onChange={(event) =>
//                             setDraft({
//                               ...draft,
//                               skills: event.target.value
//                                 .split(",")
//                                 .map((item) => item.trim()),
//                             })
//                           }
//                         />
//                       </label>
//                       <Chips items={draft.skills.filter(Boolean)} />
//                     </>
//                   )}
//                   {step === 2 && (
//                     <div className="role-options">
//                       {[
//                         "Backend Developer",
//                         "Frontend Developer",
//                         "Full-stack Developer",
//                         "AI Engineer",
//                         "Cloud Engineer",
//                         "UI/UX Designer",
//                       ].map((role) => (
//                         <button
//                           type="button"
//                           key={role}
//                           className={draft.role === role ? "selected" : ""}
//                           onClick={() => update("role", role)}
//                         >
//                           <Code2 size={18} />
//                           {role}
//                           {draft.role === role && <Check size={16} />}
//                         </button>
//                       ))}
//                     </div>
//                   )}
//                   {step === 3 && (
//                     <>
//                       {input("Professional interests", "interests", true)}
//                       {input("Learning goals", "goals", true)}
//                     </>
//                   )}
//                   {step === 4 && (
//                     <>
//                       <label className="field">
//                         Hours available per week
//                         <input
//                           type="number"
//                           required
//                           min="1"
//                           max="40"
//                           value={draft.hours}
//                           onChange={(event) =>
//                             update("hours", event.target.value)
//                           }
//                         />
//                       </label>
//                       <div className="info-banner">
//                         <Clock size={18} />
//                         Be realistic. A sustainable schedule makes for a better
//                         team.
//                       </div>
//                     </>
//                   )}
//                   {step === 5 && (
//                     <>
//                       {input(
//                         "Previous projects & your contribution",
//                         "experience",
//                         true,
//                       )}
//                       {input("Technologies you want to learn", "technologies")}
//                     </>
//                   )}
//                   {step === 6 && (
//                     <>
//                       {input("GitHub profile", "github")}
//                       {input("Portfolio URL", "portfolio")}
//                     </>
//                   )}
//                   {step === 7 && (
//                     <>
//                       <Badge tone="blue">
//                         <Sparkles size={13} />
//                         AI ASSISTED DRAFT
//                       </Badge>
//                       {input("Your editable profile summary", "summary", true)}
//                       <label className="terms">
//                         <input required type="checkbox" />
//                         I’ve reviewed this summary and confirm it represents my
//                         experience.
//                       </label>
//                       <p className="helper-text">
//                         Generated from your inputs using a demo template.
//                       </p>
//                     </>
//                   )}
//                 </div>
//                 <div className="onboarding-actions">
//                   <Button
//                     variant="ghost"
//                     type="button"
//                     disabled={step === 0}
//                     onClick={() => setStep(step - 1)}
//                   >
//                     <ArrowLeft size={15} />
//                     Back
//                   </Button>
//                   <Button>
//                     {step === 7 ? "Confirm & finish" : "Continue"}
//                     <ArrowRight size={16} />
//                   </Button>
//                 </div>
//               </form>
//             </>
//           )}
//         </section>
//       </div>
//     </div>
//   )
// }

// export function LeaderDashboard() {
//   const { profile, projects, candidateInvites, dismissed } = useTindy()
//   const managed = projects.filter(
//     (project) => project.id === "cloud-desk" || project.leader === profile.name,
//   )
//   return (
//     <>
//       <PageHeader
//         eyebrow="PROJECT LEADER WORKSPACE"
//         title="Great teams start here."
//         description="Turn your next idea into a project. Find the people to bring it to life."
//         action={
//           <Link className="btn btn-primary" to="/create-project">
//             <Plus size={16} />
//             Create project
//           </Link>
//         }
//       />
//       <section className="stats-grid">
//         <Stat
//           label="Open positions"
//           value={managed.reduce(
//             (total, project) => total + project.capacity - project.team,
//             0,
//           )}
//           detail="Find the right people"
//           icon={<Code2 size={18} />}
//         />
//         <Stat
//           label="Interested candidates"
//           value={4 - dismissed.length}
//           detail="Ready to contribute"
//           icon={<Users size={18} />}
//           tone="teal"
//         />
//         <Stat
//           label="Pending invitations"
//           value={candidateInvites.length}
//           detail="Your team is taking shape"
//           icon={<Mail size={18} />}
//           tone="amber"
//         />
//         <Stat
//           label="Team members"
//           value={managed.reduce((total, project) => total + project.team, 0)}
//           detail="Building together"
//           icon={<FolderKanban size={18} />}
//           tone="sky"
//         />
//       </section>
//       <SectionHeading
//         title="Your projects"
//         description="A clear picture of what’s moving forward."
//       />
//       {managed.map((project) => (
//         <section className="leader-project panel" key={project.id}>
//           <div className="leader-project-top">
//             <span className={`project-mark ${project.color}`}>
//               {project.initials}
//             </span>
//             <div>
//               <Badge tone="success">RECRUITING</Badge>
//               <h2>{project.name}</h2>
//               <p>{project.description}</p>
//             </div>
//             <Link
//               className="icon-button"
//               to={`/project/${project.id}/edit`}
//               aria-label="Edit project"
//             >
//               <MoreHorizontal size={20} />
//             </Link>
//           </div>
//           <div className="leader-project-stats">
//             <span>
//               <Users size={17} />
//               <strong>
//                 {project.team} / {project.capacity}
//               </strong>{" "}
//               members
//             </span>
//             <span>
//               <Code2 size={17} />
//               <strong>{project.capacity - project.team}</strong> open positions
//             </span>
//             <span>
//               <Sparkles size={17} />
//               <strong>{4 - dismissed.length}</strong> interested candidates
//             </span>
//           </div>
//           <div className="leader-project-actions">
//             <Link to="/candidates" className="btn btn-primary">
//               Review candidates <ArrowRight size={15} />
//             </Link>
//             <Link
//               to={`/project/${project.id}/edit`}
//               className="btn btn-secondary"
//             >
//               Manage project
//             </Link>
//             <Link to="/team" className="text-link">
//               Team workspace <ArrowUpRight size={14} />
//             </Link>
//           </div>
//         </section>
//       ))}
//       <div className="two-column">
//         <section className="panel">
//           <SectionHeading
//             title="Recent candidates"
//             action={
//               <Link className="text-link" to="/candidates">
//                 View all <ArrowRight size={13} />
//               </Link>
//             }
//           />
//           {initialCandidates
//             .filter((candidate) => !dismissed.includes(candidate.name))
//             .slice(0, 3)
//             .map((candidate) => (
//               <Link
//                 className="recent-candidate"
//                 key={candidate.name}
//                 to={`/candidate/${encodeURIComponent(candidate.name)}`}
//               >
//                 <Avatar name={candidate.name} color={candidate.color} />
//                 <div>
//                   <strong>{candidate.name}</strong>
//                   <small>{candidate.role}</small>
//                 </div>
//                 <Badge tone="success">{candidate.match}% match</Badge>
//               </Link>
//             ))}
//         </section>
//         <section className="panel">
//           <SectionHeading title="Keep the conversation going" />
//           <div className="leader-message">
//             <Avatar name="Cao Thanh Nhan" color="teal" />
//             <div>
//               <h3>Cao Thanh Nhan</h3>
//               <p>“I’d love to learn more about the backend architecture.”</p>
//               <Link
//                 className="text-link"
//                 to="/messages?conversation=Cao%20Thanh%20Nhan"
//               >
//                 Reply in chat <ArrowRight size={14} />
//               </Link>
//             </div>
//           </div>
//           <div className="trust-note">
//             <Users size={18} />
//             <span>
//               The best team fit goes beyond a score. Start a conversation about
//               goals, availability, and how you like to work.
//             </span>
//           </div>
//         </section>
//       </div>
//     </>
//   )
// }

// export function CreateProject() {
//   const { id } = useParams()
//   const { projects, setProjects, profile, notify } = useTindy()
//   const existing = projects.find((project) => project.id === id)
//   const navigate = useNavigate()
//   const [jd, setJd] = useState(existing?.description || "")
//   const [name, setName] = useState(existing?.name || "")
//   const [goals, setGoals] = useState(existing?.goals.join("\n") || "")
//   const [stack, setStack] = useState(existing?.skills.join(", ") || "")
//   const [role, setRole] = useState(existing?.role || "Backend Developer")
//   const [hours, setHours] = useState(existing?.hours || 10)
//   const [duration, setDuration] = useState(existing?.duration || "3 months")
//   const [type, setType] = useState(existing?.type || "AI & Machine Learning")
//   const [members, setMembers] = useState(existing?.team || 1)
//   const [positions, setPositions] = useState(
//     existing ? existing.capacity - existing.team : 2,
//   )
//   const [required, setRequired] = useState(
//     (existing?.requiredSkills || existing?.skills.slice(0, 3))?.join(", ") ||
//       "",
//   )
//   const [nice, setNice] = useState(existing?.gap.join(", ") || "")
//   const [level, setLevel] = useState(existing?.difficulty || "Intermediate")
//   const [confirmed, setConfirmed] = useState(false)
//   return (
//     <>
//       <Link className="back-link" to="/leader">
//         <ArrowLeft size={14} />
//         Leader workspace
//       </Link>
//       <PageHeader
//         title={
//           existing ? "Manage your project" : "Bring your next idea to life."
//         }
//         description="A clear project brief helps the right people find you."
//       />
//       <div className="create-layout">
//         <form
//           className="panel project-form"
//           onSubmit={(event) => {
//             event.preventDefault()
//             const project: Project = {
//               id: existing?.id || `project-${Date.now()}`,
//               name,
//               description: jd,
//               type,
//               skills: stack
//                 .split(",")
//                 .map((item) => item.trim())
//                 .filter(Boolean),
//               role,
//               hours,
//               duration,
//               difficulty: level,
//               team: members,
//               capacity: members + positions,
//               leader: profile.name,
//               initials: name
//                 .split(" ")
//                 .slice(0, 2)
//                 .map((word) => word[0])
//                 .join("")
//                 .toUpperCase(),
//               color: "indigo",
//               created: Date.now(),
//               closing: 14,
//               factors: existing?.factors || [80, 85, 100, 75, 100],
//               goals: goals.split("\n").filter(Boolean),
//               requiredSkills: required
//                 .split(",")
//                 .map((item) => item.trim())
//                 .filter(Boolean),
//               gap: nice
//                 .split(",")
//                 .map((item) => item.trim())
//                 .filter(Boolean),
//             }
//             setProjects((old) =>
//               existing
//                 ? old.map((item) => (item.id === existing.id ? project : item))
//                 : [...old, project],
//             )
//             notify(
//               existing
//                 ? "Project updated"
//                 : "Project published · Recruitment is open",
//             )
//             navigate("/leader")
//           }}
//         >
//           <div className="form-section-heading">
//             <span>01</span>
//             <div>
//               <h2>The big picture</h2>
//               <p>Tell your future teammates what you’re building.</p>
//             </div>
//           </div>
//           <label className="field">
//             Project name
//             <input
//               required
//               placeholder="e.g. AI Customer Support System"
//               value={name}
//               onChange={(event) => setName(event.target.value)}
//             />
//           </label>
//           <label className="field">
//             Project description
//             <textarea
//               required
//               rows={5}
//               placeholder="What are you building, and why does it matter?"
//               value={jd}
//               onChange={(event) => {
//                 setJd(event.target.value)
//                 setConfirmed(false)
//               }}
//             />
//           </label>
//           <div className="ai-assist-row">
//             <span>
//               <Sparkles size={15} />A starting point, not the final word.
//             </span>
//             <Button
//               type="button"
//               variant="secondary"
//               disabled={!name.trim()}
//               onClick={() => {
//                 setJd(
//                   `${name} is a collaborative FCAJ project focused on ${type.toLowerCase()}. Our goal is to build a practical, user-centered solution using ${stack || "a modern technology stack"}. We’re looking for a ${role} to help design, develop, and deploy the product. You’ll work alongside a supportive student team and contribute ${hours} hours per week over ${duration}.`,
//                 )
//                 setConfirmed(false)
//                 notify("Demo JD generated · Please review before publishing")
//               }}
//             >
//               <Sparkles size={14} />
//               Generate JD with AI
//             </Button>
//           </div>
//           <label className="field">
//             Project goals <small>One objective per line</small>
//             <textarea
//               required
//               rows={3}
//               value={goals}
//               onChange={(event) => setGoals(event.target.value)}
//               placeholder="What will your team achieve?"
//             />
//           </label>
//           <div className="form-grid">
//             <label className="field">
//               Project type
//               <select
//                 value={type}
//                 onChange={(event) => setType(event.target.value)}
//               >
//                 {[
//                   "AI & Machine Learning",
//                   "Cloud & DevOps",
//                   "Web Application",
//                   "Open Source",
//                   "Social Impact",
//                 ].map((item) => (
//                   <option key={item}>{item}</option>
//                 ))}
//               </select>
//             </label>
//             <label className="field">
//               Technology stack
//               <input
//                 required
//                 value={stack}
//                 onChange={(event) => setStack(event.target.value)}
//                 placeholder=".NET, AWS, PostgreSQL, React"
//               />
//             </label>
//           </div>
//           <div className="form-section-heading">
//             <span>02</span>
//             <div>
//               <h2>The people & the fit</h2>
//               <p>Define the roles, not just the tools.</p>
//             </div>
//           </div>
//           <div className="form-grid">
//             <label className="field">
//               Current team members
//               <input
//                 type="number"
//                 min="1"
//                 max="20"
//                 required
//                 value={members}
//                 onChange={(event) => setMembers(Number(event.target.value))}
//               />
//             </label>
//             <label className="field">
//               Available positions
//               <input
//                 type="number"
//                 min="1"
//                 max="20"
//                 required
//                 value={positions}
//                 onChange={(event) => setPositions(Number(event.target.value))}
//               />
//             </label>
//             <label className="field">
//               Required role
//               <select
//                 value={role}
//                 onChange={(event) => setRole(event.target.value)}
//               >
//                 {[
//                   "Backend Developer",
//                   "Frontend Developer",
//                   "Full-stack Developer",
//                   "AI Engineer",
//                   "Cloud Engineer",
//                   "UI/UX Designer",
//                 ].map((item) => (
//                   <option key={item}>{item}</option>
//                 ))}
//               </select>
//             </label>
//             <label className="field">
//               Experience level
//               <select
//                 value={level}
//                 onChange={(event) => setLevel(event.target.value)}
//               >
//                 <option>Beginner-friendly</option>
//                 <option>Intermediate</option>
//               </select>
//             </label>
//           </div>
//           <label className="field">
//             Required skills
//             <input
//               required
//               value={required}
//               onChange={(event) => setRequired(event.target.value)}
//               placeholder=".NET, REST API, PostgreSQL"
//             />
//           </label>
//           <label className="field">
//             Nice-to-have skills
//             <input
//               value={nice}
//               onChange={(event) => setNice(event.target.value)}
//               placeholder="Docker, CI/CD"
//             />
//           </label>
//           <div className="form-section-heading">
//             <span>03</span>
//             <div>
//               <h2>A realistic commitment</h2>
//               <p>Help students find a sustainable fit.</p>
//             </div>
//           </div>
//           <div className="form-grid">
//             <label className="field">
//               Expected commitment (hours / week)
//               <input
//                 type="number"
//                 required
//                 min="1"
//                 max="40"
//                 value={hours}
//                 onChange={(event) => setHours(Number(event.target.value))}
//               />
//             </label>
//             <label className="field">
//               Project duration
//               <select
//                 value={duration}
//                 onChange={(event) => setDuration(event.target.value)}
//               >
//                 <option>1 month</option>
//                 <option>2 months</option>
//                 <option>3 months</option>
//               </select>
//             </label>
//           </div>
//           <label className="terms">
//             <input
//               type="checkbox"
//               checked={confirmed}
//               onChange={(event) => setConfirmed(event.target.checked)}
//               required
//             />
//             I have reviewed the project brief and confirm all information before
//             publishing.
//           </label>
//           <div className="form-footer">
//             <Link className="btn btn-secondary" to="/leader">
//               Cancel
//             </Link>
//             <Button>
//               {existing ? "Save changes" : "Publish project"}
//               <ArrowRight size={16} />
//             </Button>
//           </div>
//         </form>
//         <aside className="panel create-advice">
//           <span className="icon-tile teal">
//             <FileText size={21} />
//           </span>
//           <h3>A brief worth joining</h3>
//           <p>Great project briefs make three things clear:</p>
//           <ul>
//             <li>
//               <Check size={15} />
//               What you’re building
//             </li>
//             <li>
//               <Check size={15} />
//               How a student can contribute
//             </li>
//             <li>
//               <Check size={15} />
//               What they’ll learn along the way
//             </li>
//           </ul>
//           <div className="trust-note">
//             <Info size={16} />
//             <span>
//               AI-generated descriptions are editable drafts. Your review is
//               required before publication. Generation is simulated in this
//               prototype.
//             </span>
//           </div>
//         </aside>
//       </div>
//     </>
//   )
// }

// export function Candidates() {
//   const {
//     dismissed,
//     setDismissed,
//     candidateInvites,
//     setCandidateInvites,
//     notify,
//   } = useTindy()
//   const [role, setRole] = useState("")
//   const [query, setQuery] = useState("")
//   const [hours, setHours] = useState("")
//   const [sort, setSort] = useState("Highest Match")
//   const [review, setReview] = useState<string | null>(null)
//   const candidates = initialCandidates
//     .filter(
//       (candidate) =>
//         !dismissed.includes(candidate.name) &&
//         (!role || candidate.role === role) &&
//         `${candidate.name} ${candidate.skills.join(" ")} ${candidate.experience}`
//           .toLowerCase()
//           .includes(query.toLowerCase()) &&
//         (!hours || candidate.hours >= Number(hours)),
//     )
//     .sort((first, second) =>
//       sort === "Highest Match"
//         ? second.match - first.match
//         : second.hours - first.hours,
//     )
//   return (
//     <>
//       <Link className="back-link" to="/leader">
//         <ArrowLeft size={14} />
//         Leader workspace
//       </Link>
//       <PageHeader
//         title="Find your next great teammate."
//         description="Candidates for AI Customer Support System"
//         action={<Badge tone="success">{candidates.length} INTERESTED</Badge>}
//       />
//       <div className="candidate-filters">
//         <label className="search-input">
//           <Search size={17} />
//           <input
//             placeholder="Search skills, experience, or names…"
//             value={query}
//             onChange={(event) => setQuery(event.target.value)}
//           />
//         </label>
//         <select
//           aria-label="Filter candidate role"
//           value={role}
//           onChange={(event) => setRole(event.target.value)}
//         >
//           <option value="">All roles</option>
//           <option>Backend Developer</option>
//           <option>Frontend Developer</option>
//           <option>AI Engineer</option>
//         </select>
//         <select
//           aria-label="Filter availability"
//           value={hours}
//           onChange={(event) => setHours(event.target.value)}
//         >
//           <option value="">Any availability</option>
//           <option value="10">10+ hrs/week</option>
//           <option value="12">12+ hrs/week</option>
//         </select>
//         <select
//           aria-label="Candidate sorting"
//           value={sort}
//           onChange={(event) => setSort(event.target.value)}
//         >
//           <option>Highest Match</option>
//           <option>Most availability</option>
//         </select>
//       </div>
//       <div className="candidate-grid">
//         {candidates.map((candidate) => (
//           <article className="candidate-card panel" key={candidate.name}>
//             <div className="candidate-card-top">
//               <Avatar name={candidate.name} color={candidate.color} size="lg" />
//               <div>
//                 <Link to={`/candidate/${encodeURIComponent(candidate.name)}`}>
//                   <h3>{candidate.name}</h3>
//                 </Link>
//                 <p>{candidate.role}</p>
//                 <small>FPT University · FCAJ</small>
//               </div>
//               <Badge tone="success">{candidate.match}% match</Badge>
//             </div>
//             <Chips items={candidate.skills} />
//             <p className="candidate-experience">
//               <Code2 size={15} />
//               {candidate.experience}
//             </p>
//             <div className="candidate-availability">
//               <Clock size={14} />
//               Available {candidate.hours} hours/week
//             </div>
//             <div className="candidate-actions">
//               <Link
//                 className="btn btn-secondary"
//                 to={`/candidate/${encodeURIComponent(candidate.name)}`}
//               >
//                 View profile
//               </Link>
//               <Link
//                 className="btn btn-secondary"
//                 to={`/messages?conversation=${encodeURIComponent(candidate.name)}`}
//               >
//                 <MessageSquare size={14} />
//                 Invite to chat
//               </Link>
//               <Button
//                 disabled={candidateInvites.includes(candidate.name)}
//                 onClick={() => setReview(candidate.name)}
//               >
//                 {candidateInvites.includes(candidate.name)
//                   ? "Invited ✓"
//                   : "Invite to team"}
//               </Button>
//             </div>
//             <button
//               className="dismiss-button"
//               onClick={() => {
//                 setDismissed((old) => [...old, candidate.name])
//                 notify("Candidate dismissed from this project")
//               }}
//             >
//               Dismiss candidate
//             </button>
//           </article>
//         ))}
//       </div>
//       {!candidates.length && (
//         <EmptyState
//           title="No candidates have shown interest yet."
//           description="Share a clear project brief and give the right people a reason to join."
//           action={
//             <Link to="/project/cloud-desk/edit" className="btn btn-primary">
//               Improve project brief
//             </Link>
//           }
//         />
//       )}
//       <div className="trust-note">
//         <ShieldCheck size={16} />
//         <span>
//           Candidate scores are illustrative fixtures in this prototype. Review
//           their full profile and have a conversation before making a decision.
//         </span>
//       </div>
//       {review && (
//         <Modal title="Team invitation" onClose={() => setReview(null)}>
//           <h2>Invite {review} to your team?</h2>
//           <p>
//             They’ll receive an invitation for AI Customer Support System, with
//             your role and commitment expectations.
//           </p>
//           <label className="field">
//             A personal note
//             <textarea
//               rows={3}
//               defaultValue="Your experience would be a great addition to our team. We’d love to build with you!"
//             />
//           </label>
//           <div className="modal-actions">
//             <Button variant="secondary" onClick={() => setReview(null)}>
//               Cancel
//             </Button>
//             <Button
//               onClick={() => {
//                 setCandidateInvites((old) => [...new Set([...old, review])])
//                 notify("Team invitation sent to " + review)
//                 setReview(null)
//               }}
//             >
//               Send invitation <Send size={15} />
//             </Button>
//           </div>
//         </Modal>
//       )}
//     </>
//   )
// }

// export function CandidateDetail() {
//   const { id } = useParams()
//   const candidate = initialCandidates.find((person) => person.name === id)
//   const { candidateInvites, setCandidateInvites, notify } = useTindy()
//   const explanation = useExplanation(
//     candidate
//       ? {
//           skills: candidate.skills,
//           role: candidate.role,
//           hours: String(candidate.hours),
//           experience: candidate.experience,
//         }
//       : undefined,
//   )
//   if (!candidate) return <NotFound />
//   return (
//     <>
//       <Link className="back-link" to="/candidates">
//         <ArrowLeft size={14} />
//         Back to candidates
//       </Link>
//       <PageHeader
//         title="A person behind the profile."
//         description="Candidate review · AI Customer Support System"
//       />
//       <div className="panel candidate-detail-top">
//         <Avatar name={candidate.name} color={candidate.color} size="xl" />
//         <div>
//           <h1>{candidate.name}</h1>
//           <p>{candidate.role} · FPT University</p>
//           <div className="header-buttons">
//             <Badge tone="success">{candidate.match}% match</Badge>
//             <Badge>
//               <Clock size={12} />
//               {candidate.hours} hrs/week
//             </Badge>
//           </div>
//         </div>
//         <div className="header-buttons">
//           <Link
//             className="btn btn-secondary"
//             to={`/messages?conversation=${encodeURIComponent(candidate.name)}`}
//           >
//             <MessageSquare size={15} />
//             Invite to chat
//           </Link>
//           <Button
//             disabled={candidateInvites.includes(candidate.name)}
//             onClick={() => {
//               setCandidateInvites((old) => [...old, candidate.name])
//               notify("Team invitation sent")
//             }}
//           >
//             {candidateInvites.includes(candidate.name)
//               ? "Invitation sent ✓"
//               : "Invite to team"}
//           </Button>
//         </div>
//       </div>
//       <div className="detail-layout">
//         <div className="detail-main">
//           <section className="panel">
//             <h2>Profile summary</h2>
//             <p>
//               {candidate.role} with practical experience in{" "}
//               {candidate.skills.join(", ")}. Passionate about building reliable
//               applications, learning through real projects, and collaborating
//               with the FCAJ community.
//             </p>
//             <h3>Technical skills</h3>
//             <Chips items={candidate.skills} />
//             <h3>Project experience</h3>
//             <div className="experience-card">
//               <span className={`project-mark ${candidate.color}`}>PR</span>
//               <div>
//                 <h3>Student project portfolio</h3>
//                 <p>{candidate.experience}</p>
//                 <a
//                   href="https://github.com"
//                   target="_blank"
//                   rel="noreferrer"
//                   className="text-link"
//                 >
//                   Explore GitHub <ArrowUpRight size={13} />
//                 </a>
//               </div>
//             </div>
//             <h3>Certificates</h3>
//             <div className="certificate">
//               <ShieldCheck size={21} />
//               <div>
//                 <strong>AWS Cloud Practitioner</strong>
//                 <small>Supporting evidence · Example certificate</small>
//               </div>
//             </div>
//           </section>
//           <section className="panel">
//             <h2>Preferences & availability</h2>
//             <div className="form-grid">
//               <div>
//                 <h3>Preferred role</h3>
//                 <p>{candidate.role}</p>
//               </div>
//               <div>
//                 <h3>Weekly commitment</h3>
//                 <p>{candidate.hours} hours / week</p>
//               </div>
//             </div>
//             <h3>Interests</h3>
//             <Chips
//               items={["Cloud computing", "AI applications", "Open source"]}
//             />
//           </section>
//         </div>
//         <aside>
//           <section className="panel">
//             <div className="insight-label">
//               <Sparkles size={15} />
//               AI MATCH ANALYSIS
//             </div>
//             <h2>{candidate.match}% match</h2>
//             <div className="quick-matches">
//               <p>
//                 <Check size={14} />
//                 {candidate.skills[0]} experience
//               </p>
//               <p>
//                 <Check size={14} />
//                 Relevant project evidence
//               </p>
//               <p>
//                 <Check size={14} />
//                 Availability fits the project
//               </p>
//             </div>
//             <div className="gap-summary">
//               <TriangleAlert size={15} />
//               <div>
//                 <strong>Room to grow</strong>
//                 <p>Docker deployment experience isn’t listed.</p>
//               </div>
//             </div>
//             <Button
//               variant="secondary"
//               className="full"
//               onClick={() =>
//                 explanation.open({
//                   ...initialProjects[0],
//                   factors: [
//                     candidate.match,
//                     candidate.match,
//                     candidate.match,
//                     candidate.match,
//                     candidate.match,
//                   ],
//                 })
//               }
//             >
//               See full explanation <ArrowRight size={14} />
//             </Button>
//           </section>
//           <div className="trust-note">
//             <Info size={15} />
//             <span>
//               Illustrative candidate data. A score supports your review; it
//               doesn’t replace it.
//             </span>
//           </div>
//         </aside>
//       </div>
//       {explanation.element}
//     </>
//   )
// }

// type ChatMessage = {
//   body: string
//   outgoing: boolean
//   file?: boolean
// }
// export function Messages() {
//   const [params, setParams] = useSearchParams()
//   const { notify, profile } = useTindy()
//   const [query, setQuery] = useState("")
//   const [draft, setDraft] = useState("")
//   const [tab, setTab] = useState("General chat")
//   const [history, setHistory] = useState<Record<string, ChatMessage[]>>({})
//   const current = params.get("conversation") || "Minh Nguyen"
//   const people = [
//     ...new Set(["Minh Nguyen", "EcoTrack team", "Cao Thanh Nhan", current]),
//   ]
//   const team = current.includes("team")
//   const initial: ChatMessage[] =
//     current === "Minh Nguyen"
//       ? [
//           {
//             body: `Hey ${profile.name.split(" ")[0]}! Your experience with .NET and RAG caught my eye. I think you’d be a great fit for our AI Customer Support project.`,
//             outgoing: false,
//           },
//           {
//             body: "Thanks for reaching out! The project sounds really interesting. I’d love to learn more about the architecture.",
//             outgoing: true,
//           },
//           {
//             body: "Absolutely. We’re building the backend on .NET, with PostgreSQL and AWS. Would you have 8–10 hours a week to collaborate?",
//             outgoing: false,
//           },
//         ]
//       : [
//           {
//             body: team
//               ? "Welcome to the team! Our next check-in is Friday at 5 PM. Share what you’re working on here."
//               : `Hi! I’d love to connect about AI Customer Support System.`,
//             outgoing: !team,
//           },
//         ]
//   const messages = history[current] || initial
//   const send = (body: string, file = false) => {
//     if (!body.trim()) return
//     setHistory((old) => ({
//       ...old,
//       [current]: [...messages, { body, outgoing: true, file }],
//     }))
//     setDraft("")
//   }
//   return (
//     <>
//       <PageHeader
//         title="Conversations that move things forward."
//         description="Connect with project leaders, candidates, and your team."
//       />
//       <section className="messaging">
//         <aside className="conversation-sidebar">
//           <div className="conversation-heading">
//             <h3>Messages</h3>
//             <span className="badge">{people.length}</span>
//           </div>
//           <label className="search-input">
//             <Search size={16} />
//             <input
//               aria-label="Search conversations"
//               placeholder="Search conversations…"
//               value={query}
//               onChange={(event) => setQuery(event.target.value)}
//             />
//           </label>
//           <div className="conversation-list">
//             {people
//               .filter((person) =>
//                 person.toLowerCase().includes(query.toLowerCase()),
//               )
//               .map((person, index) => (
//                 <button
//                   key={person}
//                   className={`conversation ${
//                     current === person ? "active" : ""
//                   }`}
//                   onClick={() => {
//                     setParams({ conversation: person })
//                     setTab("General chat")
//                     setDraft("")
//                   }}
//                 >
//                   <Avatar
//                     name={person}
//                     color={index === 0 ? "teal" : index === 1 ? "green" : "sky"}
//                   />
//                   <div>
//                     <div>
//                       <strong>{person}</strong>
//                       <small>{index === 0 ? "10:42" : "Yesterday"}</small>
//                     </div>
//                     <span>
//                       {person.includes("team")
//                         ? "EcoTrack · Team conversation"
//                         : "AI Customer Support System"}
//                     </span>
//                     <p>
//                       {history[person]?.at(-1)?.body ||
//                         (index === 0
//                           ? "Would you have 8–10 hours a week?"
//                           : "Let’s build something meaningful.")}
//                     </p>
//                   </div>
//                   {index === 0 && <i />}
//                 </button>
//               ))}
//           </div>
//           {query &&
//             !people.some((person) =>
//               person.toLowerCase().includes(query.toLowerCase()),
//             ) && (
//               <EmptyState
//                 title="No conversations found"
//                 description="Try a different name."
//               />
//             )}
//           <div className="conversation-context">
//             <ShieldCheck size={15} />
//             <span>
//               Your project conversations,
//               <br />
//               all in one place.
//             </span>
//           </div>
//         </aside>
//         <div className="chat-main">
//           <div className="chat-header">
//             <Avatar name={current} color="teal" />
//             <div>
//               <h3>{current}</h3>
//               <p>
//                 <span className="online-dot" />
//                 {team ? "Team conversation" : "Project leader / candidate"}{" "}
//                 <b>·</b> FCAJ
//               </p>
//             </div>
//             <Link
//               to={team ? "/project/ecotrack" : "/project/cloud-desk"}
//               className="btn btn-secondary"
//             >
//               View project <ArrowUpRight size={13} />
//             </Link>
//           </div>
//           <div className="chat-project-context">
//             <FolderKanban size={15} />
//             <span>{team ? "EcoTrack" : "AI Customer Support System"}</span>
//             <Badge>PROJECT CONTEXT</Badge>
//           </div>
//           {team && (
//             <div className="tabs chat-tabs">
//               {["General chat", "Announcements", "Team members"].map((item) => (
//                 <button
//                   key={item}
//                   className={tab === item ? "active" : ""}
//                   onClick={() => setTab(item)}
//                 >
//                   {item}
//                 </button>
//               ))}
//             </div>
//           )}
//           {tab === "Announcements" ? (
//             <div className="chat-announcement">
//               <Badge tone="blue">TEAM UPDATE</Badge>
//               <h3>Kickoff · Friday, 5 PM</h3>
//               <p>
//                 Bring your ideas and questions. We’ll review the architecture
//                 and plan our first sprint.
//               </p>
//             </div>
//           ) : tab === "Team members" ? (
//             <div className="chat-announcement">
//               {["Jamie Le", profile.name, "An Hoang", "Linh Tran"].map(
//                 (person) => (
//                   <div className="team-person" key={person}>
//                     <Avatar name={person} />
//                     <strong>{person}</strong>
//                     <Badge>MEMBER</Badge>
//                   </div>
//                 ),
//               )}
//             </div>
//           ) : (
//             <>
//               <div className="chat-messages">
//                 <div className="chat-date">
//                   <span>Today</span>
//                 </div>
//                 {messages.map((message, index) => (
//                   <div
//                     className={`message-row ${
//                       message.outgoing ? "outgoing" : ""
//                     }`}
//                     key={index}
//                   >
//                     {!message.outgoing && (
//                       <Avatar name={current} color="teal" />
//                     )}
//                     <div>
//                       <div className="chat-bubble">
//                         {message.file && <Paperclip size={15} />} {message.body}
//                       </div>
//                       <small>
//                         {message.outgoing ? "You" : current.split(" ")[0]} · 10:
//                         {(32 + index).toString().padStart(2, "0")}{" "}
//                         {message.outgoing && <CheckCheck size={12} />}
//                       </small>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//               <form
//                 className="message-composer"
//                 onSubmit={(event) => {
//                   event.preventDefault()
//                   send(draft)
//                 }}
//               >
//                 <label className="attach-file" title="Attach a file">
//                   <Paperclip size={20} />
//                   <input
//                     type="file"
//                     hidden
//                     onChange={(event) => {
//                       const file = event.target.files?.[0]
//                       if (file) {
//                         send(file.name, true)
//                         notify(
//                           "Attachment added · Filename only in this prototype",
//                         )
//                       }
//                     }}
//                   />
//                 </label>
//                 <input
//                   aria-label="Write a message"
//                   placeholder="Write a message…"
//                   value={draft}
//                   onChange={(event) => setDraft(event.target.value)}
//                 />
//                 <Button disabled={!draft.trim()} aria-label="Send message">
//                   <Send size={17} />
//                 </Button>
//               </form>
//               <div className="chat-demo-note">
//                 Local demo conversation · Messages are not sent to a server.
//               </div>
//             </>
//           )}
//         </div>
//       </section>
//     </>
//   )
// }

// export function Notifications() {
//   const { read, setRead, notify } = useTindy()
//   const [tab, setTab] = useState("All updates")
//   const updates = [
//     {
//       title: "You received a team invitation.",
//       description:
//         "Minh Nguyen invited you to join AI Customer Support System.",
//       icon: Mail,
//       tone: "teal",
//       path: "/projects?tab=Invited",
//       label: "Review invitation",
//       time: "12 minutes ago",
//     },
//     {
//       title: "Your profile was viewed by a project team.",
//       description:
//         "The AI Customer Support System team is getting to know your experience.",
//       icon: Users,
//       tone: "indigo",
//       path: "/profile",
//       label: "View profile",
//       time: "1 hour ago",
//     },
//     {
//       title: "A new project recommendation is ready.",
//       description:
//         "Campus Cloud aligns with your React skills and community interests.",
//       icon: Sparkles,
//       tone: "sky",
//       path: "/project/campus-cloud",
//       label: "View project",
//       time: "2 hours ago",
//     },
//     {
//       title: "Your project has a new interested candidate.",
//       description:
//         "Cao Thanh Nhan is interested in contributing to your backend.",
//       icon: Code2,
//       tone: "amber",
//       path: "/candidate/Cao%20Thanh%20Nhan",
//       label: "Review candidate",
//       time: "Yesterday",
//     },
//   ]
//   return (
//     <>
//       <PageHeader
//         title="Stay in the loop."
//         description="Your invitations, opportunities, and community updates."
//         action={
//           <Button
//             variant="secondary"
//             onClick={() => {
//               setRead([0, 1, 2, 3])
//               notify("All notifications marked as read")
//             }}
//           >
//             <CheckCheck size={15} />
//             Mark all as read
//           </Button>
//         }
//       />
//       <div className="status-tabs">
//         {["All updates", "Unread"].map((item) => (
//           <button
//             key={item}
//             onClick={() => setTab(item)}
//             className={tab === item ? "active" : ""}
//           >
//             {item}
//             {item === "Unread" && <span>{4 - read.length}</span>}
//           </button>
//         ))}
//       </div>
//       <section className="panel notifications-panel">
//         {updates.map((update, index) =>
//           tab === "Unread" && read.includes(index) ? null : (
//             <div
//               className={`notification-row ${
//                 read.includes(index) ? "" : "unread"
//               }`}
//               key={update.title}
//             >
//               <span className={`icon-tile ${update.tone}`}>
//                 <update.icon size={19} />
//               </span>
//               <div>
//                 <h3>
//                   {update.title}
//                   {!read.includes(index) && <i className="unread-dot" />}
//                 </h3>
//                 <p>{update.description}</p>
//                 <small>{update.time}</small>
//               </div>
//               <Link
//                 to={update.path}
//                 className="btn btn-secondary"
//                 onClick={() => setRead((old) => [...new Set([...old, index])])}
//               >
//                 {update.label}
//                 <ArrowRight size={13} />
//               </Link>
//             </div>
//           ),
//         )}
//         {tab === "Unread" && read.length === 4 && (
//           <EmptyState
//             title="You’re all caught up."
//             description="New opportunities and updates will appear here."
//           />
//         )}
//       </section>
//     </>
//   )
// }

// export function TeamScreen() {
//   const { profile, notify } = useTindy()
//   const [announcement, setAnnouncement] = useState("")
//   const [posts, setPosts] = useState([
//     "Welcome to EcoTrack! Our kickoff is Friday at 5 PM. Bring your ideas.",
//   ])
//   const [invite, setInvite] = useState(false)
//   const [team, setTeam] = useState([
//     "Jamie Le",
//     profile.name,
//     "An Hoang",
//     "Linh Tran",
//   ])
//   return (
//     <>
//       <PageHeader
//         eyebrow="TEAM WORKSPACE"
//         title="EcoTrack"
//         description="A shared space for the people building a greener future."
//         action={
//           <Link
//             className="btn btn-primary"
//             to="/messages?conversation=EcoTrack%20team"
//           >
//             <MessageSquare size={16} />
//             Open team chat
//           </Link>
//         }
//       />
//       <div className="two-column">
//         <section className="panel">
//           <SectionHeading
//             title="Your team"
//             action={
//               <Button variant="secondary" onClick={() => setInvite(true)}>
//                 <Plus size={14} />
//                 Invite
//               </Button>
//             }
//           />
//           {team.map((person, index) => (
//             <div className="team-person" key={person}>
//               <Avatar name={person} color={index === 0 ? "green" : "neutral"} />
//               <div>
//                 <strong>{person}</strong>
//                 <p>
//                   {index === 0
//                     ? "Project leader"
//                     : index === 1
//                       ? "Backend Developer"
//                       : index === 2
//                         ? "AI Engineer"
//                         : "Frontend Developer"}
//                 </p>
//               </div>
//               <Badge tone="success">ACTIVE</Badge>
//             </div>
//           ))}
//           <Link to="/candidates" className="text-link spaced">
//             Review candidates <ArrowRight size={14} />
//           </Link>
//         </section>
//         <section className="panel">
//           <h2>Team announcements</h2>
//           {posts.map((post, index) => (
//             <div className="announcement" key={index}>
//               <Badge tone="blue">TEAM UPDATE</Badge>
//               <p>{post}</p>
//               <small>Published to your team</small>
//             </div>
//           ))}
//           <form
//             onSubmit={(event) => {
//               event.preventDefault()
//               if (announcement.trim()) {
//                 setPosts([...posts, announcement])
//                 setAnnouncement("")
//                 notify("Announcement published")
//               }
//             }}
//           >
//             <label className="field">
//               Share an update
//               <textarea
//                 rows={3}
//                 value={announcement}
//                 onChange={(event) => setAnnouncement(event.target.value)}
//                 placeholder="What should the team know?"
//               />
//             </label>
//             <Button disabled={!announcement.trim()}>
//               Post announcement <Send size={14} />
//             </Button>
//           </form>
//         </section>
//       </div>
//       {invite && (
//         <Modal title="Invite teammate" onClose={() => setInvite(false)}>
//           <h2>Make room for one more.</h2>
//           <form
//             onSubmit={(event) => {
//               event.preventDefault()
//               const data = new FormData(event.currentTarget)
//               setTeam([...team, String(data.get("name"))])
//               setInvite(false)
//               notify("Demo teammate added")
//             }}
//           >
//             <label className="field">
//               Name
//               <input required name="name" />
//             </label>
//             <label className="field">
//               Email
//               <input required type="email" />
//             </label>
//             <Button>
//               Send invitation <ArrowRight size={15} />
//             </Button>
//           </form>
//         </Modal>
//       )}
//     </>
//   )
// }

// export function SettingsScreen() {
//   const { profile, setProfile, mode, setMode, notify } = useTindy()
//   const [preferences, setPreferences] = useState<Record<string, boolean>>(
//     () => {
//       try {
//         const stored = localStorage.getItem("tindy-v2-preferences")
//         if (stored) return JSON.parse(stored)
//       } catch {}
//       return {
//         "Email notifications": true,
//         "Project invitations": true,
//         "New recommendations": true,
//         "Team announcements": true,
//       }
//     },
//   )
//   const [email, setEmail] = useState(profile.email)
//   return (
//     <>
//       <PageHeader
//         title="Your workspace, your way."
//         description="Manage your account and choose what keeps you in the loop."
//       />
//       <div className="settings-layout">
//         <aside>
//           <a href="#account" className="active">
//             <UserIcon />
//             Account
//           </a>
//           <a href="#preferences">
//             <Bell size={16} />
//             Notifications
//           </a>
//           <a href="#privacy">
//             <ShieldCheck size={16} />
//             Privacy & security
//           </a>
//         </aside>
//         <div>
//           <form
//             className="panel"
//             onSubmit={(event) => {
//               event.preventDefault()
//               setProfile({ ...profile, email })
//               notify("Account preferences saved")
//             }}
//           >
//             <h2 id="account">Account</h2>
//             <label className="field">
//               Email address
//               <input
//                 required
//                 type="email"
//                 value={email}
//                 onChange={(event) => setEmail(event.target.value)}
//               />
//             </label>
//             <label className="field">
//               Workspace role
//               <select
//                 value={mode}
//                 onChange={(event) => setMode(event.target.value)}
//               >
//                 <option>Student</option>
//                 <option>Project Leader</option>
//               </select>
//             </label>
//             <Button>
//               Save changes <Check size={15} />
//             </Button>
//           </form>
//           <section className="panel">
//             <h2 id="preferences">Notifications</h2>
//             <p>Keep the important updates. Leave the noise.</p>
//             {Object.entries(preferences).map(([label, value]) => (
//               <label className="toggle-row" key={label}>
//                 <span>{label}</span>
//                 <input
//                   type="checkbox"
//                   role="switch"
//                   checked={value}
//                   onChange={(event) =>
//                     setPreferences({
//                       ...preferences,
//                       [label]: event.target.checked,
//                     })
//                   }
//                 />
//               </label>
//             ))}
//             <Button
//               variant="secondary"
//               onClick={() => {
//                 localStorage.setItem(
//                   "tindy-v2-preferences",
//                   JSON.stringify(preferences),
//                 )
//                 notify("Notification preferences saved")
//               }}
//             >
//               Save preferences
//             </Button>
//           </section>
//           <section className="panel">
//             <h2 id="privacy">Privacy & security</h2>
//             <p>
//               Your profile is visible to the FCAJ community. Project leaders can
//               review it when you send interest.
//             </p>
//             <div className="trust-note">
//               <ShieldCheck size={17} />
//               <span>
//                 This is an interactive frontend prototype. Cognito
//                 authentication, storage, AI services, and real-time
//                 communication are not connected.
//               </span>
//             </div>
//             <Link to="/login" className="btn btn-secondary">
//               <LogOut size={15} />
//               Sign out of demo
//             </Link>
//           </section>
//         </div>
//       </div>
//     </>
//   )
// }

// export function ComponentLibrary() {
//   return (
//     <>
//       <PageHeader
//         eyebrow="TINDY DESIGN SYSTEM / 01"
//         title="Clear by design."
//         description="A consistent visual language for meaningful projects and thoughtful collaboration."
//       />
//       <div className="two-column">
//         <section className="panel">
//           <h2>Color & status</h2>
//           <div className="token-swatches">
//             {["indigo", "teal", "sky", "green", "amber", "rose"].map(
//               (color) => (
//                 <div className={color} key={color}>
//                   {color}
//                 </div>
//               ),
//             )}
//           </div>
//           <div className="header-buttons">
//             <Badge tone="success">Excellent match</Badge>
//             <Badge tone="warning">Opportunity to grow</Badge>
//             <Badge tone="blue">AI insight</Badge>
//           </div>
//           <h3>Typography</h3>
//           <h1>Find your next chapter.</h1>
//           <h2>Build something meaningful.</h2>
//           <p>
//             Manrope for confident headings. Inter for clear, readable
//             interfaces.
//           </p>
//           <h3>Actions</h3>
//           <div className="header-buttons">
//             <Button>
//               Primary action <ArrowRight size={15} />
//             </Button>
//             <Button variant="secondary">Secondary</Button>
//             <Button variant="ghost">Tertiary</Button>
//             <Button disabled>Disabled</Button>
//           </div>
//           <h3>Skills & identity</h3>
//           <Chips items={[".NET", "AWS", "PostgreSQL", "RAG"]} />
//           <div className="header-buttons spaced">
//             <Avatar name="Alex Le" />
//             <Avatar name="Linh Tran" color="teal" />
//             <Avatar name="An Hoang" color="amber" />
//           </div>
//         </section>
//         <section className="panel">
//           <h2>Score & progress</h2>
//           <Score project={initialProjects[0]} />
//           <h3>Loading state</h3>
//           <Skeleton />
//           <h3>Inputs</h3>
//           <label className="field">
//             Project name
//             <input placeholder="What will you build?" />
//           </label>
//           <label className="field">
//             Role
//             <select>
//               <option>Backend Developer</option>
//             </select>
//           </label>
//           <h3>Empty state</h3>
//           <EmptyState
//             title="Your next project is out there."
//             description="Start with a skill, an interest, or an idea."
//           />
//         </section>
//       </div>
//     </>
//   )
// }
// export function NotFound() {
//   return (
//     <EmptyState
//       title="This page hasn’t found its project."
//       description="Let’s get you back to the opportunities that matter."
//       action={
//         <Link className="btn btn-primary" to="/discover">
//           Discover projects <ArrowRight size={15} />
//         </Link>
//       }
//     />
//   )
// }
