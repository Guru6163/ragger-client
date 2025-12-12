const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

class ApiClient {
  private baseURL: string

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  async get<T = unknown>(
    endpoint: string,
    token?: string | null
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    }

    if (token) {
      headers["Authorization"] = `Bearer ${token}`
    }

    const response = await fetch(url, {
      method: "GET",
      headers,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        detail: `HTTP error! status: ${response.status}`,
      }))
      throw new Error(error.detail || "Request failed")
    }

    return response.json()
  }

  async post<T = unknown>(
    endpoint: string,
    data?: unknown,
    token?: string | null
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    }

    if (token) {
      headers["Authorization"] = `Bearer ${token}`
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: data ? JSON.stringify(data) : undefined,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        detail: `HTTP error! status: ${response.status}`,
      }))
      throw new Error(error.detail || "Request failed")
    }

    return response.json()
  }

  async put<T = unknown>(
    endpoint: string,
    data?: unknown,
    token?: string | null
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    }

    if (token) {
      headers["Authorization"] = `Bearer ${token}`
    }

    const response = await fetch(url, {
      method: "PUT",
      headers,
      body: data ? JSON.stringify(data) : undefined,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        detail: `HTTP error! status: ${response.status}`,
      }))
      throw new Error(error.detail || "Request failed")
    }

    return response.json()
  }

  async delete<T = unknown>(
    endpoint: string,
    token?: string | null
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    }

    if (token) {
      headers["Authorization"] = `Bearer ${token}`
    }

    const response = await fetch(url, {
      method: "DELETE",
      headers,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        detail: `HTTP error! status: ${response.status}`,
      }))
      throw new Error(error.detail || "Request failed")
    }

    return response.json()
  }

  async getUploadUrl(
    projectId: string,
    fileName: string,
    fileType: string,
    fileSize: number,
    token?: string | null
  ): Promise<{
    status: string
    message: string
    data: string
    s3_key: string
    document: {
      id: string
      filename: string
      s3_key: string
      file_size: number
      file_type: string
      processing_status: string
      created_at?: string
    }
  }> {
    return this.post(
      `/api/projects/${projectId}/files/upload-url`,
      {
        file_name: fileName,
        file_type: fileType,
        file_size: fileSize,
      },
      token
    )
  }

  async uploadFileToS3(
    presignedUrl: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()

      // Track upload progress
      if (onProgress) {
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const progress = (e.loaded / e.total) * 100
            onProgress(progress)
          }
        })
      }

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve()
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`))
        }
      })

      xhr.addEventListener("error", () => {
        reject(new Error("Upload failed due to network error"))
      })

      xhr.addEventListener("abort", () => {
        reject(new Error("Upload was aborted"))
      })

      xhr.open("PUT", presignedUrl)
      xhr.setRequestHeader("Content-Type", file.type)
      xhr.send(file)
    })
  }
}

export const apiClient = new ApiClient(API_BASE_URL)
