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
}

export const apiClient = new ApiClient(API_BASE_URL)
