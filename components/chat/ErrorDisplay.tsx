"use client"

import * as React from "react"
import { AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface ErrorDisplayProps {
  error: string
  className?: string
}

export function ErrorDisplay({ error, className }: ErrorDisplayProps) {
  if (!error) return null

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive",
        className
      )}
    >
      <AlertCircle className="size-4 shrink-0" />
      <p>{error}</p>
    </div>
  )
}

