"use client"

import * as React from "react"
import { MessageSquare, Plus, Settings, FileText, Globe, Link as LinkIcon, Upload, Info, CheckCircle2, Eye, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Progress } from "@/components/ui/progress"
import { Spinner } from "@/components/ui/spinner"
import { useAuth } from "@clerk/nextjs"
import { useParams } from "next/navigation"
import { apiClient } from "@/lib/api-client"
import { toast } from "sonner"
import { format } from "date-fns"
import { X } from "lucide-react"

interface ProjectSettings {
  id: string
  project_id: string
  embedding_model: string
  rag_strategy: string
  agent_type: string
  chunks_per_search: number
  final_context_size: number
  similarity_threshold: number
  number_of_queries: number
  reranking_enabled: boolean
  reranking_model: string
  vector_weight: number
  keyword_weight: number
  created_at?: string
}

interface Project {
  id: string
  name: string
  description?: string
  clerk_id: string
  created_at?: string
  updated_at?: string
  project_settings?: ProjectSettings[]
}

interface Chat {
  id: string
  title: string
  project_id: string
  clerk_id: string
  created_at?: string
}

interface ProjectsResponse {
  status: string
  message: string
  data: Project
}

interface ChatsResponse {
  status: string
  message: string
  data: Chat[]
}

interface DocumentsResponse {
  status: string
  message: string
  data: Array<{
    id: string
    filename: string
    source_type: "file" | "url"
    source_url?: string
    processing_status?: string
    created_at?: string
  }>
}

interface SettingsResponse {
  status: string
  message: string
  data: ProjectSettings
}


