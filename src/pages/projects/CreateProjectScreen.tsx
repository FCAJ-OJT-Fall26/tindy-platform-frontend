import { useParams } from "react-router"
import { useTindy } from "../../store"
import { ProjectForm } from "../../components/projects/ProjectForm"

export function CreateProject() {
  const { id } = useParams()
  const { projects } = useTindy()
  const existing = id ? projects.find((project) => project.id === id) : undefined

  return (
    <ProjectForm
      key={id || "new-project"}
      mode={existing ? "edit" : "create"}
      initialProject={existing}
    />
  )
}

export default CreateProject
