import React from "react"
import { createRoot } from "react-dom/client"
import { createBrowserRouter, RouterProvider } from "react-router"
import WorkspaceProjectsScreen from "../src/pages/projects/WorkspaceProjectsScreen"
import "../src/index.css"

const router = createBrowserRouter([{ path: "*", element: <WorkspaceProjectsScreen mode="projects" saved={[]} onToggleSave={() => {}} onSelectDetail={project => { Object.assign(window, { workspaceSelection: project }) }} onCreateProject={() => {}} onOpenFilters={() => {}} /> }])
createRoot(document.getElementById("root")!).render(<RouterProvider router={router} />)