export default function ProjectPage() {
  const { getToken } = useAuth()
  const params = useParams()
  const projectId = params?.id as string
  const [project, setProject] = React.useState<Project | null>(null)
  const [chats, setChats] = React.useState<Chat[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [urlInput, setUrlInput] = React.useState("")
  const [sources, setSources] = React.useState<Array<{
    id: string
    name: string
    type: "file" | "url"
    processing_status?: string
    created_at?: string
  }>>([])
  const [isSettingsModalOpen, setIsSettingsModalOpen] = React.useState(false)
  const [settings, setSettings] = React.useState<ProjectSettings | null>(null)
  const [selectedDocument, setSelectedDocument] = React.useState<string | null>(null)
  const [activeStep, setActiveStep] = React.useState("partitioning")

  // Map processing_status to the appropriate tab
  const getStepFromProcessingStatus = (status?: string): string => {
    if (!status) return "upload"
    
    const statusLower = status.toLowerCase()
    if (statusLower === "uploading") return "upload"
    if (statusLower === "queued") return "queued"
    if (statusLower === "processing" || statusLower === "partitioning") return "partitioning"
    if (statusLower === "chunking") return "chunking"
    if (statusLower === "summarising" || statusLower === "summarization") return "summarisation"
    if (statusLower === "vectorizing" || statusLower === "vectorization") return "vectorization"
    if (statusLower === "completed" || statusLower === "complete") return "view"
    
    // Default fallback
    return "queued"
  }

  // Update activeStep when selectedDocument changes
  React.useEffect(() => {
    if (selectedDocument) {
      const source = sources.find(s => s.id === selectedDocument)
      if (source) {
        const step = getStepFromProcessingStatus(source.processing_status)
        setActiveStep(step)
      }
    }
  }, [selectedDocument, sources])
  const [isCreateChatDialogOpen, setIsCreateChatDialogOpen] = React.useState(false)
  const [chatTitle, setChatTitle] = React.useState("")
  const [isCreatingChat, setIsCreatingChat] = React.useState(false)
  const [chatToDelete, setChatToDelete] = React.useState<Chat | null>(null)
  const [isDeletingChat, setIsDeletingChat] = React.useState(false)
  const [isUpdatingSettings, setIsUpdatingSettings] = React.useState(false)
  const [documentToDelete, setDocumentToDelete] = React.useState<{ id: string; name: string } | null>(null)
  const [isDeletingDocument, setIsDeletingDocument] = React.useState(false)
  
  // File upload state
  const [uploadingFiles, setUploadingFiles] = React.useState<Map<string, {
    file: File
    progress: number
    status: "pending" | "uploading" | "success" | "error"
    error?: string
    documentId?: string
  }>>(new Map())

  React.useEffect(() => {
    if (!projectId) return

    const fetchData = async () => {
      try {
        setIsLoading(true)
        const token = await getToken()
        
        // Fetch all data in parallel using Promise.all
        const [projectResponse, chatsResponse, documentsResponse, settingsResponse] = await Promise.all([
          apiClient.get<ProjectsResponse>(`/api/projects/${projectId}`, token),
          apiClient.get<ChatsResponse>(`/api/projects/${projectId}/chats`, token).catch((error) => {
            // Handle 404 or other errors gracefully - return empty array
            console.warn("Failed to fetch chats:", error)
            return { status: "success", message: "Chats fetched successfully", data: [] } as ChatsResponse
          }),
          apiClient.get<DocumentsResponse>(`/api/projects/${projectId}/files`, token).catch((error) => {
            // Handle 404 or other errors gracefully - return empty array
            console.warn("Failed to fetch documents:", error)
            return { status: "success", message: "Files fetched successfully", data: [] } as DocumentsResponse
          }),
          apiClient.get<SettingsResponse>(`/api/projects/${projectId}/settings`, token).catch((error) => {
            // Handle 404 or other errors gracefully - return null
            console.warn("Failed to fetch settings:", error)
            return null
          }),
        ])
        
        const foundProject = projectResponse.data
        
        if (!foundProject) {
          toast.error("Project not found")
          return
        }
        
        setProject(foundProject)
        
        // Set chats
        if (chatsResponse.data) {
          setChats(chatsResponse.data)
        }
        
        // Set documents/sources
        if (documentsResponse.data && documentsResponse.data.length > 0) {
          const formattedSources = documentsResponse.data.map((doc) => ({
            id: doc.id,
            name: doc.filename || doc.source_url || "Untitled",
            type: doc.source_type as "file" | "url",
            processing_status: doc.processing_status,
            created_at: doc.created_at,
          }))
          setSources(formattedSources)
        }
        
        // Set settings
        if (settingsResponse?.data) {
          setSettings(settingsResponse.data)
        } else if (foundProject.project_settings && foundProject.project_settings.length > 0) {
          setSettings(foundProject.project_settings[0])
        }
        
      } catch (error) {
        console.error("Error fetching data:", error)
        toast.error(error instanceof Error ? error.message : "Failed to fetch data")
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [projectId, getToken])

  const handleNewConversation = () => {
    setChatTitle("")
    setIsCreateChatDialogOpen(true)
  }

  const handleCreateChat = async () => {
    if (!chatTitle.trim()) {
      toast.error("Please enter a chat title")
      return
    }

    if (!projectId) {
      toast.error("Project ID is missing")
      return
    }

    try {
      setIsCreatingChat(true)
      const token = await getToken()
      
      interface CreateChatResponse {
        status: string
        message: string
        data: Chat
      }

      const response = await apiClient.post<CreateChatResponse>(
        "/api/chats",
        {
          title: chatTitle.trim(),
          project_id: projectId,
        },
        token
      )

      if (response.data) {
        // Add the new chat to the list
        setChats((prev) => [response.data, ...prev])
        toast.success("Chat created successfully")
        setIsCreateChatDialogOpen(false)
        setChatTitle("")
      }
    } catch (error) {
      console.error("Error creating chat:", error)
      toast.error(error instanceof Error ? error.message : "Failed to create chat")
    } finally {
      setIsCreatingChat(false)
    }
  }

  const handleDeleteChat = async () => {
    if (!chatToDelete) return

    try {
      setIsDeletingChat(true)
      const token = await getToken()
      
      interface DeleteChatResponse {
        status: string
        message: string
        data: Chat
      }

      await apiClient.delete<DeleteChatResponse>(
        `/api/chats/${chatToDelete.id}`,
        token
      )

      // Remove the chat from the list
      setChats((prev) => prev.filter((chat) => chat.id !== chatToDelete.id))
      toast.success("Chat deleted successfully")
      setChatToDelete(null)
    } catch (error) {
      console.error("Error deleting chat:", error)
      toast.error(error instanceof Error ? error.message : "Failed to delete chat")
    } finally {
      setIsDeletingChat(false)
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return ""
    try {
      const date = new Date(dateString)
      return format(date, "MMM d, yyyy")
    } catch {
      return ""
    }
  }

  const handleDocumentDelete = async () => {
    if (!documentToDelete || !projectId) return

    try {
      setIsDeletingDocument(true)
      const token = await getToken()
      
      interface DeleteDocumentResponse {
        status: string
        message: string
        data: {
          id: string
        }
      }

      await apiClient.delete<DeleteDocumentResponse>(
        `/api/projects/${projectId}/files/${documentToDelete.id}`,
        token
      )

      // Remove the document from the list
      setSources((prev) => prev.filter((source) => source.id !== documentToDelete.id))
      toast.success("Document deleted successfully")
      setDocumentToDelete(null)
    } catch (error) {
      console.error("Error deleting document:", error)
      toast.error(error instanceof Error ? error.message : "Failed to delete document")
    } finally {
      setIsDeletingDocument(false)
    }
  }

  const handleFileUpload = async (files: File[]) => {
    if (!projectId) {
      toast.error("Project ID is missing")
      return
    }

    const token = await getToken()
    if (!token) {
      toast.error("Authentication required")
      return
    }

    // Initialize upload state for all files
    const newUploads = new Map<string, {
      file: File
      progress: number
      status: "pending" | "uploading" | "success" | "error"
      error?: string
      documentId?: string
    }>()

    files.forEach((file) => {
      const fileId = `${file.name}-${file.size}-${Date.now()}`
      newUploads.set(fileId, {
        file,
        progress: 0,
        status: "pending",
      })
    })

    setUploadingFiles(newUploads)

    // Upload all files in parallel
    const uploadPromises = Array.from(newUploads.entries()).map(async ([fileId, upload]) => {
      try {
        // Step 1: Get presigned URL
        const uploadUrlResponse = await apiClient.getUploadUrl(
          projectId,
          upload.file.name,
          upload.file.type,
          upload.file.size,
          token
        )

        // Update status to uploading
        setUploadingFiles((prev) => {
          const updated = new Map(prev)
          const current = updated.get(fileId)
          if (current) {
            updated.set(fileId, {
              ...current,
              status: "uploading",
              documentId: uploadUrlResponse.document.id,
            })
          }
          return updated
        })

        // Step 2: Upload file to S3 with progress tracking
        await apiClient.uploadFileToS3(
          uploadUrlResponse.data,
          upload.file,
          (progress) => {
            setUploadingFiles((prev) => {
              const updated = new Map(prev)
              const current = updated.get(fileId)
              if (current) {
                updated.set(fileId, {
                  ...current,
                  progress,
                })
              }
              return updated
            })
          }
        )

        // Step 3: Confirm upload (this sets processing_status to "queued")
        const confirmResponse = await apiClient.post<{
          status: string
          message: string
          data: {
            id: string
            filename: string
            processing_status: string
            created_at?: string
          }
        }>(`/api/projects/${projectId}/files/confirm`, {
          s3_key: uploadUrlResponse.s3_key,
        }, token)

        // Step 4: Mark as success
        setUploadingFiles((prev) => {
          const updated = new Map(prev) 
          const current = updated.get(fileId)
          if (current) {
            updated.set(fileId, {
              ...current,
              status: "success",
              progress: 100,
            })
          }
          return updated
        })

        // Step 5: Add to sources list with queued status
        setSources((prev) => [
          ...prev,
          {
            id: confirmResponse.data.id,
            name: upload.file.name,
            type: "file" as const,
            processing_status: confirmResponse.data.processing_status,
            created_at: confirmResponse.data.created_at || new Date().toISOString(),
          },
        ])

        toast.success(`${upload.file.name} uploaded successfully`)
      } catch (error) {
        console.error(`Error uploading ${upload.file.name}:`, error)
        
        // Mark as error
        setUploadingFiles((prev) => {
          const updated = new Map(prev)
          const current = updated.get(fileId)
          if (current) {
            updated.set(fileId, {
              ...current,
              status: "error",
              error: error instanceof Error ? error.message : "Upload failed",
            })
          }
          return updated
        })

        toast.error(`Failed to upload ${upload.file.name}: ${error instanceof Error ? error.message : "Unknown error"}`)
      }
    })

    // Wait for all uploads to complete (or fail)
    await Promise.allSettled(uploadPromises)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="h-6 w-32 bg-muted animate-pulse rounded" />
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Project not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* Main Content */}
        <ResizablePanel defaultSize={75} minSize={50}>
          <div className="h-full flex flex-col p-6">
            {/* Header */}
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold">{project.name}</h1>
                  <p className="text-lg text-muted-foreground">Conversations</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleNewConversation}
                    className="bg-white text-black hover:bg-gray-100 dark:bg-white dark:text-black dark:hover:bg-gray-100"
                  >
                    <Plus className="size-4" />
                    New conversation
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                  >
                    <Settings className="size-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Chats List or Empty State */}
            <div className="flex-1 overflow-auto">
              {chats.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <Empty className="max-w-md border-0">
                    <EmptyHeader>
                      <EmptyMedia variant="default" className="mb-4">
                        <MessageSquare className="size-12 text-muted-foreground" />
                      </EmptyMedia>
                      <EmptyTitle className="text-xl font-semibold">No conversations yet</EmptyTitle>
                      <EmptyDescription className="text-base">
                        Start your first conversation in this project to analyze documents and get insights from your AI assistant.
                      </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                      <Button
                        onClick={handleNewConversation}
                        className="bg-white text-black hover:bg-gray-100 dark:bg-white dark:text-black dark:hover:bg-gray-100"
                      >
                        <Plus className="size-4" />
                        Start first conversation
                      </Button>
                    </EmptyContent>
                  </Empty>
                </div>
              ) : (
                <div className="space-y-2">
                  {chats.map((chat) => (
                    <div
                      key={chat.id}
                      className="w-full p-4 rounded-lg border hover:bg-accent transition-colors group"
                    >
                      <div className="flex items-center justify-between">
                        <button
                          className="flex-1 text-left flex items-center gap-3 min-w-0"
                          onClick={() => {
                            // TODO: Navigate to chat
                            console.log("Navigate to chat:", chat.id)
                          }}
                        >
                          <MessageSquare className="size-5 text-muted-foreground shrink-0" />
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold truncate">{chat.title}</h3>
                            {chat.created_at && (
                              <p className="text-sm text-muted-foreground">
                                {formatDate(chat.created_at)}
                              </p>
                            )}
                          </div>
                        </button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-white"
                          onClick={(e) => {
                            e.stopPropagation()
                            setChatToDelete(chat)
                          }}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Settings Sidebar */}
        <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
          <div className="h-full border-l bg-muted/30 flex flex-col">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Project Settings</h2>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <Tabs defaultValue="documents" className="w-full">
                <TabsList className="w-full grid grid-cols-2">
                  <TabsTrigger value="documents">
                    <FileText className="size-4" />
                    Documents
                  </TabsTrigger>
                  <TabsTrigger value="settings">
                    <Settings className="size-4" />
                    Settings
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="documents" className="mt-6 space-y-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold mb-3">Add Sources</h3>
                      
                      {/* Upload Files */}
                      <div className="mb-4">
                        <label className="text-sm font-medium mb-2 block">Upload Files</label>
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            const input = document.createElement("input")
                            input.type = "file"
                            input.multiple = true
                            input.onchange = async (e) => {
                              const files = (e.target as HTMLInputElement).files
                              if (files && files.length > 0) {
                                await handleFileUpload(Array.from(files))
                              }
                            }
                            input.click()
                          }}
                          disabled={uploadingFiles.size > 0}
                        >
                          <Upload className="size-4" />
                          {uploadingFiles.size > 0 ? "Uploading..." : "Upload Files"}
                        </Button>
                        
                        {/* Upload Progress */}
                        {uploadingFiles.size > 0 && (
                          <div className="mt-4 space-y-3">
                            {Array.from(uploadingFiles.entries()).map(([fileId, upload]) => (
                              <div key={fileId} className="space-y-2 p-3 rounded-lg border bg-background">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{upload.file.name}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                      {upload.status === "uploading" && (
                                        <span className="text-xs text-muted-foreground">
                                          {Math.round(upload.progress)}%
                                        </span>
                                      )}
                                      {upload.status === "success" && (
                                        <span className="text-xs text-green-600 flex items-center gap-1">
                                          <CheckCircle2 className="size-3" />
                                          Uploaded
                                        </span>
                                      )}
                                      {upload.status === "error" && (
                                        <span className="text-xs text-destructive">
                                          {upload.error || "Upload failed"}
                                        </span>
                                      )}
                                      {upload.status === "pending" && (
                                        <span className="text-xs text-muted-foreground">Preparing...</span>
                                      )}
                                    </div>
                                  </div>
                                  {(upload.status === "error" || upload.status === "success") && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 shrink-0"
                                      onClick={() => {
                                        const newMap = new Map(uploadingFiles)
                                        newMap.delete(fileId)
                                        setUploadingFiles(newMap)
                                      }}
                                    >
                                      <X className="size-3" />
                                    </Button>
                                  )}
                                </div>
                                {upload.status === "uploading" && (
                                  <Progress value={upload.progress} className="h-1.5" />
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Add URL */}
                      <div>
                        <label className="text-sm font-medium mb-2 block">Add Website URL</label>
                        <div className="">
                          <Input
                            type="url"
                            placeholder="https://example.com"
                            value={urlInput}
                            onChange={(e) => setUrlInput(e.target.value)}
                            className="flex-1"
                          />
                          <Button
                          className="mt-2 w-full"
                            onClick={async () => {
                              if (!urlInput.trim()) {
                                toast.error("Please enter a valid URL")
                                return
                              }

                              if (!projectId) {
                                toast.error("Project ID is missing")
                                return
                              }

                              try {
                                const token = await getToken()
                                if (!token) {
                                  toast.error("Authentication required")
                                  return
                                }

                                interface AddUrlResponse {
                                  status: string
                                  message: string
                                  data: {
                                    id: string
                                    filename: string
                                    source_type: string
                                    source_url?: string
                                    processing_status: string
                                    created_at?: string
                                  }
                                }

                                const response = await apiClient.post<AddUrlResponse>(
                                  `/api/projects/${projectId}/urls`,
                                  {
                                    url: urlInput.trim(),
                                  },
                                  token
                                )

                                if (response.data) {
                                  // Add to sources list
                                  setSources((prev) => [
                                    ...prev,
                                    {
                                      id: response.data.id,
                                      name: response.data.source_url || response.data.filename,
                                      type: response.data.source_type as "file" | "url",
                                      processing_status: response.data.processing_status,
                                      created_at: response.data.created_at || new Date().toISOString(),
                                    },
                                  ])
                                  toast.success("Website URL added successfully")
                                  setUrlInput("")
                                }
                              } catch (error) {
                                console.error("Error adding website URL:", error)
                                toast.error(error instanceof Error ? error.message : "Failed to add website URL")
                              }
                            }}
                            disabled={!urlInput.trim()}
                          >
                            <Globe className="size-4" />
                            Add Website
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Sources List */}
                    <div className="pt-4 border-t">
                      <h3 className="text-sm font-semibold mb-3">Sources</h3>
                      {sources.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          No sources added yet
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {sources.map((source) => (
                            <div
                              key={source.id}
                              className="flex items-center justify-between p-3 rounded-lg border bg-background hover:bg-accent transition-colors cursor-pointer group"
                              onClick={() => {
                                setSelectedDocument(source.id)
                              }}
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                {source.type === "file" ? (
                                  <FileText className="size-4 text-muted-foreground shrink-0" />
                                ) : (
                                  <LinkIcon className="size-4 text-muted-foreground shrink-0" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium truncate">{source.name}</p>
                                    {source.processing_status === "queued" && (
                                      <Spinner className="size-3 text-muted-foreground" />
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    {source.created_at && (
                                      <p className="text-xs text-muted-foreground">
                                        {formatDate(source.created_at)}
                                      </p>
                                    )}
                                    {source.processing_status && (
                                      <>
                                        {source.created_at && (
                                          <span className="text-xs text-muted-foreground">•</span>
                                        )}
                                        <span className="text-xs text-muted-foreground capitalize">
                                          {source.processing_status}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setDocumentToDelete({ id: source.id, name: source.name })
                                }}
                              >
                                <Trash2 className="size-4 text-destructive" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="settings" className="mt-6 space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold mb-4">Project Information</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Project Name</label>
                        <p className="text-base font-medium mt-1">{project.name}</p>
                      </div>
                      {project.description && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Description</label>
                          <p className="text-sm mt-1">{project.description}</p>
                        </div>
                      )}
                      {project.created_at && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Created</label>
                          <p className="text-sm mt-1">{formatDate(project.created_at)}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <h3 className="text-sm font-semibold mb-3">RAG Settings</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Configure embedding models, similarity thresholds, and other RAG parameters.
                    </p>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => setIsSettingsModalOpen(true)}
                    >
                      Configure Settings
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Settings Modal */}
      <Dialog open={isSettingsModalOpen} onOpenChange={setIsSettingsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle>Configure RAG Settings</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto min-h-0 px-6">
          {(() => {
            const currentSettings = settings || project?.project_settings?.[0]
            const hasDocuments = sources.length > 0
            
            if (!currentSettings) {
              return (
                <div className="py-8">
                  <p className="text-sm text-muted-foreground text-center">Settings not available</p>
                </div>
              )
            }

            // Map backend rag_strategy to UI values
            const getRagStrategyValue = (strategy: string) => {
              switch (strategy) {
                case "basic": return "vector"
                case "hybrid": return "hybrid"
                case "multi_query_vector": return "multi-query-vector"
                case "multi_query_hybrid": return "multi-query-hybrid"
                default: return "vector"
              }
            }
            
            const getRagStrategyBackend = (value: string) => {
              switch (value) {
                case "vector": return "basic"
                case "hybrid": return "hybrid"
                case "multi-query-vector": return "multi_query_vector"
                case "multi-query-hybrid": return "multi_query_hybrid"
                default: return "basic"
              }
            }

            return (
              <div className="space-y-6 py-4">
                {/* Embedding Model */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold">Embedding Model</h3>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="size-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Select the embedding model for vector search</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Select 
                    value={currentSettings.embedding_model} 
                    disabled={hasDocuments}
                    onValueChange={(value) => {
                      setSettings(prev => prev ? { ...prev, embedding_model: value } : null)
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text-embedding-3-large">text-embedding-3-large</SelectItem>
                      <SelectItem value="text-embedding-3-small">text-embedding-3-small</SelectItem>
                      <SelectItem value="text-embedding-ada-002">text-embedding-ada-002</SelectItem>
                    </SelectContent>
                  </Select>
                  {hasDocuments && (
                    <p className="text-xs text-yellow-500">Locked (documents uploaded)</p>
                  )}
                </div>

                <Separator />

                {/* Search Strategy */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Search Strategy</h3>
                  <RadioGroup 
                    value={getRagStrategyValue(currentSettings.rag_strategy)}
                    onValueChange={(value) => {
                      setSettings(prev => prev ? { ...prev, rag_strategy: getRagStrategyBackend(value) } : null)
                    }}
                    className="space-y-2"
                  >
                    <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-accent transition-colors">
                      <RadioGroupItem value="vector" className="mt-0.5" />
                      <div className="flex-1">
                        <div className="font-medium text-sm">Vector Search</div>
                        <div className="text-xs text-muted-foreground mt-0.5">Semantic similarity matching</div>
                      </div>
                    </label>
                    <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-accent transition-colors">
                      <RadioGroupItem value="hybrid" className="mt-0.5" />
                      <div className="flex-1">
                        <div className="font-medium text-sm">Hybrid Search</div>
                        <div className="text-xs text-muted-foreground mt-0.5">Semantic + keyword matching</div>
                      </div>
                    </label>
                    <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-accent transition-colors">
                      <RadioGroupItem value="multi-query-vector" className="mt-0.5" />
                      <div className="flex-1">
                        <div className="font-medium text-sm">Multi-Query Vector</div>
                        <div className="text-xs text-muted-foreground mt-0.5">Multiple semantic queries</div>
                      </div>
                    </label>
                    <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-accent transition-colors">
                      <RadioGroupItem value="multi-query-hybrid" className="mt-0.5" />
                      <div className="flex-1">
                        <div className="font-medium text-sm">Multi-Query Hybrid</div>
                        <div className="text-xs text-muted-foreground mt-0.5">Multiple hybrid queries</div>
                      </div>
                    </label>
                  </RadioGroup>
                </div>

                <Separator />

                {/* Search Parameters */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold">Search Parameters</h3>
                  
                  {/* Chunks per Search */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Chunks per Search</Label>
                      <Input
                        type="number"
                        value={currentSettings.chunks_per_search}
                        onChange={(e) => {
                          const value = parseInt(e.target.value)
                          if (!isNaN(value) && value >= 5 && value <= 30) {
                            setSettings(prev => prev ? { ...prev, chunks_per_search: value } : null)
                          }
                        }}
                        className="w-16 h-8 text-sm"
                        min={5}
                        max={30}
                      />
                    </div>
                    <Slider
                      value={[currentSettings.chunks_per_search]}
                      onValueChange={([value]) => {
                        setSettings(prev => prev ? { ...prev, chunks_per_search: value } : null)
                      }}
                      min={5}
                      max={30}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>5</span>
                      <span>30</span>
                    </div>
                  </div>

                  {/* Final Context Size */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Final Context Size</Label>
                      <Input
                        type="number"
                        value={currentSettings.final_context_size}
                        onChange={(e) => {
                          const value = parseInt(e.target.value)
                          if (!isNaN(value) && value >= 3 && value <= 10) {
                            setSettings(prev => prev ? { ...prev, final_context_size: value } : null)
                          }
                        }}
                        className="w-16 h-8 text-sm"
                        min={3}
                        max={10}
                      />
                    </div>
                    <Slider
                      value={[currentSettings.final_context_size]}
                      onValueChange={([value]) => {
                        setSettings(prev => prev ? { ...prev, final_context_size: value } : null)
                      }}
                      min={3}
                      max={10}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>3</span>
                      <span>10</span>
                    </div>
                  </div>

                  {/* Similarity Threshold */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Similarity Threshold</Label>
                      <Input
                        type="number"
                        value={currentSettings.similarity_threshold}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value)
                          if (!isNaN(value) && value >= 0.1 && value <= 0.9) {
                            setSettings(prev => prev ? { ...prev, similarity_threshold: value } : null)
                          }
                        }}
                        className="w-16 h-8 text-sm"
                        min={0.1}
                        max={0.9}
                        step={0.1}
                      />
                    </div>
                    <Slider
                      value={[currentSettings.similarity_threshold]}
                      onValueChange={([value]) => {
                        setSettings(prev => prev ? { ...prev, similarity_threshold: value } : null)
                      }}
                      min={0.1}
                      max={0.9}
                      step={0.1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>0.1</span>
                      <span>0.9</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Reranking */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Reranking</h3>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="reranking-enabled"
                      checked={currentSettings.reranking_enabled}
                      onCheckedChange={(checked) => {
                        setSettings(prev => prev ? { ...prev, reranking_enabled: checked === true } : null)
                      }}
                    />
                    <Label htmlFor="reranking-enabled" className="text-sm font-normal cursor-pointer">
                      Enable reranking
                    </Label>
                  </div>
                  {currentSettings.reranking_enabled && (
                    <Select
                      value={currentSettings.reranking_model}
                      onValueChange={(value) => {
                        setSettings(prev => prev ? { ...prev, reranking_model: value } : null)
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rerank-english-v3.0">rerank-english-v3.0</SelectItem>
                        <SelectItem value="rerank-multilingual-v3.0">rerank-multilingual-v3.0</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <Separator />

                {/* Agent Mode */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Agent Mode</h3>
                  <RadioGroup
                    value={currentSettings.agent_type}
                    onValueChange={(value) => {
                      setSettings(prev => prev ? { ...prev, agent_type: value } : null)
                    }}
                    className="space-y-2"
                  >
                    <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-accent transition-colors">
                      <RadioGroupItem value="simple" className="mt-0.5" />
                      <div className="flex-1">
                        <div className="font-medium text-sm">Simple RAG</div>
                        <div className="text-xs text-muted-foreground mt-0.5">Documents-only search</div>
                      </div>
                    </label>
                    <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-accent transition-colors">
                      <RadioGroupItem value="agentic" className="mt-0.5" />
                      <div className="flex-1">
                        <div className="font-medium text-sm">Agentic RAG</div>
                        <div className="text-xs text-muted-foreground mt-0.5">Smart tool selection with web search</div>
                      </div>
                    </label>
                  </RadioGroup>
                </div>

                <Separator />

                {/* Performance Impact */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Performance Impact</h3>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-2xl font-semibold">~{currentSettings.chunks_per_search}</div>
                          <div className="text-xs text-muted-foreground mt-1">Total chunks</div>
                        </div>
                        <div>
                          <div className="text-2xl font-semibold">~600ms</div>
                          <div className="text-xs text-muted-foreground mt-1">Latency</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )
          })()}
          </div>

          <DialogFooter className="px-6 pb-6 pt-4 shrink-0 border-t">
            <Button
              variant="outline"
              onClick={() => setIsSettingsModalOpen(false)}
              disabled={isUpdatingSettings}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!settings || !projectId) return

                try {
                  setIsUpdatingSettings(true)
                  const token = await getToken()
                  
                  // Prepare the update payload with all required fields
                  // Note: rag_strategy is already in backend format in state
                  const updatePayload = {
                    embedding_model: settings.embedding_model,
                    rag_strategy: settings.rag_strategy,
                    agent_type: settings.agent_type,
                    chunks_per_search: settings.chunks_per_search,
                    final_context_size: settings.final_context_size,
                    similarity_threshold: settings.similarity_threshold,
                    number_of_queries: settings.number_of_queries,
                    reranking_enabled: settings.reranking_enabled,
                    reranking_model: settings.reranking_model,
                    vector_weight: settings.vector_weight,
                    keyword_weight: settings.keyword_weight,
                  }

                  interface UpdateSettingsResponse {
                    status: string
                    message: string
                    data: ProjectSettings
                  }

                  const response = await apiClient.put<UpdateSettingsResponse>(
                    `/api/projects/${projectId}/settings`,
                    updatePayload,
                    token
                  )

                  if (response.data) {
                    // Update local state with the response data
                    setSettings(response.data)
                    toast.success("Settings updated successfully")
                    setIsSettingsModalOpen(false)
                  }
                } catch (error) {
                  console.error("Error updating settings:", error)
                  toast.error(error instanceof Error ? error.message : "Failed to update settings")
                } finally {
                  setIsUpdatingSettings(false)
                }
              }}
              disabled={isUpdatingSettings}
            >
              {isUpdatingSettings ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Chat Confirmation Dialog */}
      <AlertDialog open={chatToDelete !== null} onOpenChange={(open) => !open && setChatToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chat</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{chatToDelete?.title}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingChat}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteChat}
              disabled={isDeletingChat}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-white"
            >
              {isDeletingChat ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Document Confirmation Dialog */}
      <AlertDialog open={documentToDelete !== null} onOpenChange={(open) => !open && setDocumentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{documentToDelete?.name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingDocument}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDocumentDelete}
              disabled={isDeletingDocument}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-white"
            >
              {isDeletingDocument ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Chat Dialog */}
      <Dialog open={isCreateChatDialogOpen} onOpenChange={setIsCreateChatDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Chat</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="chat-title">Chat Title</Label>
              <Input
                id="chat-title"
                placeholder="Enter chat title"
                value={chatTitle}
                onChange={(e) => setChatTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleCreateChat()
                  }
                }}
                disabled={isCreatingChat}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateChatDialogOpen(false)
                setChatTitle("")
              }}
              disabled={isCreatingChat}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateChat}
              disabled={isCreatingChat || !chatTitle.trim()}
            >
              {isCreatingChat ? "Creating..." : "Create Chat"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Processing Pipeline Modal */}
      <Dialog open={selectedDocument !== null} onOpenChange={(open) => !open && setSelectedDocument(null)}>
        <DialogContent className="w-[95vw] max-w-[95vw] max-h-[95vh] h-[95vh] sm:min-w-[95vw] flex flex-col p-0">
          <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-4 shrink-0 flex flex-row items-center justify-between border-b gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              {(() => {
                const selectedSource = sources.find(s => s.id === selectedDocument)
                const Icon = selectedSource?.type === "url" ? LinkIcon : FileText
                return <Icon className="size-4 sm:size-5 text-muted-foreground shrink-0" />
              })()}
              <div className="min-w-0">
                <DialogTitle className="text-base sm:text-lg font-semibold truncate">
                  {sources.find(s => s.id === selectedDocument)?.name || "Source"} Processing Pipeline
                </DialogTitle>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
            {/* Left Panel - Timeline and Step Details */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Timeline Navigation */}
              <div className="px-4 sm:px-6 pt-4 pb-3 border-b shrink-0">
                <Tabs value={activeStep} onValueChange={setActiveStep} className="w-full">
                  <TabsList className="h-auto bg-transparent p-0 w-full justify-start overflow-x-auto scrollbar-hide">
                    {(() => {
                      const selectedSource = sources.find(s => s.id === selectedDocument)
                      return [
                        { id: "upload", label: selectedSource?.type === "url" ? "Source Added" : "Upload to S3" },
                        { id: "queued", label: "Queued" },
                        { id: "partitioning", label: "Partitioning" },
                        { id: "chunking", label: "Chunking" },
                        { id: "summarisation", label: "Summarisation" },
                        { id: "vectorization", label: "Vectorization & Storage" },
                        { id: "view", label: "View Chunks" },
                      ]
                    })().map((step) => {
                      const selectedSource = sources.find(s => s.id === selectedDocument)
                      const processingStatus = selectedSource?.processing_status?.toLowerCase() || ""
                      const currentStepFromStatus = getStepFromProcessingStatus(processingStatus)
                      const allSteps = ["upload", "queued", "partitioning", "chunking", "summarisation", "vectorization", "view"]
                      const stepIndex = allSteps.indexOf(step.id)
                      const statusStepIndex = allSteps.indexOf(currentStepFromStatus)
                      const isProcessing = stepIndex === statusStepIndex && processingStatus && processingStatus !== "completed" && processingStatus !== "complete"
                      
                      return (
                        <TabsTrigger
                          key={step.id}
                          value={step.id}
                          className="data-[state=active]:bg-background data-[state=active]:border data-[state=active]:border-border data-[state=active]:shadow-sm data-[state=inactive]:bg-transparent data-[state=inactive]:border-transparent data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground rounded-md px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium whitespace-nowrap shrink-0 relative"
                        >
                          {step.label}
                          {isProcessing && (
                            <Spinner className="size-3 ml-2 inline-block" />
                          )}
                        </TabsTrigger>
                      )
                    })}
                  </TabsList>
                </Tabs>
              </div>

              {/* Step Content */}
              <div className="flex-1 overflow-hidden flex">
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex items-center justify-center">
                  <div className="w-full max-w-2xl space-y-6">
                  {(() => {
                    const selectedSource = sources.find(s => s.id === selectedDocument)
                    const processingStatus = selectedSource?.processing_status?.toLowerCase() || ""
                    const currentStepFromStatus = getStepFromProcessingStatus(processingStatus)
                    
                    // Define all steps in order
                    const allSteps = ["upload", "queued", "partitioning", "chunking", "summarisation", "vectorization", "view"]
                    const statusStepIndex = allSteps.indexOf(currentStepFromStatus)
                    
                    const stepConfig = {
                      upload: {
                        title: selectedSource?.type === "url" ? "Source Added" : "Upload to S3",
                        description: selectedSource?.type === "url" ? "Website URL added to project" : "Uploading document to cloud storage",
                        icon: CheckCircle2,
                        status: selectedSource?.type === "url" ? (statusStepIndex > 0 ? "completed" : "completed") : (statusStepIndex > 0 ? "completed" : statusStepIndex === 0 ? "processing" : "pending"),
                      },
                      queued: {
                        title: "Queued",
                        description: "Document is queued for processing",
                        icon: CheckCircle2,
                        status: statusStepIndex > 1 ? "completed" : statusStepIndex === 1 ? "processing" : "pending",
                      },
                      partitioning: {
                        title: "Partitioning",
                        description: "Processing and extracting text, images, and tables",
                        icon: CheckCircle2,
                        status: statusStepIndex > 2 ? "completed" : statusStepIndex === 2 ? "processing" : "pending",
                      },
                      chunking: {
                        title: "Chunking",
                        description: "Breaking document into smaller chunks",
                        icon: CheckCircle2,
                        status: statusStepIndex > 3 ? "completed" : statusStepIndex === 3 ? "processing" : "pending",
                      },
                      summarisation: {
                        title: "Summarisation",
                        description: "Generating summaries for document chunks",
                        icon: CheckCircle2,
                        status: statusStepIndex > 4 ? "completed" : statusStepIndex === 4 ? "processing" : "pending",
                      },
                      vectorization: {
                        title: "Vectorization & Storage",
                        description: "Creating embeddings and storing vectors",
                        icon: CheckCircle2,
                        status: statusStepIndex > 5 ? "completed" : statusStepIndex === 5 ? "processing" : "pending",
                      },
                      view: {
                        title: "View Chunks",
                        description: "Browse and inspect document chunks",
                        icon: CheckCircle2,
                        status: statusStepIndex >= 6 ? "completed" : "pending",
                      },
                    }

                    const currentStep = stepConfig[activeStep as keyof typeof stepConfig] || stepConfig.partitioning
                    const StepIcon = currentStep.icon
                    const isCompleted = currentStep.status === "completed"
                    const isProcessing = currentStep.status === "processing"

                    return (
                      <>
                        <div className="flex flex-col items-center text-center space-y-4 py-6 sm:py-8">
                          {isProcessing ? (
                            <Spinner className="size-12 sm:size-16 text-primary" />
                          ) : (
                            <StepIcon className={`size-12 sm:size-16 ${isCompleted ? "text-green-500" : "text-muted-foreground"}`} />
                          )}
                          <div>
                            <h3 className="text-xl sm:text-2xl font-semibold mb-2">{currentStep.title}</h3>
                            <p className="text-sm sm:text-base text-muted-foreground">
                              {currentStep.description}
                            </p>
                          </div>
                        </div>

                        {isProcessing && (
                          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 flex items-center gap-3">
                            <Spinner className="size-5 text-primary shrink-0" />
                            <span className="text-sm font-medium text-primary">
                              Processing
                            </span>
                          </div>
                        )}

                        {isCompleted && (
                          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex items-center gap-3">
                            <CheckCircle2 className="size-5 text-green-500 shrink-0" />
                            <span className="text-sm font-medium text-green-500">
                              Step completed successfully
                            </span>
                          </div>
                        )}
                      </>
                    )
                  })()}
                </div>
              </div>

            {/* Right Panel - Detail Inspector */}
            <div className="w-full lg:w-96 lg:min-w-[400px] xl:min-w-[600px] border-t lg:border-t-0 lg:border-l bg-muted/30 flex flex-col">
              <div className="px-4 sm:px-6 py-4 border-b shrink-0">
                <h3 className="text-sm font-semibold">Detail Inspector</h3>
              </div>
              <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
                <div className="text-center space-y-3">
                  <Eye className="size-10 sm:size-12 text-muted-foreground mx-auto" />
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Select a chunk to inspect details
                  </p>
                </div>
              </div>
            </div>
            </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
