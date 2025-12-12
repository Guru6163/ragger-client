"use client"

import * as React from "react"
import { Search, Plus, Grid3x3, List, Folder, Sparkles, MoreVertical, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { useAuth } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { apiClient } from "@/lib/api-client"
import { format } from "date-fns"

interface Project {
  id: string
  name: string
  description?: string
  clerk_id: string
  created_at?: string
  updated_at?: string
}

interface ProjectsResponse {
  status: string
  message: string
  data: Project[]
}

interface DeleteProjectResponse {
  status: string
  message: string
  data: Project[]
}

interface CreateProjectRequest {
  name: string
  description: string
}

interface CreateProjectResponse {
  status: string
  message: string
  data: Project[]
  settings?: unknown[]
}

export default function ProjectsPage() {
  const { getToken } = useAuth()
  const router = useRouter()
  const [projects, setProjects] = React.useState<Project[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false)
  const [projectName, setProjectName] = React.useState("")
  const [projectDescription, setProjectDescription] = React.useState("")
  const [deletingProjectId, setDeletingProjectId] = React.useState<string | null>(null)
  const [isCreating, setIsCreating] = React.useState(false)

  // Fetch projects on mount
  React.useEffect(() => {
    const fetchProjects = async () => {
      try {
        setIsLoading(true)
        const token = await getToken()
        const response = await apiClient.get<ProjectsResponse>("/api/projects", token)
        setProjects(response.data)
      } catch (error) {
        console.error("Error fetching projects:", error)
        toast.error(error instanceof Error ? error.message : "Failed to fetch projects")
      } finally {
        setIsLoading(false)
      }
    }

    fetchProjects()
  }, [getToken])

  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatDate = (dateString?: string) => {
    if (!dateString) return ""
    try {
      const date = new Date(dateString)
      return format(date, "dd/MM/yyyy")
    } catch {
      return ""
    }
  }

  const handleCreateProject = async () => {
    if (!projectName.trim()) return

    try {
      setIsCreating(true)
      const token = await getToken()

      const response = await apiClient.post<CreateProjectResponse>(
        "/api/projects",
        {
          name: projectName.trim(),
          description: projectDescription.trim() || "",
        } as CreateProjectRequest,
        token
      )

      if (response.data && response.data.length > 0) {
        setProjects((prev) => [...prev, response.data[0]])
        toast.success("Project created successfully", {
          description: `"${projectName.trim()}" has been created.`,
        })
      }

      setIsCreateDialogOpen(false)
      setProjectName("")
      setProjectDescription("")
    } catch (error) {
      console.error("Error creating project:", error)
      toast.error(error instanceof Error ? error.message : "Failed to create project")
    } finally {
      setIsCreating(false)
    }
  }

  const handleProjectClick = (projectId: string) => {
    router.push(`/projects/${projectId}`)
  }

  const handleDeleteProject = async (projectId: string) => {
    try {
      setDeletingProjectId(projectId)
      const token = await getToken()
      
      await apiClient.delete<DeleteProjectResponse>(`/api/projects/${projectId}`, token)

      const deletedProject = projects.find((p) => p.id === projectId)
      const projectName = deletedProject?.name || "Project"

      setProjects((prev) => prev.filter((p) => p.id !== projectId))
      toast.success("Project deleted successfully", {
        description: `"${projectName}" has been deleted.`,
      })
    } catch (error) {
      console.error("Error deleting project:", error)
      toast.error(error instanceof Error ? error.message : "Failed to delete project")
    } finally {
      setDeletingProjectId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground mt-1">{filteredProjects.length} projects</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="size-4" />
          Create new
        </Button>
      </div>

      {/* Create Project Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                <Sparkles className="size-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-2xl">Create new project</DialogTitle>
                <DialogDescription className="mt-1">
                  Start organizing your knowledge
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">Project name</Label>
              <Input
                id="project-name"
                placeholder="e.g., Research Analysis, Meeting Notes..."
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-description">Description (optional)</Label>
              <Textarea
                id="project-description"
                placeholder="What will this project be about?"
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateProject}
              disabled={!projectName.trim() || isCreating}
              className="w-full sm:w-auto"
            >
              <Sparkles className="size-4" />
              {isCreating ? "Creating..." : "Create project"}
            </Button>
          </DialogFooter>
          <p className="text-xs text-muted-foreground text-center pt-2">
            You can add documents and start chatting once your project is created
          </p>
        </DialogContent>
      </Dialog>

      {/* Search and View Toggle */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-1 rounded-md border p-1">
          <Button
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="icon"
            className="size-8"
            onClick={() => setViewMode("grid")}
          >
            <Grid3x3 className="size-4" />
            <span className="sr-only">Grid view</span>
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="icon"
            className="size-8"
            onClick={() => setViewMode("list")}
          >
            <List className="size-4" />
            <span className="sr-only">List view</span>
          </Button>
        </div>
      </div>

      {/* Recent Projects Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Recent projects</h2>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading projects...</div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No projects found</div>
        ) : viewMode === "grid" ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project) => (
              <Card 
                key={project.id} 
                className="group cursor-pointer hover:shadow-md transition-shadow border-0 bg-card relative"
                onClick={() => handleProjectClick(project.id)}
              >
                <CardContent className="p-0">
                  <div className="p-6 space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <Folder className="size-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-2">
                        <h3 className="font-semibold">{project.name}</h3>
                        {project.description && (
                          <p className="text-sm text-muted-foreground">
                            {project.description}
                          </p>
                        )}
                        {project.created_at && (
                          <p className="text-xs text-muted-foreground">{formatDate(project.created_at)}</p>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="size-4" />
                            <span className="sr-only">More options</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteProject(project.id)
                            }}
                            disabled={deletingProjectId === project.id}
                          >
                            <Trash2 className="size-4" />
                            {deletingProjectId === project.id ? "Deleting..." : "Delete Project"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredProjects.map((project) => (
              <Card 
                key={project.id} 
                className="group cursor-pointer hover:shadow-md transition-shadow border-0 bg-card"
                onClick={() => handleProjectClick(project.id)}
              >
                <CardContent className="p-0">
                  <div className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <Folder className="size-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{project.name}</h3>
                        {project.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                            {project.description}
                          </p>
                        )}
                      </div>
                      {project.created_at && (
                        <p className="text-xs text-muted-foreground shrink-0">{formatDate(project.created_at)}</p>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="size-4" />
                            <span className="sr-only">More options</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteProject(project.id)
                            }}
                            disabled={deletingProjectId === project.id}
                          >
                            <Trash2 className="size-4" />
                            {deletingProjectId === project.id ? "Deleting..." : "Delete Project"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
